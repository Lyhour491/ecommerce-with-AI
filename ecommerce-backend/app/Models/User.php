<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'shop_name',
        'shop_description',
        'shop_category',
        'tax_id',
        'website',
        'business_phone',
        'business_address',
        'business_city',
        'business_state',
        'business_zip',
        'business_country',
        'seller_status',
        'seller_settings',
        'phone',
        'country',
        'city',
        'zip_code',
        'avatar',
        'google_id',
        'facebook_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'seller_settings' => 'array',
        ];
    }

    public function carts()
    {
        return $this->hasMany(Cart::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function wishlists()
    {
        return $this->hasMany(Wishlist::class);
    }

    public function wishlistedProducts()
    {
        return $this->belongsToMany(Product::class, 'wishlists');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function payouts()
    {
        return $this->hasMany(Payout::class);
    }

    public function isAdmin()
    {
        return $this->can('admin.access');
    }

    public function isSeller()
    {
        return $this->can('seller.access');
    }
}
