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

    /**
     * Get fallback responses for developer local testing without API Key
     */
    protected function getMockResponse(string $prompt, ?string $systemInstruction, bool $responseJson)
    {
        if ($responseJson) {
            // Check if it's the product recommendation request
            if (str_contains(strtolower($prompt), 'recommendations') || str_contains(strtolower($prompt), 'recommend')) {
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
                'description' => '<p><strong>Experience the ultimate performance</strong> with our newly crafted product.</p><ul><li>Premium materials and build quality</li><li>Sleek, ergonomic and modern design</li><li>Engineered for everyday efficiency and comfort</li><li>Satisfaction guaranteed with full 2-year warranty support</li></ul>'
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
