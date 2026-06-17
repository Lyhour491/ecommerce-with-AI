<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequestedApiFlowsTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_flow(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'password',
            'role' => 'customer',
        ]);

        $this->postJson('/api/login', [
            'email' => 'login@example.com',
            'password' => 'password',
        ])
            ->assertOk()
            ->assertJsonStructure(['message', 'user', 'token']);
    }

    public function test_seller_product_create_flow(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);

        $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/products', [
                'category_id' => $category->id,
                'name' => 'Wireless Desk Speaker',
                'description' => 'Compact bluetooth speaker for a modern desk.',
                'price' => 59.99,
                'stock' => 12,
                'tags' => 'audio, bluetooth, desk',
            ])
            ->assertCreated()
            ->assertJsonPath('product.name', 'Wireless Desk Speaker');

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'name' => 'Wireless Desk Speaker',
        ]);
    }

    public function test_cart_and_order_create_flow(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create(['name' => 'Home', 'slug' => 'home']);
        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Desk Lamp',
            'slug' => 'desk-lamp',
            'price' => 25.00,
            'stock' => 5,
            'is_active' => true,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/cart', [
                'product_id' => $product->id,
                'quantity' => 2,
            ])
            ->assertCreated()
            ->assertJsonPath('cart.quantity', 2);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/checkout', [
                'shipping_address' => '12 Market Street',
                'phone' => '012345678',
                'shipping_method' => 'standard',
                'payment_method' => 'test_card',
                'cardholder_name' => 'Demo Buyer',
                'card_number' => '4242 4242 4242 4242',
                'expiry_date' => '12/30',
                'cvv' => '123',
            ])
            ->assertCreated()
            ->assertJsonPath('order.payment_status', 'paid')
            ->assertJsonStructure(['order' => ['transaction_id']]);

        $product->refresh();
        $this->assertEquals(3, $product->stock);
        $this->assertEquals(2, $product->sales_count);
    }

    public function test_ai_chat_flow_requires_authentication(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->postJson('/api/ai/chat', ['message' => 'Help me shop'])
            ->assertUnauthorized();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/ai/chat', ['message' => 'Help me shop'])
            ->assertOk()
            ->assertJsonStructure(['response']);
    }
}
