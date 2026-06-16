<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Wishlist;
use App\Models\Product;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    /**
     * Display a listing of the user's wishlisted products.
     */
    public function index(Request $request)
    {
        $products = Product::whereIn('id', function ($query) use ($request) {
            $query->select('product_id')
                ->from('wishlists')
                ->where('user_id', $request->user()->id);
        })
        ->with(['category', 'images'])
        ->where('is_active', true)
        ->get();

        return response()->json($products);
    }

    /**
     * Store a newly created resource in storage (or remove if already present - toggle).
     */
    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $userId = $request->user()->id;
        $productId = $request->product_id;

        $wishlist = Wishlist::where('user_id', $userId)
            ->where('product_id', $productId)
            ->first();

        if ($wishlist) {
            $wishlist->delete();
            return response()->json([
                'message' => 'Product removed from wishlist',
                'in_wishlist' => false,
            ]);
        }

        Wishlist::create([
            'user_id' => $userId,
            'product_id' => $productId,
        ]);

        return response()->json([
            'message' => 'Product added to wishlist',
            'in_wishlist' => true,
        ], 201);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, $productId)
    {
        $wishlist = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->first();

        if ($wishlist) {
            $wishlist->delete();
        }

        return response()->json([
            'message' => 'Product removed from wishlist',
        ]);
    }
}
