<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dispute;
use App\Models\Order;
use Illuminate\Http\Request;

class DisputeController extends Controller
{
    private function relations(): array
    {
        return [
            'user:id,name,email',
            'order.user:id,name,email',
            'order.orderItems.product:id,user_id,name,price',
        ];
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $query = Dispute::with($this->relations())->latest();

        if ($user->can('admin.access')) {
            return response()->json($query->get()->map(fn ($dispute) => $this->format($dispute)));
        }

        if ($user->can('seller.access')) {
            $query->whereHas('order.orderItems.product', fn ($productQuery) => $productQuery->where('user_id', $user->id));
            return response()->json($query->get()->map(fn ($dispute) => $this->format($dispute)));
        }

        $query->where('user_id', $user->id);
        return response()->json($query->get()->map(fn ($dispute) => $this->format($dispute)));
    }

    public function store(Request $request, Order $order)
    {
        $user = $request->user();

        if ($order->user_id !== $user->id && ! $user->can('admin.access')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'reason' => 'required|string|max:255',
            'statement' => 'required|string|max:5000',
            'amount' => 'nullable|numeric|min:0',
        ]);

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'reason' => $data['reason'],
            'statement' => $data['statement'],
            'amount' => $data['amount'] ?? $order->total_price,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Dispute submitted successfully',
            'dispute' => $this->format($dispute->load($this->relations())),
        ], 201);
    }

    public function updateStatus(Request $request, Dispute $dispute)
    {
        if (! $request->user()->can('admin.access')) {
            return response()->json(['message' => 'Admin access required'], 403);
        }

        $data = $request->validate([
            'status' => 'required|in:pending,resolved,refunded',
        ]);

        $dispute->update([
            'status' => $data['status'],
            'resolved_at' => $data['status'] === 'pending' ? null : now(),
            'resolved_by' => $data['status'] === 'pending' ? null : $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Dispute updated successfully',
            'dispute' => $this->format($dispute->fresh()->load($this->relations())),
        ]);
    }

    private function format(Dispute $dispute): array
    {
        $order = $dispute->order;
        $customer = $dispute->user ?: $order?->user;

        return [
            'id' => $dispute->id,
            'display_id' => 'DSP-' . str_pad((string) $dispute->id, 4, '0', STR_PAD_LEFT),
            'order_id' => $dispute->order_id,
            'order_number' => $order ? 'ORD-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT) : null,
            'customer_name' => $customer?->name ?: 'Customer',
            'customer_email' => $customer?->email,
            'reason' => $dispute->reason,
            'statement' => $dispute->statement,
            'amount' => (float) $dispute->amount,
            'status' => $dispute->status,
            'date' => $dispute->created_at?->toDateString(),
            'created_at' => $dispute->created_at,
            'resolved_at' => $dispute->resolved_at,
        ];
    }
}
