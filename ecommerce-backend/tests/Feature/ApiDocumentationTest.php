<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiDocumentationTest extends TestCase
{
    public function test_openapi_yaml_is_served(): void
    {
        $response = $this->get('/docs/openapi.yaml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/yaml; charset=UTF-8');
        $response->assertSee('openapi: 3.0.3', false);
        $response->assertSee('/login:', false);
        $response->assertSee('bearerAuth:', false);
        $response->assertSee(url('/api'), false);
    }

    public function test_swagger_ui_page_is_served(): void
    {
        $response = $this->get('/docs');

        $response->assertOk();
        $response->assertSee('MarketAI API Documentation', false);
        $response->assertSee('SwaggerUIBundle', false);
        $response->assertSee(url('/docs/openapi.yaml'), false);
    }

    public function test_api_documentation_alias_is_served(): void
    {
        $response = $this->get('/api/documentation');

        $response->assertOk();
        $response->assertSee('MarketAI API Documentation', false);
    }
}
