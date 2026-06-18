<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecommendationTest extends TestCase
{
    use RefreshDatabase;

    public function test_recommended_for_you_uses_wishlist_purchases_and_categories(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $electronics = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);
        $home = Category::create(['name' => 'Home', 'slug' => 'home']);

        $wishlisted = Product::create([
            'user_id' => $seller->id,
            'category_id' => $electronics->id,
            'name' => 'Wishlisted Speaker',
            'slug' => 'wishlisted-speaker',
            'price' => 45,
            'stock' => 10,
            'is_active' => true,
        ]);

        $purchased = Product::create([
            'user_id' => $seller->id,
            'category_id' => $home->id,
            'name' => 'Purchased Lamp',
            'slug' => 'purchased-lamp',
            'price' => 30,
            'stock' => 10,
            'is_active' => true,
        ]);

        $recommended = Product::create([
            'user_id' => $seller->id,
            'category_id' => $electronics->id,
            'name' => 'Recommended Headphones',
            'slug' => 'recommended-headphones',
            'price' => 80,
            'stock' => 10,
            'is_active' => true,
            'sales_count' => 8,
        ]);

        Wishlist::create(['user_id' => $customer->id, 'product_id' => $wishlisted->id]);

        $order = Order::create([
            'user_id' => $customer->id,
            'total_price' => 30,
            'status' => 'completed',
            'shipping_address' => '123 Market Street',
            'phone' => '012345678',
            'payment_method' => 'test',
            'payment_status' => 'paid',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $purchased->id,
            'quantity' => 1,
            'price' => 30,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/recommendations/for-you?limit=4')
            ->assertOk()
            ->assertJsonPath('based_on.wishlist', true)
            ->assertJsonPath('based_on.previous_purchases', true)
            ->assertJsonPath('based_on.product_categories', true)
            ->assertJsonFragment(['name' => $recommended->name]);
    }
}
