<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Dispute;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->cannot('admin.access')) {
            return response()->json(['message' => 'Admin access required'], 403);
        }

        $ordersCount = Order::count();
        $revenue = (float) Order::sum('total_price');
        $now = Carbon::now();
        $currentPeriodStart = $now->copy()->subDays(30);
        $previousPeriodStart = $now->copy()->subDays(60);

        $percentChange = function (float|int $current, float|int $previous): float {
            if ((float) $previous === 0.0) {
                return (float) $current > 0 ? 100.0 : 0.0;
            }

            return round(((float) $current - (float) $previous) / (float) $previous * 100, 1);
        };

        $currentRevenue = (float) Order::where('created_at', '>=', $currentPeriodStart)->sum('total_price');
        $previousRevenue = (float) Order::whereBetween('created_at', [$previousPeriodStart, $currentPeriodStart])->sum('total_price');
        $currentOrders = Order::where('created_at', '>=', $currentPeriodStart)->count();
        $previousOrders = Order::whereBetween('created_at', [$previousPeriodStart, $currentPeriodStart])->count();
        $currentUsers = User::where('created_at', '>=', $currentPeriodStart)->count();
        $previousUsers = User::whereBetween('created_at', [$previousPeriodStart, $currentPeriodStart])->count();

        $revenueChart = Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_price) as total')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->limit(14)
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'total' => (float) $row->total,
            ]);

        $orderStatus = Order::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status ?: 'pending',
                'count' => (int) $row->count,
            ]);

        $ordersChart = Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->limit(14)
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'count' => (int) $row->count,
            ]);

        $usersChart = User::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->limit(14)
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'count' => (int) $row->count,
            ]);

        $productsChart = Product::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->limit(14)
            ->get()
            ->map(fn ($row) => [
                'date' => $row->date,
                'count' => (int) $row->count,
            ]);

        $sellerRevenue = OrderItem::query()
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('users', 'products.user_id', '=', 'users.id')
            ->select(
                'users.id',
                'users.name',
                'users.shop_name',
                DB::raw('SUM(order_items.quantity * order_items.price) as revenue'),
                DB::raw('COUNT(DISTINCT order_items.order_id) as orders')
            )
            ->groupBy('users.id', 'users.name', 'users.shop_name')
            ->orderByDesc('revenue')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'seller_id' => (int) $row->id,
                'seller_name' => $row->shop_name ?: $row->name,
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]);

        $activeSellers = User::where('seller_status', 'approved')
            ->orWhere('role', 'seller')
            ->count();
        $pendingSellers = User::where('seller_status', 'pending')->count();
        $currentSellers = User::where(function ($query) {
                $query->where('seller_status', 'approved')->orWhere('role', 'seller');
            })
            ->where('created_at', '>=', $currentPeriodStart)
            ->count();
        $previousSellers = User::where(function ($query) {
                $query->where('seller_status', 'approved')->orWhere('role', 'seller');
            })
            ->whereBetween('created_at', [$previousPeriodStart, $currentPeriodStart])
            ->count();

        $pendingProducts = Product::where('moderation_status', 'pending')
            ->orWhere('is_active', false)
            ->count();
        $pendingPayouts = (float) Payout::where('status', 'pending')->sum('amount');
        $pendingPayoutCount = Payout::where('status', 'pending')->count();

        $totalProducts = Product::count();
        $approvedProducts = Product::where('moderation_status', 'approved')
            ->where('is_active', true)
            ->count();
        $productApprovalRate = $totalProducts ? round(($approvedProducts / $totalProducts) * 100, 1) : 0;
        $customerSatisfaction = round((float) Review::avg('rating'), 1);

        $recentOrders = Order::with('user:id,name')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($order) => [
                'type' => 'order',
                'title' => 'New order #' . $order->id . ' placed',
                'time' => $order->created_at?->diffForHumans(),
                'created_at' => $order->created_at,
            ]);

        $recentSellerApplications = User::where('seller_status', 'pending')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($user) => [
                'type' => 'seller',
                'title' => 'Seller application from ' . $user->name,
                'time' => $user->created_at?->diffForHumans(),
                'created_at' => $user->created_at,
            ]);

        $recentPendingPayouts = Payout::with('user:id,name,shop_name')
            ->where('status', 'pending')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn ($payout) => [
                'type' => 'payout',
                'title' => 'Payout request from ' . ($payout->user?->shop_name ?: $payout->user?->name ?: 'Seller'),
                'time' => $payout->created_at?->diffForHumans(),
                'created_at' => $payout->created_at,
            ]);

        $recentActivity = $recentOrders
            ->concat($recentSellerApplications)
            ->concat($recentPendingPayouts)
            ->sortByDesc('created_at')
            ->take(3)
            ->values()
            ->map(fn ($item) => [
                'type' => $item['type'],
                'title' => $item['title'],
                'time' => $item['time'],
            ]);

        $topProducts = OrderItem::query()
            ->select(
                'product_id',
                DB::raw('SUM(quantity) as quantity'),
                DB::raw('SUM(quantity * price) as revenue')
            )
            ->with(['product.images', 'product.category'])
            ->groupBy('product_id')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $product = $item->product;
                $image = optional($product?->images?->first())->image_url ?: $product?->primary_image_url;

                return [
                    'id' => $item->product_id,
                    'name' => $product?->name ?? 'Deleted product #' . $item->product_id,
                    'category' => $product?->category?->name,
                    'quantity' => (int) $item->quantity,
                    'revenue' => (float) $item->revenue,
                    'image' => $image,
                    'image_url' => $image,
                    'primary_image_url' => $image,
                ];
            });

        return response()->json([
            'totals' => [
                'orders' => $ordersCount,
                'users' => User::count(),
                'products' => Product::count(),
                'categories' => Category::count(),
                'revenue' => $revenue,
                'avg_order_value' => $ordersCount ? round($revenue / $ordersCount, 2) : 0,
                'active_sellers' => $activeSellers,
                'pending_sellers' => $pendingSellers,
                'pending_products' => $pendingProducts,
                'active_disputes' => Dispute::where('status', 'pending')->count(),
                'pending_payouts' => $pendingPayouts,
                'pending_payout_count' => $pendingPayoutCount,
            ],
            'trends' => [
                'revenue' => $percentChange($currentRevenue, $previousRevenue),
                'orders' => $percentChange($currentOrders, $previousOrders),
                'users' => $percentChange($currentUsers, $previousUsers),
                'active_sellers' => $percentChange($currentSellers, $previousSellers),
            ],
            'revenue_chart' => $revenueChart,
            'sales_chart' => $revenueChart->map(fn ($row) => ['date' => $row['date'], 'sales' => $row['total']]),
            'orders_chart' => $ordersChart,
            'users_chart' => $usersChart,
            'products_chart' => $productsChart,
            'seller_revenue' => $sellerRevenue,
            'order_status' => $orderStatus,
            'top_products' => $topProducts,
            'recent_activity' => $recentActivity,
            'platform_health' => [
                'active_sellers' => $activeSellers,
                'total_sellers' => User::whereNotNull('seller_status')->orWhere('role', 'seller')->count(),
                'product_approval_rate' => $productApprovalRate,
                'customer_satisfaction' => $customerSatisfaction,
            ],
        ]);
    }
}
