<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\GeminiService;
use App\Services\SellerProductService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SellerProductController extends Controller
{
    public function __construct(
        private GeminiService $geminiService,
        private SellerProductService $sellerProductService,
    )
    {
    }

    /**
     * List only the authenticated seller's products.
     */
    public function index(Request $request)
    {
        $products = Product::with(['category', 'images'])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
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

        return response()->json($this->sellerProductService->create($request), 201);
    }

    /**
     * Show a single product (only if owned by this seller).
     */
    public function show(Request $request, Product $product)
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'This product does not belong to you'], 403);
        }

        return response()->json(
            $product->load(['category', 'images'])
                ->loadAvg('reviews', 'rating')
                ->loadCount('reviews')
        );
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

        return response()->json($this->sellerProductService->update($request, $product));
    }

    /**
     * Delete a product (only if owned by this seller).
     */
    public function destroy(Request $request, Product $product)
    {
        if ($product->user_id !== $request->user()->id) {
            return response()->json(['message' => 'This product does not belong to you'], 403);
        }

        $this->sellerProductService->delete($product);

        return response()->json(['message' => 'Product deleted successfully']);
    }

    /**
     * Seller's dashboard stats.
     */
    public function stats(Request $request)
    {
        $sellerId = $request->user()->id;

        $productStats = Product::where('user_id', $sellerId)
            ->selectRaw('COUNT(*) as total_products, COALESCE(SUM(stock), 0) as total_stock')
            ->first();

        $orderItemStats = \App\Models\OrderItem::whereIn('product_id', function ($query) use ($sellerId) {
            $query->select('id')->from('products')->where('user_id', $sellerId);
        })
        ->selectRaw('SUM(quantity) as total_sold, SUM(quantity * price) as total_revenue')
        ->first();

        $totalSold = (int) ($orderItemStats->total_sold ?? 0);
        $totalRevenue = (float) ($orderItemStats->total_revenue ?? 0);
        $sellerProductIds = Product::where('user_id', $sellerId)->pluck('id');
        $sellerOrders = \App\Models\Order::whereHas('orderItems.product', function ($query) use ($sellerId) {
            $query->where('user_id', $sellerId);
        });
        $ordersCount = (clone $sellerOrders)->count();
        $completedOrders = (clone $sellerOrders)
            ->whereIn('status', ['delivered', 'completed'])
            ->count();
        $averageRating = (float) \App\Models\Review::whereIn('product_id', $sellerProductIds)->avg('rating');
        $lowStockCount = Product::where('user_id', $sellerId)->where('stock', '<=', 5)->count();
        $disputesCount = \App\Models\Dispute::whereHas('product', function ($query) use ($sellerId) {
            $query->where('user_id', $sellerId);
        })->count();

        return response()->json([
            'total_products' => (int) ($productStats->total_products ?? 0),
            'total_stock'    => (int) ($productStats->total_stock ?? 0),
            'total_sold'     => $totalSold,
            'total_revenue'  => round($totalRevenue, 2),
            'orders_count' => $ordersCount,
            'completed_orders' => $completedOrders,
            'completion_rate' => $ordersCount ? round(($completedOrders / $ordersCount) * 100, 1) : 0,
            'average_rating' => round($averageRating, 1),
            'low_stock_count' => $lowStockCount,
            'disputes_count' => $disputesCount,
            'dispute_rate' => $ordersCount ? round(($disputesCount / $ordersCount) * 100, 1) : 0,
        ]);
    }

    /**
     * Orders that contain this seller's products.
     */
    public function orders(Request $request)
    {
        $sellerId = $request->user()->id;

        $orders = \App\Models\Order::with([
            'user:id,name,email,role',
            'messages',
            'orderItems.product' => function ($query) {
                $query->with(['images', 'category'])
                    ->withAvg('reviews', 'rating')
                    ->withCount('reviews');
            },
        ])
            ->whereHas('orderItems.product', function ($q) use ($sellerId) {
                $q->where('user_id', $sellerId);
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
