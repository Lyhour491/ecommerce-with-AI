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

        $systemInstruction = "You are a customer support AI shopping assistant for MarketAI.\n\n"
            . "Store Product Catalog:\n" . json_encode($catalog, JSON_PRETTY_PRINT) . "\n\n"
            . $userContext
            . "\nInstructions:\n"
            . "1. Provide helpful, conversational, polite replies.\n"
            . "2. Recommend only products from the catalog. Link products using `/products/{id}`.\n"
            . "3. Help with order status using the user's order context.\n"
            . "4. Keep replies concise and formatted in clean markdown.\n"
            . "5. Do not invent products, prices, order statuses, policies, or tracking numbers.";

        $fullPrompt = '';
        foreach ($history as $chat) {
            $roleName = $chat['role'] === 'user' ? 'Customer' : 'Assistant';
            $fullPrompt .= "{$roleName}: {$chat['text']}\n";
        }

        $fullPrompt .= "Current Message:\nCustomer: {$message}\nAssistant:";

        return (string) $this->geminiService->generateContent($fullPrompt, $systemInstruction);
    }
}
