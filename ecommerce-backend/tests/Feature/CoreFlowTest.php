<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_e2e_flow(): void
    {
        // 1. Customer registration
        $registerPayload = [
            'name' => 'Alice Customer',
            'email' => 'alice@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $regResponse = $this->postJson('/api/register', $registerPayload);
        $regResponse->assertStatus(201)
            ->assertJsonStructure(['token', 'user']);

        $token = $regResponse->json('token');
        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);

        // Create a category & product to buy
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Books',
            'slug' => 'books',
        ]);
        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Adventures of PHP',
            'slug' => 'adventures-of-php',
            'price' => 25.00,
            'stock' => 10,
            'is_active' => true,
        ]);

        // 2. Fetch catalog info
        $this->getJson('/api/categories')->assertStatus(200)->assertJsonCount(1);
        $this->getJson('/api/products')->assertStatus(200)->assertJsonCount(1);

        // 3. Add to cart
        $cartPayload = [
            'product_id' => $product->id,
            'quantity' => 2,
        ];
        
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/cart', $cartPayload);
        $response->assertStatus(201);

        // Check cart listing
        $cartList = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/cart');
        $cartList->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.quantity', 2);

        $cartId = $cartList->json('0.id');

        // 4. Update cart item quantity
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson("/api/cart/{$cartId}", ['quantity' => 3])
            ->assertStatus(200);

        // 5. Checkout
        $checkoutPayload = [
            'shipping_address' => '456 Elm St, New York, NY',
            'phone' => '555-555-5555',
            'shipping_method' => 'standard',
            'payment_method' => 'test_card',
            'cardholder_name' => 'Alice Customer',
            'card_number' => '4000 0000 0000 0001',
            'expiry_date' => '12/28',
            'cvv' => '123',
        ];

        $checkoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/checkout', $checkoutPayload);

        $checkoutResponse->assertStatus(201)
            ->assertJsonPath('order.status', 'processing')
            ->assertJsonPath('order.payment_status', 'paid');

        // Verify stock has decreased
        $product->refresh();
        $this->assertEquals(7, $product->stock); // 10 - 3

        // Verify cart is now empty
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/cart')
            ->assertStatus(200)
            ->assertJsonCount(0);
    }

    public function test_checkout_declined_card(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create(['name' => 'Generic', 'slug' => 'generic']);
        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Generic Pen',
            'slug' => 'generic-pen',
            'price' => 1.50,
            'stock' => 10,
            'is_active' => true,
        ]);

        // Add to cart
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/cart', [
                'product_id' => $product->id,
                'quantity' => 1,
            ])
            ->assertStatus(201);

        // Checkout with declining test card
        $checkoutPayload = [
            'shipping_address' => 'Decline Street',
            'phone' => '000-000-0000',
            'shipping_method' => 'standard',
            'payment_method' => 'test_card',
            'cardholder_name' => 'Failing Cardholder',
            'card_number' => '4000 0000 0000 0002', // Declines payment
            'expiry_date' => '11/30',
            'cvv' => '999',
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/checkout', $checkoutPayload);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Test payment declined. Use any other test card number.']);

        // Stock should remain unchanged
        $product->refresh();
        $this->assertEquals(10, $product->stock);
    }

    public function test_admin_stats(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'totals' => [
                    'users',
                    'orders',
                    'revenue',
                    'products',
                    'categories',
                    'avg_order_value',
                ],
                'revenue_chart',
                'order_status',
                'top_products',
            ]);
    }
}
