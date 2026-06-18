<?php

namespace App\Services;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Support\Collection;

class PersonalizedRecommendationService
{
    public function forUser(User $user, int $limit = 8): array
    {
        $wishlistProducts = Wishlist::with('product.category')
            ->where('user_id', $user->id)
            ->get()
            ->pluck('product')
            ->filter();

        $purchasedProducts = Product::with('category')
            ->whereIn('id', $this->purchasedProductIds($user))
            ->get();

        $categoryScores = $this->categoryScores($wishlistProducts, $purchasedProducts);
        $interactedIds = $wishlistProducts->pluck('id')
            ->merge($purchasedProducts->pluck('id'))
            ->unique()
            ->values();

        $query = Product::with(['category', 'images'])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->where('is_active', true);

        if ($interactedIds->isNotEmpty()) {
            $query->whereNotIn('id', $interactedIds);
        }

        if ($categoryScores->isNotEmpty()) {
            $query->whereIn('category_id', $categoryScores->keys());
        }

        $products = $query
            ->orderByDesc('rating_avg')
            ->orderByDesc('sales_count')
            ->orderByDesc('views')
            ->latest()
            ->limit($limit)
            ->get();

        if ($products->count() < $limit) {
            $fallbackIds = $products->pluck('id')->merge($interactedIds)->unique();

            $fallback = Product::with(['category', 'images'])
                ->withAvg('reviews', 'rating')
                ->withCount('reviews')
                ->where('is_active', true)
                ->whereNotIn('id', $fallbackIds)
                ->orderByDesc('sales_count')
                ->orderByDesc('views')
                ->latest()
                ->limit($limit - $products->count())
                ->get();

            $products = $products->concat($fallback);
        }

        return [
            'title' => 'Recommended For You',
            'based_on' => $this->basedOn($wishlistProducts, $purchasedProducts, $categoryScores),
            'products' => $products->take($limit)->values()->map(fn (Product $product) => $this->formatProduct($product, $categoryScores))->all(),
        ];
    }

    private function purchasedProductIds(User $user): Collection
    {
        return OrderItem::whereHas('order', fn ($query) => $query->where('user_id', $user->id))
            ->pluck('product_id')
            ->filter()
            ->unique()
            ->values();
    }

    private function categoryScores(Collection $wishlistProducts, Collection $purchasedProducts): Collection
    {
        $scores = collect();

        foreach ($wishlistProducts as $product) {
            if ($product->category_id) {
                $scores[$product->category_id] = ($scores[$product->category_id] ?? 0) + 3;
            }
        }

        foreach ($purchasedProducts as $product) {
            if ($product->category_id) {
                $scores[$product->category_id] = ($scores[$product->category_id] ?? 0) + 2;
            }
        }

        return $scores->sortDesc();
    }

    private function basedOn(Collection $wishlistProducts, Collection $purchasedProducts, Collection $categoryScores): array
    {
        $categoryNames = $wishlistProducts
            ->merge($purchasedProducts)
            ->pluck('category.name')
            ->filter()
            ->unique()
            ->take(4)
            ->values()
            ->all();

        return [
            'wishlist' => $wishlistProducts->isNotEmpty(),
            'previous_purchases' => $purchasedProducts->isNotEmpty(),
            'product_categories' => $categoryScores->isNotEmpty(),
            'categories' => $categoryNames,
        ];
    }

    private function formatProduct(Product $product, Collection $categoryScores): array
    {
        $reason = $categoryScores->has($product->category_id)
            ? 'Recommended because you liked or purchased products in ' . ($product->category?->name ?? 'this category') . '.'
            : 'Recommended from popular products shoppers are viewing now.';

        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'name' => $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'price' => (float) $product->price,
            'stock' => (int) $product->stock,
            'category' => $product->category,
            'images' => $product->images,
            'image' => $product->primary_image_url,
            'image_urls' => $product->image_urls,
            'average_rating' => $product->average_rating,
            'reviews_count' => $product->reviews_count,
            'recommendation_reason' => $reason,
        ];
    }
}
