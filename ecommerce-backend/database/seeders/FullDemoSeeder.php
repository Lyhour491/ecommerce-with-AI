<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\User;
use App\Models\Review;
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

        // Create additional customers for review seeding
        $alice = User::updateOrCreate(
            ['email' => 'alice@gmail.com'],
            ['name' => 'Alice Johnson', 'password' => Hash::make('password'), 'role' => 'customer']
        );
        $bob = User::updateOrCreate(
            ['email' => 'bob@gmail.com'],
            ['name' => 'Bob Smith', 'password' => Hash::make('password'), 'role' => 'customer']
        );
        $charlie = User::updateOrCreate(
            ['email' => 'charlie@gmail.com'],
            ['name' => 'Charlie Brown', 'password' => Hash::make('password'), 'role' => 'customer']
        );

        Review::query()->delete();

        // Seed Reviews
        $reviews = [
            [
                'product' => 'ProSeries Wireless Headphones',
                'reviews' => [
                    ['user' => $alice, 'rating' => 5, 'comment' => 'Incredible sound quality! The active noise cancellation works like magic, and the cushions are extremely comfortable.', 'verified' => true],
                    ['user' => $bob, 'rating' => 4, 'comment' => 'Really good headphones, sounds amazing and holds battery for a long time. Just a bit heavy on my ears after several hours.', 'verified' => true],
                    ['user' => $customer, 'rating' => 5, 'comment' => 'Premium packaging, premium build, and stellar performance. Best purchase I have made this year!', 'verified' => true]
                ]
            ],
            [
                'product' => 'Sonic Wireless Pro',
                'reviews' => [
                    ['user' => $charlie, 'rating' => 5, 'comment' => 'Absolutely love these earbuds. They connect instantly and the sound profile is very balanced. Highly recommend!', 'verified' => false],
                    ['user' => $alice, 'rating' => 4, 'comment' => 'Great value for money. Battery life easily lasts me all day and call clarity is top notch.', 'verified' => true]
                ]
            ],
            [
                'product' => 'Pro Precision Watch',
                'reviews' => [
                    ['user' => $customer, 'rating' => 4, 'comment' => 'Very clean and minimal design. The health tracking metrics seem accurate. Battery life is decent too.', 'verified' => true],
                    ['user' => $bob, 'rating' => 3, 'comment' => 'Decent smart watch, but the step tracking is sometimes inaccurate. Beautiful build quality though.', 'verified' => false]
                ]
            ],
            [
                'product' => 'Sprint Runner Elite',
                'reviews' => [
                    ['user' => $alice, 'rating' => 5, 'comment' => "Best running shoes I've ever owned. Very light and springy. Runs true to size.", 'verified' => true]
                ]
            ],
            [
                'product' => 'Nordic Oak Headphone Stand',
                'reviews' => [
                    ['user' => $bob, 'rating' => 5, 'comment' => 'Looks gorgeous on my desk! The wood finish is very premium and matches my setup perfectly.', 'verified' => true],
                    ['user' => $charlie, 'rating' => 4, 'comment' => 'Stable stand, holds large headphones well. Wish it had a small tray at the bottom for cables.', 'verified' => false]
                ]
            ]
        ];

        foreach ($reviews as $item) {
            $productName = $item['product'];
            $product = $created[$productName] ?? null;
            if ($product) {
                foreach ($item['reviews'] as $rev) {
                    Review::create([
                        'user_id' => $rev['user']->id,
                        'product_id' => $product->id,
                        'rating' => $rev['rating'],
                        'comment' => $rev['comment'],
                        'verified_purchase' => $rev['verified'],
                    ]);
                }
            }
        }

        $this->call(RolePermissionSeeder::class);
    }
}
