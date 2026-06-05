<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FullDemoSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@gmail.com'],
            ['name' => 'Admin', 'password' => Hash::make('password'), 'role' => 'admin']
        );

        $customer = User::updateOrCreate(
            ['email' => 'user@gmail.com'],
            ['name' => 'Customer', 'password' => Hash::make('password'), 'role' => 'customer']
        );

        $seller = User::updateOrCreate(
            ['email' => 'seller@gmail.com'],
            ['name' => 'Seller', 'password' => Hash::make('password'), 'role' => 'seller']
        );

        $categories = collect([
            ['name' => 'Electronics', 'description' => 'Premium technology products'],
            ['name' => 'Mobile Devices', 'description' => 'Phones and mobile accessories'],
            ['name' => 'Audio & Sound', 'description' => 'Headphones, earbuds, and speakers'],
            ['name' => 'Footwear', 'description' => 'Sport and casual shoes'],
            ['name' => 'Accessories', 'description' => 'Everyday add-ons and travel gear'],
            ['name' => 'Home Office', 'description' => 'Desk and workspace products'],
        ])->mapWithKeys(function ($category) {
            $model = Category::updateOrCreate(
                ['slug' => Str::slug($category['name'])],
                $category + ['slug' => Str::slug($category['name'])]
            );
            return [$category['name'] => $model];
        });

        $products = [
            [
                'name' => 'ProSeries Wireless Headphones',
                'category' => 'Audio & Sound',
                'description' => 'Flagship wireless headphones with deep bass, noise cancellation, and soft memory foam cushions.',
                'price' => 349.00,
                'stock' => 48,
                'images' => [
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Sonic Wireless Pro',
                'category' => 'Audio & Sound',
                'description' => 'Compact wireless earbuds with quick pairing, clear calls, and long battery life.',
                'price' => 199.00,
                'stock' => 35,
                'images' => [
                    'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Pro Precision Watch',
                'category' => 'Accessories',
                'description' => 'Minimal smart watch with premium metal body and health tracking tools.',
                'price' => 249.00,
                'stock' => 28,
                'images' => [
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Sprint Runner Elite',
                'category' => 'Footwear',
                'description' => 'Lightweight running shoes built for comfort, speed, and daily performance.',
                'price' => 129.00,
                'stock' => 68,
                'images' => [
                    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Nordic Oak Headphone Stand',
                'category' => 'Home Office',
                'description' => 'Clean wood stand for headphones and desk organization.',
                'price' => 35.00,
                'stock' => 70,
                'images' => [
                    'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Carbon Fiber Travel Case',
                'category' => 'Accessories',
                'description' => 'Durable travel case for small electronics and everyday carry items.',
                'price' => 49.00,
                'stock' => 60,
                'images' => [
                    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=900&q=80',
                ],
            ],
        ];

        $created = [];

        foreach ($products as $data) {
            $product = Product::updateOrCreate(
                ['slug' => Str::slug($data['name'])],
                [
                    'category_id' => $categories[$data['category']]->id,
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']),
                    'description' => $data['description'],
                    'price' => $data['price'],
                    'stock' => $data['stock'],
                    'image' => $data['images'][0],
                    'is_active' => true,
                ]
            );

            ProductImage::where('product_id', $product->id)->delete();
            foreach ($data['images'] as $index => $url) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => $url,
                    'alt_text' => $data['name'],
                    'is_primary' => $index === 0,
                    'sort_order' => $index + 1,
                ]);
            }

            $created[$data['name']] = $product;
        }

        OrderItem::query()->delete();
        Order::query()->delete();

        $orders = [
            ['status' => 'delivered', 'items' => [['ProSeries Wireless Headphones', 3], ['Carbon Fiber Travel Case', 1]]],
            ['status' => 'processing', 'items' => [['ProSeries Wireless Headphones', 2], ['Sonic Wireless Pro', 1]]],
            ['status' => 'pending', 'items' => [['Sprint Runner Elite', 2], ['Pro Precision Watch', 1]]],
            ['status' => 'delivered', 'items' => [['ProSeries Wireless Headphones', 1], ['Nordic Oak Headphone Stand', 2]]],
            ['status' => 'pending', 'items' => [['Sonic Wireless Pro', 2], ['Carbon Fiber Travel Case', 2]]],
        ];

        foreach ($orders as $orderData) {
            $subtotal = collect($orderData['items'])->sum(fn ($item) => $created[$item[0]]->price * $item[1]);
            $tax = round($subtotal * 0.08, 2);
            $shipping = $subtotal >= 500 ? 0 : 15;

            $order = Order::create([
                'user_id' => $customer->id,
                'total_price' => $subtotal + $tax + $shipping,
                'status' => $orderData['status'],
                'shipping_address' => 'Phnom Penh, Cambodia',
                'phone' => '012345678',
                'payment_method' => 'test_card',
                'payment_status' => 'paid',
                'payment_reference' => 'TEST-' . strtoupper(Str::random(8)),
                'shipping_method' => $shipping ? 'express' : 'standard',
                'shipping_fee' => $shipping,
                'tax' => $tax,
            ]);

            foreach ($orderData['items'] as [$productName, $quantity]) {
                $product = $created[$productName];
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $product->price,
                ]);
            }
        }
    }
}
