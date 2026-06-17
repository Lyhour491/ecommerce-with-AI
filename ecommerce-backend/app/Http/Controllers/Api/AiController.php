<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Services\Ai\ProductContentService;
use App\Services\Ai\ShoppingAssistantService;
use App\Services\GeminiService;
use Illuminate\Http\Request;

class AiController extends Controller
{
    public function __construct(
        protected GeminiService $geminiService,
        private ShoppingAssistantService $shoppingAssistant,
        private ProductContentService $productContent,
    ) {
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

        return response()->json([
            'response' => $this->shoppingAssistant->chat($request),
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
        $baseProduct = Product::with('category')
            ->where('is_active', true)
            ->findOrFail($productId);

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

            $targetProduct = Product::with(['category', 'images'])
                ->where('is_active', true)
                ->find($targetId);
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

        return response()->json($this->productContent->draft($request->input('prompt')));
    }

    public function generateProductTitle(Request $request)
    {
        $data = $request->validate(['prompt' => 'required|string|max:1000']);

        return response()->json($this->productContent->title($data['prompt']));
    }

    public function generateProductDescription(Request $request)
    {
        $data = $request->validate(['prompt' => 'required|string|max:1000']);

        return response()->json($this->productContent->description($data['prompt']));
    }

    public function suggestProductCategory(Request $request)
    {
        $data = $request->validate(['prompt' => 'required|string|max:1000']);

        return response()->json($this->productContent->category($data['prompt']));
    }

    public function generateProductTags(Request $request)
    {
        $data = $request->validate(['prompt' => 'required|string|max:1000']);

        return response()->json($this->productContent->tags($data['prompt']));
    }

    public function suggestProductPrice(Request $request)
    {
        $data = $request->validate(['prompt' => 'required|string|max:1000']);

        return response()->json($this->productContent->price($data['prompt']));
    }

    /**
     * Generate AI financial insights for the authenticated seller
     */
    public function sellerInsights(Request $request)
    {
        $sellerId = $request->user()->id;

        // Fetch seller products and order stats to create rich context
        $products = Product::where('user_id', $sellerId)->get()->map(function ($p) {
            return [
                'name' => $p->name,
                'price' => $p->price,
                'stock' => $p->stock,
            ];
        })->toArray();

        $revenue = \App\Models\OrderItem::whereIn('product_id', function ($query) use ($sellerId) {
            $query->select('id')->from('products')->where('user_id', $sellerId);
        })->sum(\Illuminate\Support\Facades\DB::raw('quantity * price'));

        $prompt = "Seller Store Context:\n"
            . "Products list: " . json_encode($products) . "\n"
            . "Total Lifetime Revenue: $" . number_format($revenue, 2) . "\n\n"
            . "Analyze the seller's store parameters and catalog listings. Generate exactly 3 key 'financial insights' detailing optimization recommendations (e.g. inventory restock recommendations, pricing strategies, or shipping improvement tips). For each insight specify: category, title, description, impact (concrete recommendation), color scheme (blue, green, orange), and projected financial metric.";

        $systemInstruction = "You are a financial analyst AI for an e-commerce marketplace. Respond ONLY with valid JSON structure matching this schema:\n"
            . "{\n"
            . "  \"insights\": [\n"
            . "    {\n"
            . "      \"id\": 1,\n"
            . "      \"title\": \"Insight Title\",\n"
            . "      \"category\": \"Optimization Category\",\n"
            . "      \"desc\": \"Detailed analysis description...\",\n"
            . "      \"impact\": \"Actionable recommendation...\",\n"
            . "      \"metric\": \"Potential Gain: +24%\",\n"
            . "      \"color\": \"green\"\n"
            . "    }\n"
            . "  ]\n"
            . "}\n"
            . "Do not write any markdown outside of the JSON block.";

        $aiResult = $this->geminiService->generateContent($prompt, $systemInstruction, true);

        return response()->json($aiResult);
    }

    /**
     * Moderation check for pending products
     */
    public function checkProduct(Product $product)
    {
        $aiResult = $this->geminiService->checkProductSafety([
            'name' => $product->name,
            'category' => $product->category?->name ?? 'General',
            'description' => $product->description,
            'price' => $product->price,
            'tags' => $product->tags,
        ]);

        return response()->json($aiResult);
    }
}
