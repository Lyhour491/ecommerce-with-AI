<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Repositories\ProductRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SellerProductService
{
    public function __construct(
        private ProductRepository $products,
        private GeminiService $geminiService,
    ) {
    }

    public function create(Request $request): array
    {
        $categoryName = Category::find($request->category_id)?->name ?? 'General';
        $moderation = $this->moderateProductInput($request, $categoryName);
        $needsReview = $moderation['needs_review'];

        $product = $this->products->createSellerProduct([
            'user_id' => $request->user()->id,
            'category_id' => $request->category_id,
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $request->stock,
            'tags' => $request->tags,
            'is_active' => !$needsReview,
            'moderation_status' => $needsReview ? 'pending_review' : 'approved',
            'moderation_is_fake' => $moderation['is_fake'],
            'moderation_is_illegal' => $moderation['is_illegal'],
            'moderation_reason' => $moderation['reason'],
            'moderated_at' => now(),
        ]);

        $this->syncImages($request, $product);

        return [
            'message' => $needsReview
                ? 'Product saved for admin review because AI detected a possible policy issue. It is not public yet.'
                : 'Product created successfully',
            'product' => $this->responseProduct($product),
        ];
    }

    public function update(Request $request, Product $product): array
    {
        $categoryName = Category::find($request->category_id)?->name ?? 'General';
        $moderation = $this->moderateProductInput($request, $categoryName);
        $needsReview = $moderation['needs_review'];

        $product = $this->products->updateProduct($product, [
            'category_id' => $request->category_id,
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $request->stock,
            'tags' => $request->tags,
            'is_active' => !$needsReview,
            'moderation_status' => $needsReview ? 'pending_review' : 'approved',
            'moderation_is_fake' => $moderation['is_fake'],
            'moderation_is_illegal' => $moderation['is_illegal'],
            'moderation_reason' => $moderation['reason'],
            'moderated_at' => now(),
        ]);

        $this->syncImages($request, $product);

        return [
            'message' => $needsReview
                ? 'Product updated and sent to admin review because AI detected a possible policy issue. It is not public yet.'
                : 'Product updated successfully',
            'product' => $this->responseProduct($product),
        ];
    }

    public function delete(Product $product): void
    {
        foreach ($product->images as $image) {
            if ($image->image_path && !str_starts_with($image->image_path, 'http')) {
                Storage::disk('public')->delete($image->image_path);
            }
        }

        $product->delete();
    }

    private function responseProduct(Product $product): Product
    {
        return $product->load(['category', 'images'])
            ->loadAvg('reviews', 'rating')
            ->loadCount('reviews');
    }

    private function syncImages(Request $request, Product $product): void
    {
        if ($request->boolean('replace_images')) {
            foreach ($product->images as $existingImage) {
                if ($existingImage->image_path && !str_starts_with($existingImage->image_path, 'http')) {
                    Storage::disk('public')->delete($existingImage->image_path);
                }
                $existingImage->delete();
            }
        }

        $nextOrder = (int) $product->images()->max('sort_order') + 1;
        $hasExistingPrimary = $product->images()->where('is_primary', true)->exists();

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('products', 'public');

                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => $path,
                    'alt_text' => $product->name,
                    'is_primary' => !$hasExistingPrimary && $nextOrder === 1,
                    'sort_order' => $nextOrder++,
                ]);

                $hasExistingPrimary = true;
            }
        }

        foreach ((array) $request->input('image_urls', []) as $url) {
            if (!$url) {
                continue;
            }

            ProductImage::create([
                'product_id' => $product->id,
                'image_path' => $url,
                'alt_text' => $product->name,
                'is_primary' => !$hasExistingPrimary,
                'sort_order' => $nextOrder++,
            ]);

            $hasExistingPrimary = true;
        }

        $firstImage = $product->images()->orderByDesc('is_primary')->orderBy('sort_order')->first();
        $product->update(['image' => $firstImage?->image_path]);
    }

    private function moderateProductInput(Request $request, string $categoryName): array
    {
        $result = $this->geminiService->checkProductSafety([
            'name' => $request->name,
            'category' => $categoryName,
            'description' => $request->description,
            'price' => $request->price,
            'tags' => $request->tags,
        ]);

        $isFake = (bool) ($result['is_fake'] ?? false);
        $isIllegal = (bool) ($result['is_illegal'] ?? false);

        return [
            'is_fake' => $isFake,
            'is_illegal' => $isIllegal,
            'needs_review' => $isFake || $isIllegal || (($result['verdict'] ?? 'approved') !== 'approved'),
            'reason' => $result['illegal_reason'] ?? $result['fake_reason'] ?? null,
        ];
    }
}
