<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_lists_users(): void
    {
        $donor = $this->makeUser('donor');
        $admin = $this->makeUser('admin');
        $this->getJson('/api/v1/users', $this->authHeader($donor))->assertStatus(403);
        $this->getJson('/api/v1/users', $this->authHeader($admin))->assertOk()->assertJsonPath('meta.total', 2);
    }

    public function test_admin_deactivates_user_and_blocks_access(): void
    {
        $admin = $this->makeUser('admin');
        $user = $this->makeUser('recipient');
        $header = $this->authHeader($user);

        $this->patchJson("/api/v1/users/{$user->id}", ['is_active' => false], $this->authHeader($admin))
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/v1/auth/me', $header)->assertStatus(401);
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $admin = $this->makeUser('admin');
        $this->patchJson("/api/v1/users/{$admin->id}", ['is_active' => false], $this->authHeader($admin))->assertStatus(409);
    }

    public function test_public_profile_exposes_only_name(): void
    {
        $donor = $this->makeUser('donor', ['name' => 'Bu Siti']);
        $me = $this->makeUser('recipient');
        $this->getJson("/api/v1/users/{$donor->id}/public", $this->authHeader($me))
            ->assertOk()->assertExactJson(['data' => ['id' => $donor->id, 'name' => 'Bu Siti']]);
    }
}
