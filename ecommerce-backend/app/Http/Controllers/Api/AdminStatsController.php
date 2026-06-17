<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
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
            ],
            'revenue_chart' => $revenueChart,
            'sales_chart' => $revenueChart->map(fn ($row) => ['date' => $row['date'], 'sales' => $row['total']]),
            'orders_chart' => $ordersChart,
            'users_chart' => $usersChart,
            'products_chart' => $productsChart,
            'seller_revenue' => $sellerRevenue,
            'order_status' => $orderStatus,
            'top_products' => $topProducts,
        ]);
    }
}
