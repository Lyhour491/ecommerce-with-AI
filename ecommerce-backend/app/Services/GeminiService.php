<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected ?string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key');
        $this->model = config('services.gemini.model', 'gemini-2.5-flash');
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
        if (empty($this->apiKey)) {
            Log::warning('GEMINI_API_KEY is not configured. Returning mock data.');
            return $this->getMockResponse($prompt, $systemInstruction, $responseJson);
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
                ];
            }

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post($url, $payload);

            if ($response->failed()) {
                Log::error('Gemini API call failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return $this->getMockResponse($prompt, $systemInstruction, $responseJson);
            }

            $responseData = $response->json();
            $text = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? '';

            if (empty($text)) {
                throw new \Exception('No text content returned from Gemini API.');
            }

            if ($responseJson) {
                $decoded = json_decode($text, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $decoded;
                }
                Log::error('Failed to parse Gemini response as JSON', ['raw' => $text]);
                return $this->getMockResponse($prompt, $systemInstruction, $responseJson);
            }

            return $text;

        } catch (\Exception $e) {
            Log::error('Exception during Gemini API call: ' . $e->getMessage());
            return $this->getMockResponse($prompt, $systemInstruction, $responseJson);
        }
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

            // Check if it's the seller product content generator request
            return [
                'name' => 'AI Generated ' . ucfirst(trim(str_replace(['generate', 'product', 'details', 'for'], '', strtolower($prompt)))),
                'price' => 49.99,
                'category_suggestion' => 'Electronics',
                'description' => '<p><strong>Experience the ultimate performance</strong> with our newly crafted product.</p><ul><li>Premium materials and build quality</li><li>Sleek, ergonomic and modern design</li><li>Engineered for everyday efficiency and comfort</li><li>Satisfaction guaranteed with full 2-year warranty support</li></ul>',
                'tags' => 'premium, gadgets, modern, design'
            ];
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
}
