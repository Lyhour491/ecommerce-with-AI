<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_apply_to_be_seller(): void
    {
        $user = User::factory()->create([
            'role' => 'customer',
        ]);

        $payload = [
            'shop_name' => 'Tech Palace',
            'shop_description' => 'The best tech gadgets in town.',
            'shop_category' => 'Electronics',
            'tax_id' => '12-3456789',
            'website' => 'https://techpalace.example.com',
            'business_phone' => '+1234567890',
            'business_address' => '123 Innovation Way',
            'business_city' => 'Techville',
            'business_state' => 'California',
            'business_zip' => '94025',
            'business_country' => 'USA',
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/seller/apply', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('user.seller_status', 'pending');

        $user->refresh();
        $this->assertEquals('pending', $user->seller_status);
        $this->assertEquals('Tech Palace', $user->shop_name);
        $this->assertEquals('The best tech gadgets in town.', $user->shop_description);
    }

    public function test_admin_can_approve_seller_application(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $applicant = User::factory()->create([
            'role' => 'customer',
            'seller_status' => 'pending',
            'shop_name' => 'Old shop',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/seller-applications/{$applicant->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('user.role', 'seller')
            ->assertJsonPath('user.seller_status', 'approved');

        $applicant->refresh();
        $this->assertEquals('seller', $applicant->role);
        $this->assertEquals('approved', $applicant->seller_status);
    }

    public function test_admin_can_reject_seller_application(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $applicant = User::factory()->create([
            'role' => 'customer',
            'seller_status' => 'pending',
            'shop_name' => 'Rejected shop',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/seller-applications/{$applicant->id}/reject");

        $response->assertStatus(200)
            ->assertJsonPath('user.seller_status', 'rejected');

        $applicant->refresh();
        $this->assertEquals('customer', $applicant->role);
        $this->assertEquals('rejected', $applicant->seller_status);
    }

    public function test_non_seller_cannot_access_seller_routes(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson('/api/seller/stats');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Seller access required']);
    }

    public function test_seller_can_list_own_products(): void
    {
        $seller1 = User::factory()->create(['role' => 'seller']);
        $seller2 = User::factory()->create(['role' => 'seller']);

        $category = Category::create([
            'name' => 'Clothing',
            'slug' => 'clothing',
            'description' => 'Clothes',
        ]);

        Product::create([
            'user_id' => $seller1->id,
            'category_id' => $category->id,
            'name' => 'Seller 1 shirt',
            'slug' => 'seller-1-shirt',
            'description' => 'Shirt description',
            'price' => 19.99,
            'stock' => 10,
            'is_active' => true,
        ]);

        Product::create([
            'user_id' => $seller2->id,
            'category_id' => $category->id,
            'name' => 'Seller 2 shirt',
            'slug' => 'seller-2-shirt',
            'description' => 'Shirt description',
            'price' => 29.99,
            'stock' => 5,
            'is_active' => true,
        ]);

        $response = $this->actingAs($seller1, 'sanctum')
            ->getJson('/api/seller/products');

        $response->assertStatus(200)
            ->assertJsonCount(1);
            
        $response->assertJsonPath('0.name', 'Seller 1 shirt');
    }

    public function test_seller_can_create_product(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
            'description' => 'Gadgets',
        ]);

        $payload = [
            'category_id' => $category->id,
            'name' => 'New Laptop model X',
            'description' => 'High performance laptop',
            'price' => 999.99,
            'stock' => 5,
        ];

        $response = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/products', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('product.name', 'New Laptop model X');

        $this->assertDatabaseHas('products', [
            'user_id' => $seller->id,
            'name' => 'New Laptop model X',
            'price' => 999.99,
            'stock' => 5,
        ]);
    }

    public function test_seller_can_show_and_update_own_product(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Books',
            'slug' => 'books',
        ]);

        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Laravel Book',
            'slug' => 'laravel-book',
            'description' => 'Old description',
            'price' => 39.99,
            'stock' => 20,
            'is_active' => true,
        ]);

        // Show test
        $response = $this->actingAs($seller, 'sanctum')
            ->getJson("/api/seller/products/{$product->id}");

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Laravel Book');

        // Update test
        $updatePayload = [
            'category_id' => $category->id,
            'name' => 'Laravel Book 2nd Edition',
            'description' => 'Updated description',
            'price' => 45.00,
            'stock' => 15,
        ];

        $response = $this->actingAs($seller, 'sanctum')
            ->putJson("/api/seller/products/{$product->id}", $updatePayload);

        $response->assertStatus(200);
        $product->refresh();
        $this->assertEquals('Laravel Book 2nd Edition', $product->name);
        $this->assertEquals('Updated description', $product->description);
        $this->assertEquals(45.00, $product->price);
    }

    public function test_seller_cannot_manage_other_seller_product(): void
    {
        $seller1 = User::factory()->create(['role' => 'seller']);
        $seller2 = User::factory()->create(['role' => 'seller']);
        $category = Category::create(['name' => 'Toys', 'slug' => 'toys']);

        $product = Product::create([
            'user_id' => $seller2->id,
            'category_id' => $category->id,
            'name' => 'Toy Car',
            'slug' => 'toy-car',
            'price' => 9.99,
            'stock' => 100,
            'is_active' => true,
        ]);

        // Attempt show
        $this->actingAs($seller1, 'sanctum')
            ->getJson("/api/seller/products/{$product->id}")
            ->assertStatus(403);

        // Attempt update
        $this->actingAs($seller1, 'sanctum')
            ->putJson("/api/seller/products/{$product->id}", [
                'category_id' => $category->id,
                'name' => 'Hack Car',
                'price' => 1.99,
                'stock' => 50,
            ])
            ->assertStatus(403);

        // Attempt delete
        $this->actingAs($seller1, 'sanctum')
            ->deleteJson("/api/seller/products/{$product->id}")
            ->assertStatus(403);
    }

    public function test_seller_can_delete_own_product(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create(['name' => 'Shoes', 'slug' => 'shoes']);
        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Running Shoes',
            'slug' => 'running-shoes',
            'price' => 80.00,
            'stock' => 12,
            'is_active' => true,
        ]);

        $this->actingAs($seller, 'sanctum')
            ->deleteJson("/api/seller/products/{$product->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
    }

    public function test_seller_can_view_stats_and_orders(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Home', 'slug' => 'home']);

        $product1 = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Lamp',
            'slug' => 'lamp',
            'price' => 20.00,
            'stock' => 50,
            'is_active' => true,
        ]);

        $product2 = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Table',
            'slug' => 'table',
            'price' => 100.00,
            'stock' => 5,
            'is_active' => true,
        ]);

        $order = Order::create([
            'user_id' => $customer->id,
            'total_price' => 140.00,
            'status' => 'paid',
            'shipping_address' => '123 Customer St',
            'phone' => '111-222-3333',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product1->id,
            'quantity' => 2,
            'price' => 20.00,
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product2->id,
            'quantity' => 1,
            'price' => 100.00,
        ]);

        // Stats test
        $response = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/stats');

        $response->assertStatus(200)
            ->assertJson([
                'total_products' => 2,
                'total_stock' => 55,
                'total_sold' => 3,
                'total_revenue' => 140.00,
            ]);

        // Orders test
        $response = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/orders');

        $response->assertStatus(200)
            ->assertJsonCount(1);
    }
}
