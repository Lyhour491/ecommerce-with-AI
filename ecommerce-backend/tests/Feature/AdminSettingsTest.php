<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_save_and_reset_system_settings(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $payload = [
            'platform' => [
                'platform_name' => 'MarketAI',
                'support_email' => 'support@marketai.com',
                'commission_rate' => 12.5,
                'currency' => 'USD',
                'minimum_order_amount' => 5,
                'maximum_order_amount' => 10000,
            ],
            'payments' => [
                'payout_schedule' => 'weekly',
                'minimum_payout_amount' => 75,
                'payout_processing_days' => 4,
                'gateways' => [
                    'stripe' => true,
                    'paypal' => false,
                ],
            ],
            'email' => [
                'smtp_server' => 'smtp.marketai.com',
                'smtp_port' => 587,
                'smtp_username' => 'noreply@marketai.com',
                'from_email_address' => 'MarketAI <noreply@marketai.com>',
                'order_emails' => true,
                'marketing_emails' => false,
            ],
            'security' => [
                'require_2fa' => true,
                'session_timeout_minutes' => 45,
                'max_login_attempts' => 4,
                'minimum_password_length' => 10,
                'require_strong_passwords' => true,
            ],
            'alerts' => [
                'new_order' => true,
                'new_seller' => true,
                'dispute' => false,
                'payout' => true,
                'system_alerts' => true,
            ],
        ];

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', $payload)
            ->assertStatus(200)
            ->assertJsonPath('settings.platform.commission_rate', 12.5)
            ->assertJsonPath('settings.payments.gateways.paypal', false);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertStatus(200)
            ->assertJsonPath('settings.security.require_2fa', true);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/settings/reset')
            ->assertStatus(200)
            ->assertJsonPath('settings.platform.commission_rate', 10)
            ->assertJsonPath('settings.security.require_2fa', false);
    }

    public function test_customer_cannot_manage_system_settings(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/settings')
            ->assertStatus(403);
    }

    public function test_saved_commission_rate_affects_seller_payout_summary(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller']);
        $customer = User::factory()->create(['role' => 'customer']);
        $category = Category::create(['name' => 'Accessories', 'slug' => 'accessories']);
        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Seller Watch',
            'slug' => 'seller-watch',
            'price' => 100,
            'stock' => 5,
            'is_active' => true,
        ]);
        $order = Order::create([
            'user_id' => $customer->id,
            'total_price' => 200,
            'status' => 'processing',
            'shipping_address' => 'Phnom Penh',
            'phone' => '012345678',
        ]);

        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 100,
        ]);

        $payload = array_replace_recursive(SystemSetting::defaults(), [
            'platform' => ['commission_rate' => 15],
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson('/api/admin/settings', $payload)
            ->assertStatus(200);

        $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/payouts')
            ->assertStatus(200)
            ->assertJsonPath('gross_sales', 200)
            ->assertJsonPath('commission', 30)
            ->assertJsonPath('net_payout', 170);
    }
}
