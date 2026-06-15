<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Services\GeminiService;
use Illuminate\Http\Request;

class AiController extends Controller
{
    protected GeminiService $geminiService;

    public function __construct(GeminiService $geminiService)
    {
        $this->geminiService = $geminiService;
    }

    /**
     * Customer support chatbot endpoint
     */
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array',
            'history.*.role' => 'required|string|in:user,model',
            'history.*.text' => 'required|string',
        ]);

        $message = $request->input('message');
        $history = $request->input('history', []);

        // 1. Gather Catalog Context
        $products = Product::with('category')
            ->where('is_active', true)
            ->limit(15) // Limit to top/recent products to stay within reason
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'price' => '$' . number_format($p->price, 2),
                    'description' => substr($p->description, 0, 120) . '...',
                    'category' => $p->category?->name ?? 'General',
                    'stock' => $p->stock > 0 ? "In Stock ({$p->stock})" : "Out of Stock",
                ];
            });

        $catalogContext = "Store Product Catalog:\n" . json_encode($products, JSON_PRETTY_PRINT) . "\n\n";

        // 2. Gather User Context (if authenticated via Sanctum)
        $userContext = "User status: Guest User.\n";
        $user = $request->user('sanctum');

        if ($user) {
            $orders = $user->orders()->with('orderItems.product')->latest()->limit(5)->get();
            $userContext = "User status: Authenticated. Name: {$user->name}, Email: {$user->email}\n";

            if ($orders->isNotEmpty()) {
                $userContext .= "Recent Order History:\n";
                foreach ($orders as $order) {
                    $userContext .= "- Order ID: #{$order->id}, Status: {$order->status}, Total: \${$order->total_amount}, Created: {$order->created_at->toDateTimeString()}\n";
                    foreach ($order->orderItems as $item) {
                        $userContext .= "  * " . ($item->product?->name ?? 'Product') . " (Qty: {$item->quantity}, Price: \${$item->price})\n";
                    }
                }
            } else {
                $userContext .= "This user hasn't placed any orders yet.\n";
            }
        }

        // 3. Construct System Instructions
        $systemInstruction = "You are a customer support AI assistant for a premium e-commerce store. Here is the context of products available and user history:\n\n"
            . $catalogContext
            . $userContext
            . "\nInstructions:\n"
            . "1. Provide helpful, conversational, and polite replies to the user's queries.\n"
            . "2. Use the Product Catalog to suggest products. Format names in bold and specify their prices. ALWAYS link to products using `/products/{id}` path (e.g. [ProSeries Earbuds](/products/4) ) when recommending specific products!\n"
            . "3. If the user asks about order status or their history, refer to their Order History. If they are guest users, kindly ask them to register/login to track orders.\n"
            . "4. Keep replies concise and formatted in clean markdown (lists, bullet points, headers, bold text).\n"
            . "5. Do not invent products or services that are not in the catalog. If a product isn't found, offer to find matching items from our categories.";

        // 4. Construct Prompt with History
        $fullPrompt = "";
        if (!empty($history)) {
            $fullPrompt .= "Conversation History:\n";
            foreach ($history as $chat) {
                $roleName = $chat['role'] === 'user' ? 'Customer' : 'Assistant';
                $fullPrompt .= "{$roleName}: {$chat['text']}\n";
            }
        }
        $fullPrompt .= "Current Message:\nCustomer: {$message}\nAssistant:";

        $response = $this->geminiService->generateContent($fullPrompt, $systemInstruction);

        return response()->json([
            'response' => $response,
        ]);
    }

    /**
     * Get AI recommendations for a specific product
     */
    public function recommendProducts(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $productId = $request->input('product_id');
        $baseProduct = Product::with('category')->find($productId);

        $otherProducts = Product::with('category')
            ->where('id', '!=', $productId)
            ->where('is_active', true)
            ->limit(12)
            ->get();

        if ($otherProducts->isEmpty()) {
            return response()->json([]);
        }

        $candidates = $otherProducts->map(function ($p) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'category' => $p->category?->name ?? 'General',
                'description' => substr($p->description, 0, 100),
            ];
        })->toArray();

        $prompt = "Base Product: Name: '{$baseProduct->name}', Category: '" . ($baseProduct->category?->name ?? 'General') . "', Description: '" . substr($baseProduct->description, 0, 150) . "'\n\n"
            . "Candidate Products:\n" . json_encode($candidates) . "\n\n"
            . "Compare the base product with the candidate products. Pick up to 3 candidate products that are most complementary, similar, or style-matching to recommend. For each recommendation, provide the product 'id' (from candidate list) and a specific 1-sentence customer-facing 'reason' why this matches.";

        $systemInstruction = "You are a product merchandising recommendation engine. Analyze the products and return recommendations in a valid JSON format only, matching this structure: \n"
            . "{\n"
            . "  \"recommendations\": [\n"
            . "    { \"product_id\": 12, \"reason\": \"Matches this top with its similar casual summer style.\" }\n"
            . "  ]\n"
            . "}\n"
            . "Do not add any additional explanations or markdown formatting outside the JSON.";

        $aiResult = $this->geminiService->generateContent($prompt, $systemInstruction, true);

        $results = [];
        $recommendations = $aiResult['recommendations'] ?? [];

        foreach ($recommendations as $rec) {
            $targetId = $rec['product_id'] ?? null;

            // If we are in mock fallback mode (product_id is null) or ID not found, shift one from otherProducts to ensure the UI shows a real product
            if (!$targetId || !$otherProducts->contains('id', $targetId)) {
                $candidate = $otherProducts->shift();
                if ($candidate) {
                    $targetId = $candidate->id;
                }
            }

            $targetProduct = Product::with(['category', 'images'])->find($targetId);
            if ($targetProduct) {
                $results[] = [
                    'product' => [
                        'id' => $targetProduct->id,
                        'name' => $targetProduct->name,
                        'price' => (float) $targetProduct->price,
                        'category_name' => $targetProduct->category?->name ?? 'General',
                        'image' => $targetProduct->primary_image_url,
                    ],
                    'reason' => $rec['reason'] ?? 'Perfect accessory to complete your purchase.',
                ];
            }
        }

        return response()->json($results);
    }

    /**
     * Seller product builder generation tool
     */
    public function generateProductContent(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000',
        ]);

        $promptInput = $request->input('prompt');

        $categories = Category::all()->pluck('name')->toArray();
        $categoriesList = implode(', ', $categories);

        $prompt = "Generate optimized e-commerce product listings information based on keywords or short prompt: '{$promptInput}'.\n"
            . "Recommend one of these existing store categories if possible: {$categoriesList}.\n"
            . "Create a professional title, a competitive suggested price, the recommended category, an engaging HTML-formatted description outlining key features, specs, and care tips, and a list of comma-separated search/SEO tags.";

        $systemInstruction = "You are a professional e-commerce product catalog manager. Respond ONLY with a valid JSON matching this schema:\n"
            . "{\n"
            . "  \"name\": \"Optimized Title\",\n"
            . "  \"price\": 39.99,\n"
            . "  \"category_suggestion\": \"Electronics\",\n"
            . "  \"description\": \"<p>Product Description in clean HTML</p>\",\n"
            . "  \"tags\": \"tag1, tag2, tag3\"\n"
            . "}\n"
            . "Do not write any markdown outside of the JSON block.";

        $aiResult = $this->geminiService->generateContent($prompt, $systemInstruction, true);

        return response()->json($aiResult);
    }
}
