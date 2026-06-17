<?php

namespace App\Repositories;

use App\Models\Order;
use App\Models\OrderItem;

class OrderRepository
{
    public function create(array $data): Order
    {
        return Order::create($data);
    }

    public function addItem(Order $order, int $productId, int $quantity, float $price): OrderItem
    {
        return OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $productId,
            'quantity' => $quantity,
            'price' => $price,
        ]);
    }
}
