<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class OrderController extends Controller
{
    public function __construct(private CheckoutService $checkoutService)
    {
    }

    private function orderRelations(): array
    {
        return [
            'user:id,name,email,role',
            'orderItems.product' => function ($query) {
                $query->with(['images', 'category'])
                    ->withAvg('reviews', 'rating')
                    ->withCount('reviews');
            },
        ];
    }

    public function index(Request $request)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated. Please login first.'], 401);
        }

        $query = Order::with($this->orderRelations());

        if ($request->user()->cannot('admin.access')) {
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

        if ($order->user_id !== $request->user()->id && $request->user()->cannot('admin.access')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($order->load($this->orderRelations()));
    }

    public function updateStatus(Request $request, Order $order)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $isAdmin = $user->can('admin.access');
        $isSeller = $user->can('seller.access') && $order->orderItems()->whereHas('product', function ($q) use ($user) {
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
            'order' => $order->fresh()->load($this->orderRelations()),
        ]);
    }

    public function update(Request $request, Order $order)
    {
        if (!$request->user() || $request->user()->cannot('admin.access')) {
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
            'order' => $order->fresh()->load($this->orderRelations()),
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

        [$payload, $status] = $this->checkoutService->checkout($request, $data);

        return response()->json($payload, $status);
    }
}
