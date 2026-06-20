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
            'product:id,user_id,name,price',
            'messages:id,dispute_id,order_id,user_id,sender,text,created_at',
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
            $query->where(function ($sellerQuery) use ($user) {
                $sellerQuery
                    ->whereHas('product', fn ($productQuery) => $productQuery->where('user_id', $user->id))
                    ->orWhere(function ($fallbackQuery) use ($user) {
                        $fallbackQuery
                            ->whereNull('product_id')
                            ->whereHas('order.orderItems.product', fn ($productQuery) => $productQuery->where('user_id', $user->id));
                    });
            });
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
            'product_id' => 'nullable|integer|exists:products,id',
            'reason' => 'required|string|max:255',
            'statement' => 'required|string|max:5000',
            'amount' => 'nullable|numeric|min:0',
        ]);

        $orderItem = null;
        if (! empty($data['product_id'])) {
            $orderItem = $order->orderItems()->where('product_id', $data['product_id'])->first();
            if (! $orderItem) {
                return response()->json(['message' => 'Selected product is not part of this order'], 422);
            }
        }

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'product_id' => $data['product_id'] ?? null,
            'user_id' => $order->user_id,
            'reason' => $data['reason'],
            'statement' => $data['statement'],
            'amount' => $data['amount'] ?? ($orderItem ? ((float) $orderItem->price * (int) $orderItem->quantity) : $order->total_price),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Dispute submitted successfully',
            'dispute' => $this->format($dispute->load($this->relations())),
        ], 201);
    }

    public function updateStatus(Request $request, Dispute $dispute)
    {
        $user = $request->user();
        $isAdmin = $user->can('admin.access');
        $isSeller = $this->isSellerOfDispute($user, $dispute);

        if (! $isAdmin && ! $isSeller) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'status' => 'required|in:pending,resolved,refunded',
        ]);

        if ($data['status'] === 'refunded' && ! $isAdmin) {
            return response()->json(['message' => 'Only admin can approve refunds'], 403);
        }

        $dispute->update([
            'status' => $data['status'],
            'resolved_at' => $data['status'] === 'pending' ? null : now(),
            'resolved_by' => $data['status'] === 'pending' ? null : $user->id,
        ]);

        return response()->json([
            'message' => 'Dispute updated successfully',
            'dispute' => $this->format($dispute->fresh()->load($this->relations())),
        ]);
    }

    public function requestRefund(Request $request, Dispute $dispute)
    {
        $user = $request->user();

        if (! $this->isSellerOfDispute($user, $dispute)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dispute->update([
            'seller_requested_refund' => true,
            'seller_refund_requested_at' => now(),
        ]);

        $dispute->messages()->create([
            'order_id' => $dispute->order_id,
            'user_id' => $user->id,
            'sender' => 'seller',
            'text' => 'Seller requested admin refund approval for this dispute.',
        ]);

        return response()->json([
            'message' => 'Refund review requested',
            'dispute' => $this->format($dispute->fresh()->load($this->relations())),
        ]);
    }

    public function messages(Request $request, Dispute $dispute)
    {
        if (! $this->canAccessDispute($request->user(), $dispute)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($dispute->messages()->orderBy('created_at')->get());
    }

    public function storeMessage(Request $request, Dispute $dispute)
    {
        $user = $request->user();

        if (! $this->canAccessDispute($user, $dispute)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'text' => 'required|string|max:5000',
        ]);

        $sender = match (true) {
            $user->can('admin.access') => 'admin',
            $this->isSellerOfDispute($user, $dispute) => 'seller',
            default => 'customer',
        };

        $message = $dispute->messages()->create([
            'order_id' => $dispute->order_id,
            'user_id' => $user->id,
            'sender' => $sender,
            'text' => $data['text'],
        ]);

        return response()->json($message, 201);
    }

    private function format(Dispute $dispute): array
    {
        $order = $dispute->order;
        $customer = $dispute->user ?: $order?->user;

        return [
            'id' => $dispute->id,
            'display_id' => 'DSP-' . str_pad((string) $dispute->id, 4, '0', STR_PAD_LEFT),
            'order_id' => $dispute->order_id,
            'product_id' => $dispute->product_id,
            'order_number' => $order ? 'ORD-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT) : null,
            'customer_name' => $customer?->name ?: 'Customer',
            'customer_email' => $customer?->email,
            'product_name' => $dispute->product?->name,
            'reason' => $dispute->reason,
            'statement' => $dispute->statement,
            'amount' => (float) $dispute->amount,
            'status' => $dispute->status,
            'seller_requested_refund' => (bool) $dispute->seller_requested_refund,
            'seller_refund_requested_at' => $dispute->seller_refund_requested_at,
            'date' => $dispute->created_at?->toDateString(),
            'created_at' => $dispute->created_at,
            'resolved_at' => $dispute->resolved_at,
            'messages' => $dispute->relationLoaded('messages') ? $dispute->messages : [],
        ];
    }

    private function canAccessDispute($user, Dispute $dispute): bool
    {
        return $user->can('admin.access')
            || (int) $dispute->user_id === (int) $user->id
            || $this->isSellerOfDispute($user, $dispute);
    }

    private function isSellerOfDispute($user, Dispute $dispute): bool
    {
        if (! $user->can('seller.access')) {
            return false;
        }

        if ($dispute->product_id) {
            return $dispute->product()->where('user_id', $user->id)->exists();
        }

        return $dispute->order()
            ->whereHas('orderItems.product', fn ($query) => $query->where('user_id', $user->id))
            ->exists();
    }
}
