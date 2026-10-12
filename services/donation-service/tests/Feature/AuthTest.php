<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $over = []): array
    {
        return array_merge([
            'name' => 'Siti Aminah',
            'email' => 'siti@example.com',
            'password' => 'Rahasia123',
            'password_confirmation' => 'Rahasia123',
            'role' => 'recipient',
            'phone' => '081234567890',
        ], $over);
    }

    public function test_health_ok(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('data.service', 'donation');
    }

    public function test_register_success_and_password_is_hashed(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.email', 'siti@example.com')
            ->assertJsonMissingPath('data.password_hash');

        $user = User::where('email', 'siti@example.com')->first();
        $this->assertNotSame('Rahasia123', $user->password_hash);
    }

    public function test_register_validation(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload(['password' => 'pendek', 'password_confirmation' => 'pendek']))
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR')->assertJsonStructure(['error' => ['details' => ['password']]]);
        $this->postJson('/api/v1/auth/register', $this->payload(['role' => 'admin']))->assertStatus(422);
    }

    public function test_register_duplicate_email(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();
        $this->postJson('/api/v1/auth/register', $this->payload())->assertStatus(422)->assertJsonStructure(['error' => ['details' => ['email']]]);
    }

    public function test_login_returns_tokens_and_me_works(): void
    {
        $this->postJson('/api/v1/auth/register', $this->payload())->assertCreated();
        $res = $this->postJson('/api/v1/auth/login', ['email' => 'siti@example.com', 'password' => 'Rahasia123'])
            ->assertOk()->assertJsonPath('data.token_type', 'Bearer')->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'expires_in', 'user']]);

        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$res->json('data.access_token')])
            ->assertOk()->assertJsonPath('data.email', 'siti@example.com');
    }

    public function test_login_wrong_password(): void
    {
        $this->makeUser('recipient', ['email' => 'a@example.com']);
        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'salah123'])
            ->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_inactive_user_cannot_login(): void
    {
        $this->makeUser('recipient', ['email' => 'off@example.com', 'is_active' => false]);
        $this->postJson('/api/v1/auth/login', ['email' => 'off@example.com', 'password' => 'Rahasia123'])->assertStatus(403);
    }

    public function test_me_requires_valid_token(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer bukan.token.valid'])->assertStatus(401);
    }

    public function test_refresh_rotates_token(): void
    {
        $this->makeUser('recipient', ['email' => 'r@example.com']);
        $login = $this->postJson('/api/v1/auth/login', ['email' => 'r@example.com', 'password' => 'Rahasia123'])->json('data');

        $new = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $login['refresh_token']])->assertOk()->json('data');
        $this->assertNotSame($login['refresh_token'], $new['refresh_token']);
        // token lama sudah tidak berlaku
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $login['refresh_token']])->assertStatus(401);
    }

    public function test_logout_revokes_refresh_token(): void
    {
        $this->makeUser('recipient', ['email' => 'l@example.com']);
        $login = $this->postJson('/api/v1/auth/login', ['email' => 'l@example.com', 'password' => 'Rahasia123'])->json('data');
        $this->postJson('/api/v1/auth/logout', ['refresh_token' => $login['refresh_token']])->assertNoContent();
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $login['refresh_token']])->assertStatus(401);
    }

    public function test_update_profile_and_change_password(): void
    {
        $user = $this->makeUser('recipient', ['email' => 'p@example.com']);
        $h = $this->authHeader($user);
        $this->patchJson('/api/v1/auth/me', ['name' => 'Nama Baru'], $h)->assertOk()->assertJsonPath('data.name', 'Nama Baru');
        $this->patchJson('/api/v1/auth/me', ['current_password' => 'salah', 'new_password' => 'BaruBaru123'], $h)->assertStatus(422);
        $this->patchJson('/api/v1/auth/me', ['current_password' => 'Rahasia123', 'new_password' => 'BaruBaru123'], $h)->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => 'p@example.com', 'password' => 'BaruBaru123'])->assertOk();
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'x@example.com', 'password' => 'salah'])->assertStatus(401);
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'x@example.com', 'password' => 'salah'])
            ->assertStatus(429)->assertJsonPath('error.code', 'RATE_LIMITED');
    }

    public function test_unknown_route_and_wrong_method_return_json(): void
    {
        $this->getJson('/api/v1/tidak-ada')->assertStatus(404)->assertJsonPath('error.code', 'NOT_FOUND');
        $this->getJson('/api/v1/auth/login')->assertStatus(405)->assertJsonPath('error.code', 'METHOD_NOT_ALLOWED');
    }
}
