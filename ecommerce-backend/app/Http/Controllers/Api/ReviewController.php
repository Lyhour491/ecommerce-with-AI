<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Product;
use App\Models\Order;
use App\Repositories\ProductRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    public function __construct(private ProductRepository $products)
    {
    }

    /**
     * Get reviews for a specific product.
     */
    public function index(Product $product)
    {
        $reviews = $product->reviews()
            ->with('user:id,name,avatar')
            ->latest()
            ->get();

        return response()->json($reviews);
    }

    /**
     * Submit a new review for a product.
     */
    public function store(Request $request, Product $product)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:5|max:1000',
        ]);

        $userId = $request->user()->id;

        // Prevent duplicate reviews from the same user for the same product
        $existing = Review::where('user_id', $userId)
            ->where('product_id', $product->id)
            ->exists();

        if ($existing) {
            return response()->json([
                'message' => 'You have already submitted a review for this product.'
            ], 422);
        }

        // Check if user has purchased this product (Verified Purchase check)
        $hasPurchased = DB::table('orders')
            ->join('order_items', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.user_id', $userId)
            ->where('order_items.product_id', $product->id)
            ->where('orders.status', 'delivered') // Standard verified purchases require delivery
            ->exists();

        $review = Review::create([
            'user_id' => $userId,
            'product_id' => $product->id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'verified_purchase' => $hasPurchased,
        ]);

        $this->products->refreshRatingStats($product);

        return response()->json([
            'message' => 'Review submitted successfully',
            'review' => $review->load('user:id,name,avatar'),
        ], 201);
    }
}
