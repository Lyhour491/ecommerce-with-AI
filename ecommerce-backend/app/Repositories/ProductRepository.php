<?php

namespace App\Repositories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

class ProductRepository
{
    public function activeCatalog(int $limit = 15): Collection
    {
        return Product::with('category')
            ->where('is_active', true)
            ->latest()
            ->limit($limit)
            ->get();
    }

    public function candidatesForRecommendation(Product $product, int $limit = 12): Collection
    {
        return Product::with('category')
            ->where('id', '!=', $product->id)
            ->where('is_active', true)
            ->limit($limit)
            ->get();
    }

    public function createSellerProduct(array $data): Product
    {
        return Product::create($data);
    }

    public function updateProduct(Product $product, array $data): Product
    {
        $product->update($data);

        return $product->fresh();
    }

    public function incrementViews(Product $product): void
    {
        $product->increment('views');
    }

    public function incrementSales(Product $product, int $quantity): void
    {
        $product->increment('sales_count', $quantity);
    }

    public function refreshRatingStats(Product $product): void
    {
        $product->update([
            'rating_avg' => round((float) $product->reviews()->avg('rating'), 2),
            'rating_count' => $product->reviews()->count(),
        ]);
    }
}
