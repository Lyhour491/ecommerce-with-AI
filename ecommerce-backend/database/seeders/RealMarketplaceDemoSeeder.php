<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Dispute;
use App\Models\Message;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Review;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RealMarketplaceDemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->clearMarketplaceData();

        $admin = User::create([
            'name' => 'Nora Vann',
            'email' => 'admin@marketai.test',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'email_verified_at' => now(),
            'phone' => '010 200 300',
            'country' => 'Cambodia',
            'city' => 'Phnom Penh',
            'zip_code' => '12000',
        ]);

        $categories = $this->seedCategories();
        $sellers = $this->seedSellers();
        $customers = $this->seedCustomers();
        $products = $this->seedProducts($categories, $sellers);

        $orders = $this->seedOrders($customers, $products);
        $this->seedReviews($customers, $products);
        $this->seedWishlists($customers, $products);
        $this->seedPayouts($sellers);
        $this->seedDisputes($admin, $customers, $products, $orders);

        $this->call(RolePermissionSeeder::class);
    }

    private function clearMarketplaceData(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ([
            'messages',
            'disputes',
            'wishlists',
            'reviews',
            'payouts',
            'order_items',
            'orders',
            'product_images',
            'products',
            'categories',
            'model_has_roles',
            'model_has_permissions',
            'users',
        ] as $table) {
            DB::table($table)->truncate();
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    private function seedCategories()
    {
        return collect([
            ['name' => 'Audio & Sound', 'description' => 'Headphones, earbuds, speakers, and studio audio gear.'],
            ['name' => 'Mobile Devices', 'description' => 'Smartphones, tablets, chargers, and mobile accessories.'],
            ['name' => 'Home Office', 'description' => 'Workspace furniture, desk tools, and productivity accessories.'],
            ['name' => 'Footwear', 'description' => 'Running, casual, and daily comfort shoes.'],
            ['name' => 'Accessories', 'description' => 'Travel, everyday carry, and lifestyle accessories.'],
            ['name' => 'Electronics', 'description' => 'Connected devices and smart technology for daily use.'],
        ])->mapWithKeys(function (array $category) {
            $model = Category::create($category + ['slug' => Str::slug($category['name'])]);

            return [$category['name'] => $model];
        });
    }

    private function seedSellers()
    {
        $sellerSettings = [
            'notifications' => ['orders' => true, 'messages' => true, 'payouts' => true],
            'shipping_regions' => ['Cambodia'],
            'return_window_days' => 14,
        ];

        return collect([
            [
                'name' => 'Dara Tech',
                'email' => 'dara.seller@marketai.test',
                'shop_name' => 'Dara Digital Supply',
                'shop_description' => 'Curated consumer electronics and audio gear for students and offices.',
                'shop_category' => 'Electronics',
                'business_phone' => '012 440 120',
                'business_address' => 'Street 310, BKK1',
                'business_city' => 'Phnom Penh',
                'business_country' => 'Cambodia',
            ],
            [
                'name' => 'Sophea Home',
                'email' => 'sophea.seller@marketai.test',
                'shop_name' => 'Sophea Workspace',
                'shop_description' => 'Practical home office products for modern Cambodian workspaces.',
                'shop_category' => 'Home Office',
                'business_phone' => '015 887 904',
                'business_address' => 'Russian Boulevard',
                'business_city' => 'Phnom Penh',
                'business_country' => 'Cambodia',
            ],
            [
                'name' => 'Malis Active',
                'email' => 'malis.seller@marketai.test',
                'shop_name' => 'Malis Active Store',
                'shop_description' => 'Footwear and travel accessories for active daily routines.',
                'shop_category' => 'Footwear',
                'business_phone' => '096 213 4455',
                'business_address' => 'National Road 6',
                'business_city' => 'Siem Reap',
                'business_country' => 'Cambodia',
            ],
        ])->mapWithKeys(function (array $seller) use ($sellerSettings) {
            $user = User::create($seller + [
                'password' => Hash::make('password'),
                'role' => 'seller',
                'email_verified_at' => now(),
                'tax_id' => 'KH-' . strtoupper(Str::random(8)),
                'website' => 'https://' . Str::slug($seller['shop_name']) . '.example',
                'business_state' => null,
                'business_zip' => '12000',
                'seller_status' => 'approved',
                'seller_settings' => $sellerSettings,
            ]);

            return [$seller['shop_name'] => $user];
        });
    }

    private function seedCustomers()
    {
        return collect([
            ['name' => 'Sokha Lim', 'email' => 'sokha.customer@marketai.test', 'phone' => '089 410 220', 'city' => 'Phnom Penh'],
            ['name' => 'Chanthy Keo', 'email' => 'chanthy.customer@marketai.test', 'phone' => '097 515 7300', 'city' => 'Phnom Penh'],
            ['name' => 'Vicheka Sun', 'email' => 'vicheka.customer@marketai.test', 'phone' => '092 700 611', 'city' => 'Battambang'],
            ['name' => 'Rotha Mey', 'email' => 'rotha.customer@marketai.test', 'phone' => '010 889 441', 'city' => 'Siem Reap'],
        ])->mapWithKeys(function (array $customer) {
            $user = User::create($customer + [
                'password' => Hash::make('password'),
                'role' => 'customer',
                'email_verified_at' => now(),
                'country' => 'Cambodia',
                'zip_code' => '12000',
            ]);

            return [$customer['name'] => $user];
        });
    }

    private function seedProducts($categories, $sellers)
    {
        $catalog = [
            [
                'seller' => 'Dara Digital Supply',
                'category' => 'Audio & Sound',
                'name' => 'ProSeries Wireless Headphones',
                'description' => 'Noise-cancelling wireless headphones with 40-hour battery life and soft memory foam cushions.',
                'price' => 349.00,
                'stock' => 42,
                'views' => 860,
                'sales_count' => 28,
                'rating_avg' => 4.8,
                'rating_count' => 18,
                'tags' => 'audio,wireless,noise-cancelling,headphones',
                'images' => [
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Dara Digital Supply',
                'category' => 'Audio & Sound',
                'name' => 'Sonic Wireless Pro Earbuds',
                'description' => 'Compact earbuds with quick pairing, clear calls, and water resistance for commuting.',
                'price' => 199.00,
                'stock' => 55,
                'views' => 640,
                'sales_count' => 35,
                'rating_avg' => 4.6,
                'rating_count' => 21,
                'tags' => 'earbuds,bluetooth,commute,audio',
                'images' => [
                    'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Dara Digital Supply',
                'category' => 'Electronics',
                'name' => 'Precision Smart Watch',
                'description' => 'Minimal smart watch with activity tracking, sleep metrics, and a bright always-on display.',
                'price' => 249.00,
                'stock' => 31,
                'views' => 520,
                'sales_count' => 19,
                'rating_avg' => 4.4,
                'rating_count' => 14,
                'tags' => 'watch,fitness,smartwatch,electronics',
                'images' => [
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Sophea Workspace',
                'category' => 'Home Office',
                'name' => 'Nordic Oak Headphone Stand',
                'description' => 'Solid oak desk stand that keeps headphones and cables organized without taking much space.',
                'price' => 35.00,
                'stock' => 76,
                'views' => 300,
                'sales_count' => 44,
                'rating_avg' => 4.7,
                'rating_count' => 24,
                'tags' => 'desk,wood,organizer,home-office',
                'images' => [
                    'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Sophea Workspace',
                'category' => 'Home Office',
                'name' => 'ErgoLift Laptop Stand',
                'description' => 'Adjustable aluminum laptop stand for better typing angle and cooling airflow.',
                'price' => 59.00,
                'stock' => 63,
                'views' => 410,
                'sales_count' => 31,
                'rating_avg' => 4.5,
                'rating_count' => 17,
                'tags' => 'laptop,stand,ergonomic,desk',
                'images' => [
                    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Malis Active Store',
                'category' => 'Footwear',
                'name' => 'Sprint Runner Elite',
                'description' => 'Lightweight running shoes with responsive cushioning for daily training and city walks.',
                'price' => 129.00,
                'stock' => 68,
                'views' => 790,
                'sales_count' => 52,
                'rating_avg' => 4.9,
                'rating_count' => 30,
                'tags' => 'running,shoes,training,footwear',
                'images' => [
                    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Malis Active Store',
                'category' => 'Accessories',
                'name' => 'Carbon Fiber Travel Case',
                'description' => 'Lightweight hard-shell case for chargers, earbuds, cables, and travel essentials.',
                'price' => 49.00,
                'stock' => 82,
                'views' => 350,
                'sales_count' => 40,
                'rating_avg' => 4.3,
                'rating_count' => 16,
                'tags' => 'travel,case,accessories,everyday-carry',
                'images' => [
                    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'seller' => 'Malis Active Store',
                'category' => 'Accessories',
                'name' => 'Metro Commuter Backpack',
                'description' => 'Weather-resistant backpack with padded laptop pocket and quick-access front storage.',
                'price' => 89.00,
                'stock' => 47,
                'views' => 430,
                'sales_count' => 27,
                'rating_avg' => 4.6,
                'rating_count' => 19,
                'tags' => 'backpack,travel,laptop,commute',
                'images' => [
                    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=900&q=80',
                ],
            ],
        ];

        return collect($catalog)->mapWithKeys(function (array $data) use ($categories, $sellers) {
            $product = Product::create([
                'user_id' => $sellers[$data['seller']]->id,
                'category_id' => $categories[$data['category']]->id,
                'name' => $data['name'],
                'slug' => Str::slug($data['name']),
                'description' => $data['description'],
                'price' => $data['price'],
                'stock' => $data['stock'],
                'views' => $data['views'],
                'sales_count' => $data['sales_count'],
                'rating_avg' => $data['rating_avg'],
                'rating_count' => $data['rating_count'],
                'image' => $data['images'][0],
                'tags' => $data['tags'],
                'is_active' => true,
                'moderation_status' => 'approved',
                'moderation_is_fake' => false,
                'moderation_is_illegal' => false,
                'moderated_at' => now(),
            ]);

            foreach ($data['images'] as $index => $url) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => $url,
                    'alt_text' => $product->name,
                    'is_primary' => $index === 0,
                    'sort_order' => $index + 1,
                ]);
            }

            return [$data['name'] => $product];
        });
    }

    private function seedOrders($customers, $products)
    {
        $orderBlueprints = [
            [
                'customer' => 'Sokha Lim',
                'status' => 'delivered',
                'shipping_address' => '12 Street 310, Phnom Penh, Cambodia',
                'phone' => '089 410 220',
                'items' => [
                    ['ProSeries Wireless Headphones', 1],
                    ['Nordic Oak Headphone Stand', 2],
                ],
            ],
            [
                'customer' => 'Chanthy Keo',
                'status' => 'processing',
                'shipping_address' => '88 Russian Boulevard, Phnom Penh, Cambodia',
                'phone' => '097 515 7300',
                'items' => [
                    ['Sonic Wireless Pro Earbuds', 2],
                    ['Carbon Fiber Travel Case', 1],
                ],
            ],
            [
                'customer' => 'Vicheka Sun',
                'status' => 'pending',
                'shipping_address' => 'National Road 5, Battambang, Cambodia',
                'phone' => '092 700 611',
                'items' => [
                    ['Precision Smart Watch', 1],
                    ['Metro Commuter Backpack', 1],
                ],
            ],
            [
                'customer' => 'Rotha Mey',
                'status' => 'delivered',
                'shipping_address' => 'Old Market Area, Siem Reap, Cambodia',
                'phone' => '010 889 441',
                'items' => [
                    ['Sprint Runner Elite', 1],
                    ['ErgoLift Laptop Stand', 1],
                ],
            ],
            [
                'customer' => 'Sokha Lim',
                'status' => 'pending',
                'shipping_address' => '12 Street 310, Phnom Penh, Cambodia',
                'phone' => '089 410 220',
                'items' => [
                    ['Carbon Fiber Travel Case', 2],
                    ['Metro Commuter Backpack', 1],
                ],
            ],
        ];

        return collect($orderBlueprints)->map(function (array $data) use ($customers, $products) {
            $subtotal = collect($data['items'])->sum(fn (array $item) => $products[$item[0]]->price * $item[1]);
            $tax = round($subtotal * 0.08, 2);
            $shipping = $subtotal >= 250 ? 0 : 8;

            $order = Order::create([
                'user_id' => $customers[$data['customer']]->id,
                'total_price' => $subtotal + $tax + $shipping,
                'status' => $data['status'],
                'shipping_address' => $data['shipping_address'],
                'phone' => $data['phone'],
                'payment_method' => 'test_card',
                'payment_status' => 'paid',
                'payment_reference' => 'PAY-' . strtoupper(Str::random(10)),
                'transaction_id' => 'TXN-' . strtoupper(Str::random(10)),
                'shipping_method' => $shipping ? 'express' : 'standard',
                'shipping_fee' => $shipping,
                'tax' => $tax,
            ]);

            foreach ($data['items'] as [$productName, $quantity]) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $products[$productName]->id,
                    'quantity' => $quantity,
                    'price' => $products[$productName]->price,
                ]);
            }

            return $order;
        });
    }

    private function seedReviews($customers, $products): void
    {
        $reviews = [
            ['Sokha Lim', 'ProSeries Wireless Headphones', 5, 'Excellent sound and the battery easily lasts through a full work week.'],
            ['Chanthy Keo', 'Sonic Wireless Pro Earbuds', 4, 'Very comfortable for commuting, and call quality is clear.'],
            ['Vicheka Sun', 'Precision Smart Watch', 4, 'The screen is bright and health tracking is accurate enough for daily use.'],
            ['Rotha Mey', 'Sprint Runner Elite', 5, 'Light shoes with good cushioning. Great for morning runs in Siem Reap.'],
            ['Sokha Lim', 'Nordic Oak Headphone Stand', 5, 'Clean design and sturdy on my desk.'],
            ['Chanthy Keo', 'Carbon Fiber Travel Case', 4, 'Fits my charger, earbuds, and cable neatly.'],
            ['Rotha Mey', 'ErgoLift Laptop Stand', 4, 'Better posture immediately, and the aluminum feels solid.'],
        ];

        foreach ($reviews as [$customerName, $productName, $rating, $comment]) {
            Review::create([
                'user_id' => $customers[$customerName]->id,
                'product_id' => $products[$productName]->id,
                'rating' => $rating,
                'comment' => $comment,
                'verified_purchase' => true,
            ]);
        }
    }

    private function seedWishlists($customers, $products): void
    {
        foreach ([
            ['Sokha Lim', 'Precision Smart Watch'],
            ['Sokha Lim', 'Metro Commuter Backpack'],
            ['Chanthy Keo', 'ErgoLift Laptop Stand'],
            ['Vicheka Sun', 'ProSeries Wireless Headphones'],
            ['Rotha Mey', 'Carbon Fiber Travel Case'],
        ] as [$customerName, $productName]) {
            Wishlist::create([
                'user_id' => $customers[$customerName]->id,
                'product_id' => $products[$productName]->id,
            ]);
        }
    }

    private function seedPayouts($sellers): void
    {
        foreach ([
            ['Dara Digital Supply', 684.25, 'Bank Transfer', 'ABA Bank **** 2190', 'pending'],
            ['Sophea Workspace', 198.40, 'Bank Transfer', 'ACLEDA Bank **** 7741', 'processed'],
            ['Malis Active Store', 454.06, 'PayPal', 'payouts@malis-active.example', 'pending'],
        ] as [$sellerName, $amount, $method, $account, $status]) {
            Payout::create([
                'user_id' => $sellers[$sellerName]->id,
                'amount' => $amount,
                'method' => $method,
                'account_details' => $account,
                'status' => $status,
                'reference_id' => 'PAYOUT-' . strtoupper(Str::random(8)),
            ]);
        }
    }

    private function seedDisputes(User $admin, $customers, $products, $orders): void
    {
        $order = $orders->firstWhere('status', 'processing') ?? $orders->first();
        $product = $products['Sonic Wireless Pro Earbuds'];
        $customer = $customers['Chanthy Keo'];

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'user_id' => $customer->id,
            'reason' => 'Product issue',
            'statement' => 'One earbud has intermittent audio after the first day of use.',
            'amount' => $product->price,
            'status' => 'pending',
            'seller_requested_refund' => true,
            'seller_refund_requested_at' => now()->subHours(2),
        ]);

        Message::create([
            'order_id' => $order->id,
            'dispute_id' => $dispute->id,
            'user_id' => $customer->id,
            'sender' => 'customer',
            'text' => 'The right earbud cuts out every few minutes. Can you help me with a replacement or refund?',
        ]);

        Message::create([
            'order_id' => $order->id,
            'dispute_id' => $dispute->id,
            'user_id' => $product->seller->id,
            'sender' => 'seller',
            'text' => 'Thanks for the details. We checked the order and requested admin refund review for this item.',
        ]);

        Message::create([
            'order_id' => $order->id,
            'dispute_id' => $dispute->id,
            'user_id' => $admin->id,
            'sender' => 'admin',
            'text' => 'Admin review is pending. Please keep the product packaging until the refund decision is complete.',
        ]);
    }
}
