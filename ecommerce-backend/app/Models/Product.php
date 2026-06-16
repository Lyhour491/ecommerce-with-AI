<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'slug',
        'description',
        'price',
        'stock',
        'image',
        'tags',
        'is_active',
    ];


    protected $casts = [
        'price' => 'decimal:2',
        'stock' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $appends = ['primary_image_url', 'image_urls', 'average_rating', 'reviews_count'];

    public function seller()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function carts()
    {
        return $this->hasMany(Cart::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class)->orderByDesc('is_primary')->orderBy('sort_order')->orderBy('id');
    }

    public function primaryImage()
    {
        return $this->hasOne(ProductImage::class)->where('is_primary', true);
    }

    public function getPrimaryImageUrlAttribute(): ?string
    {
        $image = $this->relationLoaded('images') ? $this->images->firstWhere('is_primary', true) ?: $this->images->first() : null;

        if ($image) {
            return $image->image_url;
        }

        if (!$this->image) {
            return null;
        }

        if (str_starts_with($this->image, 'http://') || str_starts_with($this->image, 'https://')) {
            return $this->image;
        }

        return asset('storage/' . ltrim($this->image, '/'));
    }

    public function getImageUrlsAttribute(): array
    {
        $urls = [];

        if ($this->relationLoaded('images')) {
            $urls = $this->images->pluck('image_url')->filter()->values()->all();
        }

        if (!$urls && $this->primary_image_url) {
            $urls[] = $this->primary_image_url;
        }

        return $urls;
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function getAverageRatingAttribute(): float
    {
        if ($this->relationLoaded('reviews')) {
            return round($this->reviews->avg('rating') ?: 0.0, 1);
        }
        return round($this->reviews()->avg('rating') ?: 0.0, 1);
    }

    public function getReviewsCountAttribute(): int
    {
        if ($this->relationLoaded('reviews')) {
            return $this->reviews->count();
        }
        return $this->reviews()->count();
    }
}
