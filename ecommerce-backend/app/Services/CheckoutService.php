<?php

namespace App\Services;

use App\Models\Cart;
use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CheckoutService
{
    public function __construct(
        private OrderRepository $orders,
        private ProductRepository $products,
    ) {
    }

    public function checkout(Request $request, array $data): array
    {
        $cartItems = Cart::with('product')
            ->where('user_id', $request->user()->id)
            ->get();

        if ($cartItems->isEmpty()) {
            return [['message' => 'Cart is empty'], 400];
        }

        return DB::transaction(function () use ($request, $cartItems, $data) {
            $total = 0;

            foreach ($cartItems as $item) {
                if (!$item->product) {
                    return [['message' => 'Product not found in cart'], 404];
                }

                if ($item->product->stock < $item->quantity) {
                    return [['message' => 'Not enough stock for ' . $item->product->name], 400];
                }

                $total += $item->product->price * $item->quantity;
            }

            $shippingMethod = $data['shipping_method'] ?? 'standard';
            $shippingFee = $shippingMethod === 'express' ? 15 : 0;
            $tax = round($total * 0.08, 2);
            $grandTotal = round($total + $shippingFee + $tax, 2);
            $paymentMethod = $data['payment_method'] ?? 'test_card';

            $digitsOnlyCard = preg_replace('/\D+/', '', $data['card_number'] ?? '');
            if ($paymentMethod === 'test_card' && $digitsOnlyCard === '4000000000000002') {
                return [['message' => 'Test payment declined. Use any other test card number.'], 422];
            }

            $transactionId = 'TXN-' . strtoupper(uniqid());

            $order = $this->orders->create([
                'user_id' => $request->user()->id,
                'total_price' => $grandTotal,
                'status' => 'processing',
                'shipping_address' => $data['shipping_address'],
                'phone' => $data['phone'],
                'shipping_method' => $shippingMethod,
                'shipping_fee' => $shippingFee,
                'tax' => $tax,
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
                'payment_reference' => $transactionId,
                'transaction_id' => $transactionId,
            ]);

            foreach ($cartItems as $item) {
                $this->orders->addItem($order, $item->product_id, $item->quantity, (float) $item->product->price);
                $item->product->decrement('stock', $item->quantity);
                $this->products->incrementSales($item->product, (int) $item->quantity);
            }

            Cart::where('user_id', $request->user()->id)->delete();
            Cache::forget('products:top');

            return [[
                'message' => 'Checkout successful. Test payment processed.',
                'order' => $order->load([
                    'user:id,name,email,role',
                    'orderItems.product' => function ($query) {
                        $query->with(['images', 'category'])
                            ->withAvg('reviews', 'rating')
                            ->withCount('reviews');
                    },
                ]),
            ], 201];
        });
    }
}
