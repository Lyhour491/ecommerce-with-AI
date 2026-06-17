<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index(Request $request, Order $order)
    {
        $user = $request->user();
        
        // Ensure user is authorized (either order buyer, seller of items, or admin)
        if ($user->id !== $order->user_id && !$this->isSellerOfOrder($user, $order) && $user->cannot('admin.access')) {
            return response()->json(['message' => 'Unauthorized to view this chat'], 403);
        }

        $messages = $order->messages()->orderBy('created_at', 'asc')->get();
        return response()->json($messages);
    }

    public function store(Request $request, Order $order)
    {
        $user = $request->user();
        $isSeller = $this->isSellerOfOrder($user, $order);

        // Ensure user is authorized to send message
        if ($user->id !== $order->user_id && !$isSeller && $user->cannot('admin.access')) {
            return response()->json(['message' => 'Unauthorized to send messages'], 403);
        }

        $request->validate([
            'text' => 'required|string|max:2000',
        ]);

        $sender = ($isSeller || $user->can('admin.access')) ? 'seller' : 'customer';

        $message = $order->messages()->create([
            'user_id' => $user->id,
            'sender' => $sender,
            'text' => $request->text,
        ]);

        return response()->json($message, 201);
    }

    private function isSellerOfOrder($user, Order $order)
    {
        if ($user->cannot('seller.access')) {
            return false;
        }

        // Check if any product in this order belongs to the authenticated seller
        return $order->orderItems()->whereHas('product', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->exists();
    }
}
