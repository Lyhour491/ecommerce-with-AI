<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SellerProductController extends Controller
{
    /**
     * List only the authenticated seller's products.
     */
    public function index(Request $request)
    {
        $products = Product::with(['category', 'images'])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($products);
    }

    /**
     * Create a product owned by the authenticated seller.
     */
    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name'        => 'required|string|max:255|unique:products,name',
            'description' => 'nullable|string',
            'price'       => 'required|numeric|min:0',
            'stock'       => 'required|integer|min:0',
            'images'      => 'nullable|array',
            'images.*'    => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'image_urls'  => 'nullable|array',
            'image_urls.*' => 'nullable|url|max:2048',
            'tags'        => 'nullable|string|max:1000',
        ]);

        $product = Product::create([
            'user_id'     => $request->user()->id,
            'category_id' => $request->category_id,
            'name'        => $request->name,
            'slug'        => Str::slug($request->name),
            'description' => $request->description,
            'price'       => $request->price,
            'stock'       => $request->stock,
            'tags'        => $request->tags,
            'is_active'   => true,
        ]);

        $this->syncImages($request, $product);

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $product->load(['category', 'images']),
        ], 201);
    }

    /**
     * Show a single product (only if owned by this seller).
     */
    public function show(Request $request, Product $product)
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'This product does not belong to you'], 403);
        }

        return response()->json($product->load(['category', 'images']));
    }

    /**
     * Update a product (only if owned by this seller).
     */
    public function update(Request $request, Product $product)
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'This product does not belong to you'], 403);
        }

        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name'        => 'required|string|max:255|unique:products,name,' . $product->id,
            'description' => 'nullable|string',
            'price'       => 'required|numeric|min:0',
            'stock'       => 'required|integer|min:0',
            'images'      => 'nullable|array',
            'images.*'    => 'image|mimes:jpg,jpeg,png,webp|max:5120',
            'image_urls'  => 'nullable|array',
            'image_urls.*' => 'nullable|url|max:2048',
            'replace_images' => 'nullable|boolean',
            'tags'        => 'nullable|string|max:1000',
        ]);

        $product->update([
            'category_id' => $request->category_id,
            'name'        => $request->name,
            'slug'        => Str::slug($request->name),
            'description' => $request->description,
            'price'       => $request->price,
            'stock'       => $request->stock,
            'tags'        => $request->tags,
        ]);

        $this->syncImages($request, $product);

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $product->load(['category', 'images']),
        ]);
    }

    /**
     * Delete a product (only if owned by this seller).
     */
    public function destroy(Request $request, Product $product)
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'This product does not belong to you'], 403);
        }

        foreach ($product->images as $image) {
            if ($image->image_path && !str_starts_with($image->image_path, 'http')) {
                Storage::disk('public')->delete($image->image_path);
            }
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully']);
    }

    /**
     * Seller's dashboard stats.
     */
    public function stats(Request $request)
    {
        $sellerId = $request->user()->id;

        $totalProducts = Product::where('user_id', $sellerId)->count();
        $totalStock = (int) Product::where('user_id', $sellerId)->sum('stock');

        $orderItemStats = \App\Models\OrderItem::whereIn('product_id', function ($query) use ($sellerId) {
            $query->select('id')->from('products')->where('user_id', $sellerId);
        })
        ->selectRaw('SUM(quantity) as total_sold, SUM(quantity * price) as total_revenue')
        ->first();

        $totalSold = (int) ($orderItemStats->total_sold ?? 0);
        $totalRevenue = (float) ($orderItemStats->total_revenue ?? 0);

        return response()->json([
            'total_products' => $totalProducts,
            'total_stock'    => $totalStock,
            'total_sold'     => $totalSold,
            'total_revenue'  => round($totalRevenue, 2),
        ]);
    }

    /**
     * Orders that contain this seller's products.
     */
    public function orders(Request $request)
    {
        $productIds = Product::where('user_id', $request->user()->id)->pluck('id');

        $orders = \App\Models\Order::with(['user:id,name,email,role', 'orderItems.product.images', 'orderItems.product.category', 'messages'])
            ->whereHas('orderItems', function ($q) use ($productIds) {
                $q->whereIn('product_id', $productIds);
            })
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // ── Private helpers ──────────────────────────────────────────────────

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
                    'alt_text'   => $product->name,
                    'is_primary' => !$hasExistingPrimary && $nextOrder === 1,
                    'sort_order' => $nextOrder++,
                ]);

                $hasExistingPrimary = true;
            }
        }

        foreach ((array) $request->input('image_urls', []) as $url) {
            if (!$url) continue;

            ProductImage::create([
                'product_id' => $product->id,
                'image_path' => $url,
                'alt_text'   => $product->name,
                'is_primary' => !$hasExistingPrimary,
                'sort_order' => $nextOrder++,
            ]);

            $hasExistingPrimary = true;
        }

        $firstImage = $product->images()->orderByDesc('is_primary')->orderBy('sort_order')->first();
        $product->update(['image' => $firstImage?->image_path]);
    }
}
