<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    private function canManageProducts(Request $request): bool
    {
        return $request->user('sanctum')?->role === 'admin';
    }

    private function productRelations(bool $includeSeller = false): array
    {
        $relations = ['category', 'images'];

        if ($includeSeller) {
            $relations[] = 'seller:id,name,email,role,shop_name,seller_status';
        }

        return $relations;
    }

    private function loadProductForResponse(Product $product, bool $includeSeller = false): Product
    {
        return $product->load($this->productRelations($includeSeller))
            ->loadAvg('reviews', 'rating')
            ->loadCount('reviews');
    }

    public function index(Request $request)
    {
        $isAdmin = $this->canManageProducts($request);
        $includeInactive = $isAdmin && $request->boolean('include_inactive');

        $query = Product::with($this->productRelations($includeInactive))
            ->withAvg('reviews', 'rating')
            ->withCount('reviews');

        if (!$includeInactive) {
            $query->where('is_active', true);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('category')) {
            $query->whereHas('category', function ($categoryQuery) use ($request) {
                $categoryQuery->where('name', $request->category);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($productQuery) use ($search) {
                $productQuery->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->get());
    }


    public function topProducts()
    {
        $topProducts = Cache::remember('products:top', now()->addMinutes(10), function () {
            $items = OrderItem::query()
                ->select(
                    'product_id',
                    DB::raw('SUM(quantity) as sold_count'),
                    DB::raw('SUM(quantity * price) as revenue')
                )
                ->with(['product' => function ($query) {
                    $query->with($this->productRelations())
                        ->withAvg('reviews', 'rating')
                        ->withCount('reviews');
                }])
                ->whereNotNull('product_id')
                ->whereHas('product', fn ($query) => $query->where('is_active', true))
                ->groupBy('product_id')
                ->orderByDesc('sold_count')
                ->limit(8)
                ->get()
                ->filter(fn ($item) => $item->product)
                ->map(function ($item) {
                    $product = $item->product;
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
                        'sold_count' => (int) $item->sold_count,
                        'revenue' => (float) $item->revenue,
                    ];
                })
                ->values();

            if ($items->isEmpty()) {
                $items = Product::with($this->productRelations())
                    ->withAvg('reviews', 'rating')
                    ->withCount('reviews')
                    ->where('is_active', true)
                    ->latest()
                    ->limit(8)
                    ->get()
                    ->map(function ($product) {
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
                            'sold_count' => 0,
                            'revenue' => 0,
                        ];
                    });
            }

            return $items;
        });

        return response()->json($topProducts);
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255|unique:products,name',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'image_urls' => 'nullable|array',
            'image_urls.*' => 'nullable|url|max:2048',
            'replace_images' => 'nullable|boolean',
            'tags' => 'nullable|string|max:1000',
        ]);

        $product = Product::create([
            'category_id' => $request->category_id,
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $request->stock,
            'tags' => $request->tags,
            'is_active' => true,
            'moderation_status' => 'approved',
            'moderation_is_fake' => false,
            'moderation_is_illegal' => false,
            'moderation_reason' => null,
            'moderated_at' => now(),
        ]);

        $this->syncImages($request, $product);

        Cache::forget('products:top');

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $this->loadProductForResponse($product, true),
        ], 201);
    }

    public function show(Request $request, Product $product)
    {
        if (!$product->is_active && !$this->canManageProducts($request)) {
            abort(404);
        }

        return response()->json(
            $product->load(array_merge($this->productRelations($this->canManageProducts($request)), ['reviews']))
                ->loadAvg('reviews', 'rating')
                ->loadCount('reviews')
        );
    }

    public function update(Request $request, Product $product)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255|unique:products,name,' . $product->id,
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'image_urls' => 'nullable|array',
            'image_urls.*' => 'nullable|url|max:2048',
            'replace_images' => 'nullable|boolean',
            'tags' => 'nullable|string|max:1000',
        ]);

        $product->update([
            'category_id' => $request->category_id,
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'price' => $request->price,
            'stock' => $request->stock,
            'tags' => $request->tags,
            'moderation_status' => 'approved',
            'moderation_is_fake' => false,
            'moderation_is_illegal' => false,
            'moderation_reason' => null,
            'moderated_at' => now(),
        ]);

        $this->syncImages($request, $product);

        Cache::forget('products:top');

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $this->loadProductForResponse($product, true),
        ]);
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

    public function destroy(Product $product)
    {
        foreach ($product->images as $image) {
            if ($image->image_path && !str_starts_with($image->image_path, 'http')) {
                Storage::disk('public')->delete($image->image_path);
            }
        }

        $product->delete();

        Cache::forget('products:top');

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }

    /**
     * Approve a product (set is_active = true)
     */
    public function approve(Product $product)
    {
        $product->update([
            'is_active' => true,
            'moderation_status' => 'approved',
            'moderation_reason' => null,
            'moderated_at' => now(),
        ]);

        Cache::forget('products:top');

        return response()->json([
            'message' => 'Product approved successfully',
            'product' => $this->loadProductForResponse($product, true),
        ]);
    }

    /**
     * Reject a product (set is_active = false)
     */
    public function reject(Product $product)
    {
        $product->update([
            'is_active' => false,
            'moderation_status' => 'rejected',
            'moderated_at' => now(),
        ]);

        Cache::forget('products:top');

        return response()->json([
            'message' => 'Product rejected/disabled successfully',
            'product' => $this->loadProductForResponse($product, true),
        ]);
    }
}
