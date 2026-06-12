<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated. Please login first.'], 401);
        }

        $query = Order::with(['user:id,name,email,role', 'orderItems.product.images', 'orderItems.product.category']);

        if ($request->user()->role !== 'admin') {
            $query->where('user_id', $request->user()->id);
        }

        $orders = $query->latest()->get();

        return response()->json($orders);
    }

    public function show(Request $request, Order $order)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated. Please login first.'], 401);
        }

        if ($order->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($order->load(['user:id,name,email,role', 'orderItems.product.images', 'orderItems.product.category']));
    }

    public function updateStatus(Request $request, Order $order)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $isAdmin = $user->role === 'admin';
        $isSeller = $user->role === 'seller' && $order->orderItems()->whereHas('product', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->exists();

        if (!$isAdmin && !$isSeller) {
            return response()->json(['message' => 'Unauthorized access to update this order status'], 403);
        }

        $data = $request->validate([
            'status' => 'required|in:pending,processing,shipped,delivered,cancelled',
        ]);

        $order->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Order status updated successfully',
            'order' => $order->fresh()->load(['user:id,name,email,role', 'orderItems.product.images', 'orderItems.product.category']),
        ]);
    }

    public function update(Request $request, Order $order)
    {
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Admin access required'], 403);
        }

        $data = $request->validate([
            'status' => 'sometimes|required|in:pending,processing,shipped,delivered,cancelled',
            'shipping_address' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:50',
        ]);

        $order->update($data);

        return response()->json([
            'message' => 'Order updated successfully',
            'order' => $order->fresh()->load(['user:id,name,email,role', 'orderItems.product.images', 'orderItems.product.category']),
        ]);
    }

    public function checkout(Request $request)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated. Please login first.'], 401);
        }

        $data = $request->validate([
            'shipping_address' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'shipping_method' => 'nullable|in:standard,express',
            'payment_method' => 'nullable|in:test_card,cash_on_delivery',
            'cardholder_name' => 'required_if:payment_method,test_card|nullable|string|max:255',
            'card_number' => 'required_if:payment_method,test_card|nullable|string|min:12|max:23',
            'expiry_date' => 'required_if:payment_method,test_card|nullable|string|max:10',
            'cvv' => 'required_if:payment_method,test_card|nullable|string|min:3|max:4',
        ]);

        $cartItems = Cart::with('product')
            ->where('user_id', $request->user()->id)
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json(['message' => 'Cart is empty'], 400);
        }

        return DB::transaction(function () use ($request, $cartItems, $data) {
            $total = 0;

            foreach ($cartItems as $item) {
                if (!$item->product) {
                    return response()->json(['message' => 'Product not found in cart'], 404);
                }

                if ($item->product->stock < $item->quantity) {
                    return response()->json([
                        'message' => 'Not enough stock for ' . $item->product->name
                    ], 400);
                }

                $total += $item->product->price * $item->quantity;
            }

            $shippingMethod = $data['shipping_method'] ?? 'standard';
            $shippingFee = $shippingMethod === 'express' ? 15 : 0;
            $tax = round($total * 0.08, 2);
            $grandTotal = round($total + $shippingFee + $tax, 2);
            $paymentMethod = $data['payment_method'] ?? 'test_card';

            // TEST ONLY: no real gateway is called and no card details are stored.
            // To simulate a declined card, use card number 4000000000000002.
            $digitsOnlyCard = preg_replace('/\D+/', '', $data['card_number'] ?? '');
            if ($paymentMethod === 'test_card' && $digitsOnlyCard === '4000000000000002') {
                return response()->json(['message' => 'Test payment declined. Use any other test card number.'], 422);
            }

            $order = Order::create([
                'user_id' => $request->user()->id,
                'total_price' => $grandTotal,
                'status' => 'processing',
                'shipping_address' => $request->shipping_address,
                'phone' => $request->phone,
                'shipping_method' => $shippingMethod,
                'shipping_fee' => $shippingFee,
                'tax' => $tax,
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
                'payment_reference' => 'TEST-' . strtoupper(uniqid()),
            ]);

            foreach ($cartItems as $item) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'price' => $item->product->price,
                ]);

                $item->product->decrement('stock', $item->quantity);
            }

            Cart::where('user_id', $request->user()->id)->delete();

            Cache::forget('products:top');

            return response()->json([
                'message' => 'Checkout successful. Test payment processed.',
                'order' => $order->load(['user:id,name,email,role', 'orderItems.product.images', 'orderItems.product.category'])
            ], 201);
        });
    }
}