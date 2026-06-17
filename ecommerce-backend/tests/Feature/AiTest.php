<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_chat_endpoint_requires_login_and_returns_response(): void
    {
        $user = User::factory()->create(['role' => 'customer']);

        // 1. Create a product to inject into catalog context
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Home',
            'slug' => 'home',
        ]);
        $product = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Modern Lamp',
            'slug' => 'modern-lamp',
            'price' => 19.99,
            'stock' => 10,
            'is_active' => true,
        ]);

        $payload = [
            'message' => 'Hello, I want to find a lamp.',
            'history' => [
                ['role' => 'user', 'text' => 'Hi'],
                ['role' => 'model', 'text' => 'Hello, how can I help you?'],
            ]
        ];

        $response = $this->postJson('/api/ai/chat', $payload);

        $response->assertStatus(401);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/ai/chat', $payload);

        $response->assertStatus(200)
            ->assertJsonStructure(['response']);

        $responseData = $response->json();
        $this->assertNotEmpty($responseData['response']);
    }

    public function test_ai_recommend_products_endpoint_requires_login(): void
    {
        $user = User::factory()->create(['role' => 'customer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Kitchen',
            'slug' => 'kitchen',
        ]);
        
        $product1 = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Base Coffee Maker',
            'slug' => 'base-coffee-maker',
            'price' => 89.99,
            'stock' => 5,
            'is_active' => true,
        ]);

        $product2 = Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Coffee Mug Set',
            'slug' => 'coffee-mug-set',
            'price' => 15.99,
            'stock' => 15,
            'is_active' => true,
        ]);

        $this->getJson("/api/ai/recommend-products?product_id={$product1->id}")
            ->assertStatus(401);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/ai/recommend-products?product_id={$product1->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                '*' => [
                    'product' => [
                        'id',
                        'name',
                        'price',
                        'category_name',
                        'image',
                    ],
                    'reason',
                ]
            ]);
    }

    public function test_seller_ai_generate_product_content_endpoint(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
        ]);

        $payload = [
            'prompt' => 'Ergonomic mouse',
        ];

        // Should return 403 / 401 if unauthenticated
        $this->postJson('/api/seller/ai/generate-product-content', $payload)
            ->assertStatus(401);

        // Authenticated as seller
        $response = $this->actingAs($seller, 'sanctum')
            ->postJson('/api/seller/ai/generate-product-content', $payload);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'name',
                'price',
                'category_suggestion',
                'description',
                'tags',
            ]);

        $data = $response->json();
        $this->assertNotEmpty($data['category_suggestion']);
        $this->assertNotEmpty($data['tags']);
    }

    public function test_seller_ai_product_field_endpoints(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        Category::create(['name' => 'Electronics', 'slug' => 'electronics']);

        $endpoints = [
            '/api/seller/ai/product-title' => 'title',
            '/api/seller/ai/product-description' => 'description',
            '/api/seller/ai/product-category' => 'category_suggestion',
            '/api/seller/ai/product-tags' => 'tags',
            '/api/seller/ai/product-price' => 'price',
        ];

        foreach ($endpoints as $endpoint => $field) {
            $this->actingAs($seller, 'sanctum')
                ->postJson($endpoint, ['prompt' => 'Ergonomic mouse'])
                ->assertStatus(200)
                ->assertJsonStructure([$field]);
        }
    }

    public function test_seller_ai_insights_endpoint(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $category = Category::create([
            'name' => 'Home',
            'slug' => 'home',
        ]);
        Product::create([
            'user_id' => $seller->id,
            'category_id' => $category->id,
            'name' => 'Modern Lamp',
            'slug' => 'modern-lamp',
            'price' => 19.99,
            'stock' => 10,
            'is_active' => true,
        ]);

        // Should return 401 if unauthenticated
        $this->getJson('/api/seller/ai-insights')
            ->assertStatus(401);

        // Authenticated as seller
        $response = $this->actingAs($seller, 'sanctum')
            ->getJson('/api/seller/ai-insights');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'insights' => [
                    '*' => [
                        'id',
                        'title',
                        'category',
                        'desc',
                        'impact',
                        'metric',
                        'color',
                    ]
                ]
            ]);
    }
}
