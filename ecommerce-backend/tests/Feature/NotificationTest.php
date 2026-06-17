<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_seller_and_customer_receive_role_notifications(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller']);
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Electronics', 'slug' => 'electronics']);

        Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Pending Headphones',
            'slug' => 'pending-headphones',
            'price' => 99,
            'stock' => 4,
            'moderation_status' => 'pending',
        ]);

        Cart::create([
            'user_id' => $customer->id,
            'product_id' => Product::first()->id,
            'quantity' => 1,
        ]);

        Order::create([
            'user_id' => $customer->id,
            'total_price' => 99,
            'status' => 'processing',
            'shipping_address' => 'Test street',
            'phone' => '012345678',
            'payment_method' => 'test',
            'payment_status' => 'paid',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonFragment(['id' => 'admin-products-review']);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonFragment(['id' => 'seller-product-moderation']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonFragment(['id' => 'customer-cart']);
    }

    public function test_user_can_mark_stored_notifications_as_read(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $id = (string) Str::uuid();

        DB::table('notifications')->insert([
            'id' => $id,
            'type' => 'database',
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => json_encode([
                'title' => 'Order shipped',
                'text' => 'Your order is on the way.',
                'to' => '/orders',
                'type' => 'order',
            ]),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/notifications/{$id}/read")
            ->assertOk();

        $this->assertDatabaseMissing('notifications', [
            'id' => $id,
            'read_at' => null,
        ]);
    }
}
