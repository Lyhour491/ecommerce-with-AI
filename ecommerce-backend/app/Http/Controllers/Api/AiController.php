<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Review;
use App\Services\Ai\ProductContentService;
use App\Services\Ai\ShoppingAssistantService;
use App\Services\GeminiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $aiResult = is_array($aiResult) ? $aiResult : [];

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

    public function generateSeoKeywords(Request $request)
    {
        $data = $request->validate(['prompt' => 'required|string|max:1000']);

        return response()->json($this->productContent->seoKeywords($data['prompt']));
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

        $productsQuery = Product::where('user_id', $sellerId);
        $productIds = (clone $productsQuery)->pluck('id');
        $products = (clone $productsQuery)->get()->map(function ($p) {
            return [
                'name' => $p->name,
                'price' => $p->price,
                'stock' => $p->stock,
                'views' => $p->views,
                'sales_count' => $p->sales_count,
                'rating_avg' => $p->rating_avg,
            ];
        })->toArray();

        $orderStats = \App\Models\OrderItem::whereIn('product_id', $productIds)
            ->selectRaw('COUNT(DISTINCT order_id) as orders_count, COALESCE(SUM(quantity), 0) as units_sold, COALESCE(SUM(quantity * price), 0) as revenue')
            ->first();

        $lowStockCount = (clone $productsQuery)->where('stock', '<=', 5)->count();
        $views = (clone $productsQuery)->sum('views');
        $reviewSentiment = $this->buildReviewSentiment($sellerId);

        $summary = [
            'revenue' => round((float) ($orderStats->revenue ?? 0), 2),
            'orders_count' => (int) ($orderStats->orders_count ?? 0),
            'units_sold' => (int) ($orderStats->units_sold ?? 0),
            'products_count' => count($products),
            'low_stock_count' => $lowStockCount,
            'views' => (int) $views,
            'conversion_rate' => $views > 0 ? round(((int) ($orderStats->units_sold ?? 0) / $views) * 100, 2) : 0,
        ];

        $prompt = "Seller Store Context:\n"
            . "Products list: " . json_encode($products) . "\n"
            . "Sales summary: " . json_encode($summary) . "\n"
            . "Review sentiment: " . json_encode($reviewSentiment) . "\n\n"
            . "Analyze the seller's catalog, sales, inventory, views, and reviews. Generate exactly 4 practical sales insights. Include listing quality, pricing, inventory, and customer feedback opportunities where relevant.";

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

        return response()->json([
            'summary' => $summary,
            'review_sentiment' => $reviewSentiment,
            'insights' => $aiResult['insights'] ?? $this->fallbackSalesInsights($summary, $reviewSentiment),
        ]);
    }

    public function reviewSentiment(Request $request)
    {
        return response()->json($this->buildReviewSentiment($request->user()->id));
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

    private function buildReviewSentiment(int $sellerId): array
    {
        $reviews = Review::with('product:id,name,user_id')
            ->whereHas('product', fn ($query) => $query->where('user_id', $sellerId))
            ->latest()
            ->limit(100)
            ->get();

        $positive = $reviews->where('rating', '>=', 4)->count();
        $neutral = $reviews->whereBetween('rating', [3, 3])->count();
        $negative = $reviews->where('rating', '<=', 2)->count();
        $total = $reviews->count();
        $average = $total ? round((float) $reviews->avg('rating'), 2) : 0;

        $comments = $reviews->pluck('comment')->filter()->take(40)->values()->all();
        $aiResult = [];

        if ($comments) {
            $aiResult = $this->geminiService->generateContent(
                "Analyze customer review sentiment for a seller. Ratings summary: positive={$positive}, neutral={$neutral}, negative={$negative}, average={$average}. Review comments: " . json_encode($comments),
                "Return ONLY valid JSON: {\"summary\":\"Short seller-facing summary\",\"top_positive\":[\"quality\"],\"top_negative\":[\"shipping\"],\"actions\":[\"Improve packaging\"]}. Keep actions practical.",
                true
            );
            $aiResult = is_array($aiResult) ? $aiResult : [];
        }

        return [
            'total_reviews' => $total,
            'average_rating' => $average,
            'positive' => $positive,
            'neutral' => $neutral,
            'negative' => $negative,
            'positive_percent' => $total ? round(($positive / $total) * 100) : 0,
            'neutral_percent' => $total ? round(($neutral / $total) * 100) : 0,
            'negative_percent' => $total ? round(($negative / $total) * 100) : 0,
            'summary' => $aiResult['summary'] ?? ($total ? 'Most customer feedback is summarized from your latest product reviews.' : 'No customer reviews yet.'),
            'top_positive' => $aiResult['top_positive'] ?? [],
            'top_negative' => $aiResult['top_negative'] ?? [],
            'actions' => $aiResult['actions'] ?? ($negative > 0 ? ['Reply to low-rating reviews and improve the most repeated complaint.'] : ['Ask recent buyers to leave reviews to improve trust.']),
        ];
    }

    private function fallbackSalesInsights(array $summary, array $sentiment): array
    {
        return [
            [
                'id' => 1,
                'title' => 'Improve conversion from product views',
                'category' => 'Conversion',
                'desc' => 'Your store has ' . $summary['views'] . ' product views and a ' . $summary['conversion_rate'] . '% view-to-sale rate.',
                'impact' => 'Refresh titles, descriptions, and SEO keywords for products with high views but low sales.',
                'metric' => 'Conversion: ' . $summary['conversion_rate'] . '%',
                'color' => 'blue',
            ],
            [
                'id' => 2,
                'title' => 'Protect inventory on selling products',
                'category' => 'Inventory',
                'desc' => $summary['low_stock_count'] . ' products are at or below 5 units.',
                'impact' => 'Restock low inventory products before traffic is wasted on unavailable items.',
                'metric' => 'Low stock: ' . $summary['low_stock_count'],
                'color' => 'orange',
            ],
            [
                'id' => 3,
                'title' => 'Use review sentiment in listing copy',
                'category' => 'Reviews',
                'desc' => 'Average review rating is ' . $sentiment['average_rating'] . ' across ' . $sentiment['total_reviews'] . ' reviews.',
                'impact' => 'Promote repeated positive themes and fix repeated negative themes in your next product update.',
                'metric' => 'Positive: ' . $sentiment['positive_percent'] . '%',
                'color' => 'green',
            ],
        ];
    }
}
