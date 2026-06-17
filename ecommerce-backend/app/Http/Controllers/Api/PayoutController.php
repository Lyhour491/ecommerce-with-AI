<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payout;
use App\Models\OrderItem;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayoutController extends Controller
{
    /**
     * Get the authenticated seller's balance and payout history.
     */
    public function sellerIndex(Request $request)
    {
        $sellerId = $request->user()->id;

        // Calculate gross revenue from orders for this seller's products
        $grossSales = (float) OrderItem::whereIn('product_id', function ($query) use ($sellerId) {
            $query->select('id')->from('products')->where('user_id', $sellerId);
        })->sum(DB::raw('quantity * price'));

        $commissionRate = ((float) SystemSetting::getValue('platform.commission_rate', 10)) / 100;
        $commission = round($grossSales * $commissionRate, 2);
        $netPayout = round($grossSales - $commission, 2);

        // Sum of all requested payouts (pending, processing, completed)
        $totalWithdrawn = (float) Payout::where('user_id', $sellerId)->sum('amount');
        
        // Available balance
        $balance = max(0.00, round($netPayout - $totalWithdrawn, 2));

        $history = Payout::where('user_id', $sellerId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'balance' => $balance,
            'gross_sales' => $grossSales,
            'commission' => $commission,
            'net_payout' => $netPayout,
            'history' => $history
        ]);
    }

    /**
     * Submit a new payout request for the authenticated seller.
     */
    public function sellerStore(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'method' => 'required|string|in:bank,paypal',
            'account_details' => 'required|string|max:1000',
        ]);

        $sellerId = $request->user()->id;

        // Re-calculate balance dynamically
        $grossSales = (float) OrderItem::whereIn('product_id', function ($query) use ($sellerId) {
            $query->select('id')->from('products')->where('user_id', $sellerId);
        })->sum(DB::raw('quantity * price'));

        $commissionRate = ((float) SystemSetting::getValue('platform.commission_rate', 10)) / 100;
        $commission = round($grossSales * $commissionRate, 2);
        $netPayout = round($grossSales - $commission, 2);
        $totalWithdrawn = (float) Payout::where('user_id', $sellerId)->sum('amount');
        $balance = max(0.00, round($netPayout - $totalWithdrawn, 2));

        if ($request->amount > $balance) {
            return response()->json(['message' => 'Requested amount exceeds your available balance.'], 400);
        }

        $payout = Payout::create([
            'user_id' => $sellerId,
            'amount' => $request->amount,
            'method' => $request->method,
            'account_details' => $request->account_details,
            'status' => 'pending',
            'reference_id' => 'TXN-' . rand(100000, 999999),
        ]);

        return response()->json([
            'message' => 'Payout request submitted successfully',
            'payout' => $payout
        ], 201);
    }

    /**
     * Get all payouts for the administrator.
     */
    public function adminIndex(Request $request)
    {
        $payouts = Payout::with('user')->orderBy('created_at', 'desc')->get();
        $sellerIds = $payouts->pluck('user_id')->unique()->values();

        $orderCountsBySeller = OrderItem::query()
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->whereIn('products.user_id', $sellerIds)
            ->selectRaw('products.user_id as seller_id, COUNT(DISTINCT order_items.order_id) as total_orders')
            ->groupBy('products.user_id')
            ->pluck('total_orders', 'seller_id');

        $formatted = $payouts->map(function ($payout) use ($orderCountsBySeller) {
            $sellerId = $payout->user_id;
            $sellerName = $payout->user->shop_name ?: $payout->user->name . ' Store';
            $ownerName = $payout->user->name;

            // Back-calculate gross sales and commission for rendering
            $commissionRate = ((float) SystemSetting::getValue('platform.commission_rate', 10)) / 100;
            $netRate = max(0.01, 1 - $commissionRate);
            $netPayout = (float) $payout->amount;
            $grossSales = round($netPayout / $netRate, 2);
            $commission = round($grossSales * $commissionRate, 2);

            $totalOrders = (int) ($orderCountsBySeller[$sellerId] ?? 0);

            // Format bank account preview
            $lastFour = substr($payout->account_details, -4);
            $previewAccount = is_numeric($lastFour) ? '****' . $lastFour : 'PayPal Account';

            return [
                'id' => 'payout_' . $payout->id,
                'db_id' => $payout->id,
                'sellerId' => $sellerId,
                'sellerName' => $sellerName,
                'ownerName' => $ownerName,
                'status' => $payout->status,
                'period' => $payout->created_at->format('M d, Y') . ' Request',
                'requestedDate' => $payout->created_at->format('M d, Y'),
                'grossSales' => $grossSales,
                'commission' => $commission,
                'netPayout' => $netPayout,
                'totalOrders' => max(1, $totalOrders),
                'bankAccount' => $previewAccount,
                'account_details' => $payout->account_details,
                'method' => $payout->method,
            ];
        });

        return response()->json($formatted);
    }

    /**
     * Process a single payout.
     */
    public function adminProcess(Request $request, $id)
    {
        $payout = Payout::findOrFail($id);
        $payout->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Payout processed successfully',
            'payout' => $payout
        ]);
    }

    /**
     * Batch process all pending payouts.
     */
    public function adminBatchProcess(Request $request)
    {
        Payout::where('status', 'pending')->update(['status' => 'completed']);

        return response()->json([
            'message' => 'All pending payouts processed successfully'
        ]);
    }
}
