<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class GeminiService
{
    protected ?string $apiKey;
    protected string $model;
    protected string $mode;
    protected bool $allowFallback;
    protected array $lastMeta = [];

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key');
        $this->model = config('services.gemini.model', 'gemini-2.5-flash');
        $this->mode = strtolower((string) config('services.gemini.mode', 'api'));
        $this->allowFallback = (bool) config('services.gemini.allow_fallback', false);
    }

    public function status(): array
    {
        return [
            'provider' => 'gemini',
            'mode' => $this->mode,
            'model' => $this->model,
            'configured' => filled($this->apiKey),
            'using_api' => $this->mode === 'api' && filled($this->apiKey),
            'allow_fallback' => $this->allowFallback,
            'last' => $this->lastMeta,
        ];
    }

    /**
     * Generate content from Gemini API
     *
     * @param string $prompt
     * @param string|null $systemInstruction
     * @param bool $responseJson
     * @return array|string
     */
    public function generateContent(string $prompt, ?string $systemInstruction = null, bool $responseJson = false)
    {
        if ($this->mode === 'mock') {
            $this->lastMeta = ['provider' => 'mock', 'fallback' => false, 'reason' => 'mock-mode'];
            return $this->getMockResponse($prompt, $systemInstruction, $responseJson);
        }

        if (empty($this->apiKey)) {
            return $this->fallbackOrFail(
                'GEMINI_API_KEY is not configured. Add a valid Google AI Studio API key to the backend .env file.',
                $prompt,
                $systemInstruction,
                $responseJson
            );
        }

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}";

            $contents = [
                [
                    'parts' => [
                        ['text' => $prompt]
                    ]
                ]
            ];

            $payload = [
                'contents' => $contents,
            ];

            if ($systemInstruction) {
                $payload['systemInstruction'] = [
                    'parts' => [
                        ['text' => $systemInstruction]
                    ]
                ];
            }

            if ($responseJson) {
                $payload['generationConfig'] = [
                    'responseMimeType' => 'application/json',
                    'temperature' => 0.3,
                ];
            }

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])
                ->timeout(30)
                ->retry(2, 300)
                ->post($url, $payload);

            if ($response->failed()) {
                Log::error('Gemini API call failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 800),
                ]);

                return $this->fallbackOrFail(
                    "Gemini API call failed with HTTP {$response->status()}. Check GEMINI_API_KEY, GEMINI_MODEL, and API access.",
                    $prompt,
                    $systemInstruction,
                    $responseJson
                );
            }

            $responseData = $response->json();
            $text = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? '';

            if (empty($text)) {
                return $this->fallbackOrFail(
                    'Gemini API returned no text content. Try again or check model safety/settings.',
                    $prompt,
                    $systemInstruction,
                    $responseJson
                );
            }

            if ($responseJson) {
                $decoded = $this->decodeJsonResponse($text);
                if (is_array($decoded)) {
                    $this->lastMeta = ['provider' => 'gemini', 'fallback' => false, 'model' => $this->model];
                    return $decoded;
                }
                Log::error('Failed to parse Gemini response as JSON', ['raw' => substr($text, 0, 800)]);

                return $this->fallbackOrFail(
                    'Gemini returned invalid JSON for this AI action. Please retry with clearer product input.',
                    $prompt,
                    $systemInstruction,
                    $responseJson
                );
            }

            $this->lastMeta = ['provider' => 'gemini', 'fallback' => false, 'model' => $this->model];
            return $text;

        } catch (\Throwable $e) {
            Log::error('Exception during Gemini API call: ' . $e->getMessage());

            return $this->fallbackOrFail(
                'Gemini API request failed: ' . $e->getMessage(),
                $prompt,
                $systemInstruction,
                $responseJson
            );
        }
    }

    protected function fallbackOrFail(string $message, string $prompt, ?string $systemInstruction, bool $responseJson)
    {
        $this->lastMeta = [
            'provider' => $this->allowFallback ? 'mock' : 'gemini',
            'fallback' => $this->allowFallback,
            'error' => $message,
        ];

        if ($this->allowFallback) {
            Log::warning($message . ' Returning configured mock fallback.');
            return $this->getMockResponse($prompt, $systemInstruction, $responseJson);
        }

        throw new RuntimeException($message);
    }

    protected function decodeJsonResponse(string $text): ?array
    {
        $clean = trim($text);
        $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/', '', $clean);

        $decoded = json_decode($clean, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        if (preg_match('/\{.*\}/s', $clean, $matches)) {
            $decoded = json_decode($matches[0], true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
        }

        return null;
    }

    public function checkProductSafety(array $product): array
    {
        $prompt = "Product Details to Analyze:\n"
            . "Name: '" . ($product['name'] ?? '') . "'\n"
            . "Category: '" . ($product['category'] ?? 'General') . "'\n"
            . "Description: '" . ($product['description'] ?? '') . "'\n"
            . "Price: $" . ($product['price'] ?? '0') . "\n"
            . "Tags: '" . ($product['tags'] ?? '') . "'\n\n"
            . "Analyze this product list entry for a marketplace. Determine:\n"
            . "1. Is this a counterfeit/fake luxury or premium brand product? (For example, if it claims to be a brand like Apple, AirPods, Nike, Rolex, but is sold under a generic name or has a suspiciously low price or claims 'replica'/'copy').\n"
            . "2. Is this product illegal, restricted, dangerous, or violating standard marketplace policies (e.g. weapons, drugs, adult materials, hate speech, etc.)?\n"
            . "3. What is the quality of the listing description?\n\n"
            . "Generate a quality checklist and standard policy check verdict ('approved', 'flagged', or 'rejected').";

        $systemInstruction = "You are a marketplace product safety and brand protection AI auditor. Analyze the product listing and return a valid JSON object ONLY matching this schema:\n"
            . "{\n"
            . "  \"is_fake\": false,\n"
            . "  \"is_illegal\": false,\n"
            . "  \"fake_reason\": \"Reason if fake, otherwise null\",\n"
            . "  \"illegal_reason\": \"Reason if illegal, otherwise null\",\n"
            . "  \"checklist\": [\n"
            . "    { \"name\": \"Brand Authenticity\", \"passed\": true, \"details\": \"Details of analysis...\" },\n"
            . "    { \"name\": \"Legality Check\", \"passed\": true, \"details\": \"Details of analysis...\" },\n"
            . "    { \"name\": \"Description Quality\", \"passed\": true, \"details\": \"Details of analysis...\" }\n"
            . "  ],\n"
            . "  \"verdict\": \"approved\"\n"
            . "}\n"
            . "Do not write any markdown formatting or commentary outside of the JSON block.";

        $result = $this->generateContent($prompt, $systemInstruction, true);

        return is_array($result) ? $result : [
            'is_fake' => false,
            'is_illegal' => false,
            'fake_reason' => null,
            'illegal_reason' => null,
            'checklist' => [],
            'verdict' => 'flagged',
        ];
    }

    /**
     * Get fallback responses for developer local testing without API Key
     */
    protected function getMockResponse(string $prompt, ?string $systemInstruction, bool $responseJson)
    {
        if ($responseJson) {
            // Check if it's the product moderation check request
            if (str_contains(strtolower($prompt), 'analyze this product list entry') || str_contains(strtolower($prompt), 'counterfeit/fake')) {
                $productText = strtolower(explode('analyze this product list entry', strtolower($prompt))[0]);
                $isFake = str_contains($productText, 'headphones pro')
                    || str_contains($productText, 'proseries wireless headphones')
                    || str_contains($productText, 'rolex')
                    || str_contains($productText, 'replica')
                    || str_contains($productText, 'counterfeit');
                $isIllegal = str_contains($productText, 'drug')
                    || str_contains($productText, 'weapon')
                    || str_contains($productText, 'gun')
                    || str_contains($productText, 'marijuana');

                $verdict = $isIllegal ? 'rejected' : ($isFake ? 'flagged' : 'approved');

                return [
                    'is_fake' => $isFake,
                    'is_illegal' => $isIllegal,
                    'fake_reason' => $isFake ? 'Potential counterfeit item: uses name resembling brand wireless products at lower price' : null,
                    'illegal_reason' => $isIllegal ? 'Prohibited item: weapon or dangerous material detected' : null,
                    'checklist' => [
                        [
                            'name' => 'Brand Authenticity',
                            'passed' => !$isFake,
                            'details' => $isFake
                                ? 'The product listing name contains keywords typically associated with premium brands but is sold by a generic seller. High risk of counterfeit.'
                                : 'No brand infringement indicators found. Product appears generic or authentic.'
                        ],
                        [
                            'name' => 'Legality Check',
                            'passed' => !$isIllegal,
                            'details' => $isIllegal
                                ? 'Violates marketplace safety guidelines: prohibited item class.'
                                : 'Complies with safety policies. No illegal goods or dangerous materials identified.'
                        ],
                        [
                            'name' => 'Description Quality',
                            'passed' => true,
                            'details' => 'The product listing description contains adequate information, formatting, and structural specs.'
                        ]
                    ],
                    'verdict' => $verdict
                ];
            }

            // Check if it's the seller financial insights request
            if (str_contains(strtolower($prompt), 'financial insights') || str_contains(strtolower($prompt), 'seller insights')) {
                return [
                    'insights' => [
                        [
                            'id' => 1,
                            'title' => 'High Demand Recommendation',
                            'category' => 'Inventory Optimization',
                            'desc' => "Your Audio & Sound listings are experiencing high traffic. 'ProSeries Wireless Headphones' stock is currently at 48 units, which will deplete within 14 days based on weekly velocity.",
                            'impact' => 'Restock 50 additional units of ProSeries Wireless Headphones to maintain listing visibility and capture potential demand.',
                            'metric' => 'Potential Sales Loss: $4,890.00',
                            'color' => 'blue',
                        ],
                        [
                            'id' => 2,
                            'title' => 'Pricing Optimization Opportunity',
                            'category' => 'Revenue Maximization',
                            'desc' => "Competing listings for 'Carbon Fiber Travel Case' are averaging $42.00, while your listing is at $49.00. High-priced item volume has dropped by 35% compared to competitors.",
                            'impact' => 'Lower your price temporarily to $43.00 to boost weekly volume by 80% and increase overall net profit margins.',
                            'metric' => 'Predicted Profit Gain: +18%',
                            'color' => 'green',
                        ],
                        [
                            'id' => 3,
                            'title' => 'Shipping Speed Alert',
                            'category' => 'Customer Experience',
                            'desc' => 'Your store has received 2 customer complaints regarding standard delivery transit delays in Cambodia. Delivery times exceeded 5 business days.',
                            'impact' => 'Partner with premium express couriers or ship within 24 hours of payment clearance to preserve your 4.9 rating.',
                            'metric' => 'Rating Risk: Drop to 4.6',
                            'color' => 'orange',
                        ]
                    ]
                ];
            }

            // Check if it's the product recommendation request
            if (str_contains(strtolower($prompt), 'candidate products') || str_contains(strtolower($prompt), 'base product')) {
                return [
                    'recommendations' => [
                        [
                            'product_id' => null, // Will be filled dynamically by controller
                            'reason' => 'This product perfectly complements your item with its premium features.'
                        ],
                        [
                            'product_id' => null,
                            'reason' => 'Customers frequently buy this together for a complete premium setup.'
                        ],
                        [
                            'product_id' => null,
                            'reason' => 'A highly rated matching choice from the same category.'
                        ]
                    ]
                ];
            }

            if (str_contains(strtolower($prompt), 'seo keywords') || str_contains(strtolower($prompt), 'buyer-search seo')) {
                $content = $this->mockProductContent($prompt);

                return [
                    'keywords' => array_map('trim', explode(',', $content['tags'])),
                    'tags' => $content['tags'],
                ];
            }

            if (str_contains(strtolower($prompt), 'product title') || str_contains(strtolower($prompt), 'ecommerce product title')) {
                return ['title' => $this->mockProductContent($prompt)['title']];
            }

            if (str_contains(strtolower($prompt), 'product description') || str_contains(strtolower($prompt), 'ecommerce product description')) {
                return ['description' => $this->mockProductContent($prompt)['description']];
            }

            return $this->mockProductContent($prompt);
        }

        // Mock chat response
        if (str_contains(strtolower($prompt), 'hello') || str_contains(strtolower($prompt), 'hi')) {
            return "👋 Hello! I am your AI Shopping Assistant (Developer Mode).\n\nTo enable full AI power, please configure `GEMINI_API_KEY` in your `.env` file.\n\nFor now, I can help you explore simulated recommendations or tell you about mock products! Let me know what you are looking for.";
        }

        if (str_contains(strtolower($prompt), 'order')) {
            return "📦 I see you're asking about orders! In developer preview, I can confirm that your recent transactions are processing smoothly. (Once `GEMINI_API_KEY` is added, I will detail your exact items and shipping tracking details!)";
        }

        return "🤖 I received your message: \"{$prompt}\".\n\nI am currently running in **Demo Mode** since no `GEMINI_API_KEY` was found in the backend configuration. How can I help you check out our catalog today?";
    }

    private function mockProductContent(string $prompt): array
    {
        $product = $this->extractPromptValue($prompt, 'Product') ?: 'Product';
        $features = $this->extractPromptValue($prompt, 'Features');
        $featureList = $this->normalizeFeatureList($features);
        $text = strtolower($product . ' ' . implode(' ', $featureList));

        $category = match (true) {
            str_contains($text, 'iphone'),
            str_contains($text, 'ios'),
            str_contains($text, 'smartphone'),
            str_contains($text, 'phone') => 'Electronics',
            str_contains($text, 'mouse'),
            str_contains($text, 'keyboard'),
            str_contains($text, 'wireless'),
            str_contains($text, 'dpi'),
            str_contains($text, 'rgb'),
            str_contains($text, 'gaming') => 'Electronics',
            str_contains($text, 'shirt'),
            str_contains($text, 'shoe'),
            str_contains($text, 'fashion') => 'Fashion',
            str_contains($text, 'chair'),
            str_contains($text, 'desk'),
            str_contains($text, 'home') => 'Home',
            default => 'General',
        };

        $cleanProduct = $this->formatProductName($product);
        $titleParts = [];

        if ($this->isDiscontinuedPhone($text)) {
            $titleParts[] = 'Refurbished';
        } else {
            $titleParts[] = 'Premium';
        }

        if (str_contains($text, 'wireless')) {
            $titleParts[] = 'Wireless';
        }
        if (str_contains($text, 'rgb')) {
            $titleParts[] = 'RGB';
        }
        if (str_contains($text, 'gaming')) {
            $titleParts[] = 'Gaming';
        }

        $title = trim(implode(' ', array_unique($titleParts)) . ' ' . $cleanProduct);
        $title = preg_replace('/\s+/', ' ', $title);

        $benefits = $featureList ?: ['Reliable everyday performance', 'Quality build', 'Easy to use'];
        $descriptionIntro = $this->isDiscontinuedPhone($text)
            ? "{$cleanProduct} is best positioned as a used or refurbished phone for budget buyers."
            : "Experience " . strtolower($cleanProduct) . " built for practical performance and everyday reliability.";
        $description = $descriptionIntro . "\n"
            . implode("\n", array_map(fn ($feature) => '- ' . ucfirst(trim($feature)), array_slice($benefits, 0, 5)));

        $keywords = collect(array_merge(
            [$cleanProduct],
            $featureList,
            ["{$cleanProduct} {$category}", "premium {$cleanProduct}", "best {$cleanProduct}"]
        ))
            ->map(fn ($value) => strtolower(trim(preg_replace('/[^a-zA-Z0-9\s]/', ' ', $value))))
            ->filter()
            ->unique()
            ->take(10)
            ->values()
            ->all();

        $feedbackPrice = $this->extractFeedbackPrice($prompt);
        $price = $feedbackPrice ?? match (true) {
            str_contains($text, 'iphone 7 plus') => 99.00,
            str_contains($text, 'iphone 7') => 69.00,
            str_contains($text, 'iphone 8 plus') => 129.00,
            str_contains($text, 'iphone 8') => 109.00,
            str_contains($text, 'iphone x') => 179.00,
            str_contains($text, 'iphone') && (str_contains($text, 'pro max') || str_contains($text, 'promax')) => 1199.00,
            str_contains($text, 'iphone') => 899.00,
            str_contains($text, 'smartphone') || str_contains($text, 'phone') => 499.00,
            str_contains($text, 'laptop') || str_contains($text, 'macbook') => 999.00,
            str_contains($text, 'tablet') || str_contains($text, 'ipad') => 599.00,
            str_contains($text, '16000 dpi') || str_contains($text, 'gaming') => 79.99,
            str_contains($text, 'wireless') => 59.99,
            default => 49.99,
        };

        return [
            'name' => $title,
            'title' => $title,
            'price' => $price,
            'category_suggestion' => $category,
            'description' => $description,
            'tags' => implode(', ', $keywords),
        ];
    }

    private function extractPromptValue(string $prompt, string $label): string
    {
        if (preg_match('/' . preg_quote($label, '/') . ':\s*(.*?)(?:\n[A-Z][A-Za-z ]*:|\z)/s', $prompt, $matches)) {
            return trim($matches[1]);
        }

        return '';
    }

    private function normalizeFeatureList(string $features): array
    {
        return collect(preg_split('/\r?\n|,|;/', $features))
            ->map(fn ($feature) => trim(preg_replace('/^[-*•\d.)\s]+/', '', $feature)))
            ->filter()
            ->values()
            ->all();
    }

    private function formatProductName(string $product): string
    {
        $name = trim(preg_replace('/\s+/', ' ', $product));
        $name = preg_replace('/\biphone\b/i', 'iPhone', $name);
        $name = preg_replace('/\bipad\b/i', 'iPad', $name);
        $name = preg_replace('/\bmacbook\b/i', 'MacBook', $name);
        $name = preg_replace('/\bpromax\b/i', 'Pro Max', $name);
        $name = preg_replace('/\bpro max\b/i', 'Pro Max', $name);

        return trim($name);
    }

    private function extractFeedbackPrice(string $prompt): ?float
    {
        $feedback = $this->extractPromptValue($prompt, 'Seller feedback from previous AI result');
        if ($feedback === '') {
            return null;
        }

        if (preg_match_all('/\\$?([0-9]+(?:\\.[0-9]{1,2})?)/', $feedback, $matches) && count($matches[1]) > 0) {
            $values = array_map('floatval', $matches[1]);

            return round(array_sum($values) / count($values), 2);
        }

        return null;
    }

    private function isDiscontinuedPhone(string $text): bool
    {
        return str_contains($text, 'iphone 7')
            || str_contains($text, 'iphone 8')
            || str_contains($text, 'iphone x')
            || str_contains($text, 'used')
            || str_contains($text, 'refurbished');
    }
}
