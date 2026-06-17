<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\Payout;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;

class NotificationCenterService
{
    public function forUser(User $user): array
    {
        $stored = $user->notifications()
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn ($notification) => [
                'id' => $notification->id,
                'title' => $notification->data['title'] ?? 'Notification',
                'text' => $notification->data['text'] ?? '',
                'time' => optional($notification->created_at)->diffForHumans() ?? 'Now',
                'to' => $notification->data['to'] ?? '/',
                'type' => $notification->data['type'] ?? 'info',
                'read' => $notification->read_at !== null,
                'source' => 'stored',
            ]);

        $computed = collect($this->computedForRole($user));
        $items = $stored->concat($computed)->take(12)->values();

        return [
            'notifications' => $items,
            'unread_count' => $items->where('read', false)->count(),
            'stored_unread_count' => $stored->where('read', false)->count(),
        ];
    }

    private function computedForRole(User $user): array
    {
        if ($user->can('admin.access')) {
            return $this->adminNotifications();
        }

        if ($user->can('seller.access')) {
            return $this->sellerNotifications($user);
        }

        return $this->customerNotifications($user);
    }

    private function adminNotifications(): array
    {
        $pendingProducts = Product::where('moderation_status', 'pending')->count();
        $flaggedProducts = Product::where('moderation_status', 'flagged')->count();
        $sellerApplications = User::where('seller_status', 'pending')->count();
        $pendingOrders = Order::whereIn('status', ['pending', 'processing'])->count();

        return $this->compact([
            $pendingProducts + $flaggedProducts > 0 ? [
                'id' => 'admin-products-review',
                'title' => 'Product review queue',
                'text' => ($pendingProducts + $flaggedProducts) . ' products need admin moderation before public listing.',
                'time' => 'Now',
                'to' => '/admin/products',
                'type' => 'warning',
                'read' => false,
            ] : null,
            $sellerApplications > 0 ? [
                'id' => 'admin-seller-applications',
                'title' => 'Seller applications',
                'text' => $sellerApplications . ' seller applications are waiting for approval.',
                'time' => 'Today',
                'to' => '/admin/customers',
                'type' => 'seller',
                'read' => false,
            ] : null,
            $pendingOrders > 0 ? [
                'id' => 'admin-orders',
                'title' => 'Orders need attention',
                'text' => $pendingOrders . ' orders are pending or processing.',
                'time' => 'Today',
                'to' => '/admin/orders',
                'type' => 'order',
                'read' => false,
            ] : null,
        ]);
    }

    private function sellerNotifications(User $user): array
    {
        $productIds = Product::where('user_id', $user->id)->pluck('id');
        $openOrders = Order::whereHas('orderItems', fn ($query) => $query->whereIn('product_id', $productIds))
            ->whereIn('status', ['pending', 'processing'])
            ->count();
        $lowStock = Product::where('user_id', $user->id)->where('stock', '<=', 5)->count();
        $pendingPayouts = Payout::where('user_id', $user->id)->where('status', 'pending')->count();
        $flaggedProducts = Product::where('user_id', $user->id)
            ->whereIn('moderation_status', ['pending', 'flagged', 'rejected'])
            ->count();

        return $this->compact([
            $openOrders > 0 ? [
                'id' => 'seller-open-orders',
                'title' => 'New store orders',
                'text' => $openOrders . ' orders need fulfillment updates.',
                'time' => 'Now',
                'to' => '/seller/orders',
                'type' => 'order',
                'read' => false,
            ] : null,
            $flaggedProducts > 0 ? [
                'id' => 'seller-product-moderation',
                'title' => 'Product moderation',
                'text' => $flaggedProducts . ' products are waiting for review or need changes.',
                'time' => 'Today',
                'to' => '/seller/products',
                'type' => 'warning',
                'read' => false,
            ] : null,
            $lowStock > 0 ? [
                'id' => 'seller-low-stock',
                'title' => 'Low stock products',
                'text' => $lowStock . ' products are low on inventory.',
                'time' => 'Today',
                'to' => '/seller/products',
                'type' => 'inventory',
                'read' => false,
            ] : null,
            $pendingPayouts > 0 ? [
                'id' => 'seller-payouts',
                'title' => 'Payout update',
                'text' => $pendingPayouts . ' payout requests are still pending.',
                'time' => 'This week',
                'to' => '/seller/payouts',
                'type' => 'payment',
                'read' => false,
            ] : null,
        ]);
    }

    private function customerNotifications(User $user): array
    {
        $activeOrders = Order::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'processing', 'shipped'])
            ->count();
        $cartItems = Cart::where('user_id', $user->id)->count();

        return $this->compact([
            $activeOrders > 0 ? [
                'id' => 'customer-active-orders',
                'title' => 'Order updates',
                'text' => $activeOrders . ' orders are active. Track delivery and messages.',
                'time' => 'Today',
                'to' => '/orders',
                'type' => 'order',
                'read' => false,
            ] : null,
            $cartItems > 0 ? [
                'id' => 'customer-cart',
                'title' => 'Cart reminder',
                'text' => $cartItems . ' products are waiting in your cart.',
                'time' => 'Today',
                'to' => '/cart',
                'type' => 'cart',
                'read' => false,
            ] : null,
            [
                'id' => 'customer-shopping-assistant',
                'title' => 'AI shopping assistant',
                'text' => 'Ask for product recommendations based on your needs.',
                'time' => 'Anytime',
                'to' => '/products',
                'type' => 'ai',
                'read' => true,
            ],
        ]);
    }

    private function compact(array $items): array
    {
        return Collection::make($items)->filter()->values()->all();
    }
}
