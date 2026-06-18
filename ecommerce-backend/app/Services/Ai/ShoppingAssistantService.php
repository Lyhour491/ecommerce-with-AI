<?php

namespace App\Services\Ai;

use App\Repositories\ProductRepository;
use App\Services\GeminiService;
use Illuminate\Http\Request;

class ShoppingAssistantService
{
    public function __construct(
        private GeminiService $geminiService,
        private ProductRepository $products,
    ) {
    }

    public function chat(Request $request): string
    {
        $message = $request->input('message');
        $history = $request->input('history', []);

        $catalog = $this->products->activeCatalog()
            ->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'price' => '$' . number_format((float) $product->price, 2),
                'description' => str($product->description ?? '')->limit(120)->toString(),
                'category' => $product->category?->name ?? 'General',
                'stock' => $product->stock > 0 ? "In Stock ({$product->stock})" : 'Out of Stock',
                'rating' => (float) ($product->rating_avg ?? 0),
                'sales_count' => (int) ($product->sales_count ?? 0),
            ]);

        $user = $request->user();
        $userContext = "User status: Authenticated. Name: {$user->name}, Email: {$user->email}\n";

        $orders = $user->orders()->with('orderItems.product')->latest()->limit(5)->get();
        if ($orders->isNotEmpty()) {
            $userContext .= "Recent Order History:\n";
            foreach ($orders as $order) {
                $userContext .= "- Order ID: #{$order->id}, Status: {$order->status}, Total: \${$order->total_price}, Created: {$order->created_at->toDateTimeString()}\n";
                foreach ($order->orderItems as $item) {
                    $userContext .= "  * " . ($item->product?->name ?? 'Product') . " (Qty: {$item->quantity}, Price: \${$item->price})\n";
                }
            }
        } else {
            $userContext .= "This user has not placed any orders yet.\n";
        }

        $systemInstruction = "You are a realistic customer support and shopping assistant for MarketAI.\n\n"
            . "Store Product Catalog:\n" . json_encode($catalog, JSON_PRETTY_PRINT) . "\n\n"
            . $userContext
            . "\nInstructions:\n"
            . "1. Think step by step internally, then answer concisely.\n"
            . "2. Recommend only products from the catalog. Link products using `/products/{id}`.\n"
            . "3. If the request is vague, ask 1-2 useful clarifying questions instead of guessing.\n"
            . "4. If recommending, compare price, category, stock, rating, and sales_count when available.\n"
            . "5. Help with order status using only the user's order context.\n"
            . "6. Say when you do not have enough information. Do not invent products, prices, discounts, order statuses, policies, or tracking numbers.\n"
            . "7. Keep replies in clean markdown with short bullets.";

        $fullPrompt = '';
        foreach ($history as $chat) {
            $roleName = $chat['role'] === 'user' ? 'Customer' : 'Assistant';
            $fullPrompt .= "{$roleName}: {$chat['text']}\n";
        }

        $fullPrompt .= "Current Message:\nCustomer: {$message}\nAssistant:";

        return (string) $this->geminiService->generateContent($fullPrompt, $systemInstruction);
    }
}
