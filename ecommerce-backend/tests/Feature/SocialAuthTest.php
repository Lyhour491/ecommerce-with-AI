<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_social_login_redirect_validation(): void
    {
        $response = $this->getJson('/api/auth/invalid-provider/redirect');
        $response->assertStatus(400);
    }

    public function test_social_login_redirect_success(): void
    {
        $response = $this->getJson('/api/auth/google/redirect');
        $response->assertStatus(200);
        $response->assertJsonStructure(['url']);
        $this->assertStringContainsString('accounts.google.com', $response->json('url'));
    }

    public function test_social_login_callback_creates_new_user(): void
    {
        // Mock Socialite User
        $socialUser = $this->createMock(SocialiteUser::class);
        $socialUser->method('getId')->willReturn('123456');
        $socialUser->method('getName')->willReturn('John Doe');
        $socialUser->method('getEmail')->willReturn('john@example.com');
        $socialUser->method('getAvatar')->willReturn('http://avatar.com/john');

        // Mock Socialite Google Provider
        $providerMock = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
        $providerMock->method('stateless')->willReturnSelf();
        $providerMock->method('user')->willReturn($socialUser);

        // Instruct Socialite to return our mock provider
        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturn($providerMock);

        $response = $this->postJson('/api/auth/google/callback', ['code' => 'mock-code']);

        $response->assertStatus(200);
        $response->assertJsonStructure(['token', 'user', 'message']);
        
        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'google_id' => '123456',
            'avatar' => 'http://avatar.com/john',
        ]);
    }

    public function test_social_login_callback_logs_in_existing_user_and_links_provider(): void
    {
        // Create an existing user with same email but no google_id
        $user = User::create([
            'name' => 'John Existing',
            'email' => 'john@example.com',
            'role' => 'customer',
            'password' => bcrypt('password'),
        ]);

        $socialUser = $this->createMock(SocialiteUser::class);
        $socialUser->method('getId')->willReturn('123456');
        $socialUser->method('getName')->willReturn('John Doe');
        $socialUser->method('getEmail')->willReturn('john@example.com');
        $socialUser->method('getAvatar')->willReturn('http://avatar.com/john');

        $providerMock = $this->createMock(\Laravel\Socialite\Two\GoogleProvider::class);
        $providerMock->method('stateless')->willReturnSelf();
        $providerMock->method('user')->willReturn($socialUser);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturn($providerMock);

        $response = $this->postJson('/api/auth/google/callback', ['code' => 'mock-code']);

        $response->assertStatus(200);
        
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'email' => 'john@example.com',
            'google_id' => '123456',
        ]);
    }
}
