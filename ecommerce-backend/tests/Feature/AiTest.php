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

    public function test_public_ai_chat_endpoint(): void
    {
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

        $response->assertStatus(200)
            ->assertJsonStructure(['response']);

        $responseData = $response->json();
        $this->assertNotEmpty($responseData['response']);
    }

    public function test_public_ai_recommend_products_endpoint(): void
    {
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

        $response = $this->getJson("/api/ai/recommend-products?product_id={$product1->id}");

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
            ])
            ->assertJsonPath('category_suggestion', 'Electronics')
            ->assertJsonPath('tags', 'premium, gadgets, modern, design');
    }
}
