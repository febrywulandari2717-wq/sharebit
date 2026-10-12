<?php

namespace Tests\Feature;

use App\Models\Donation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class DonationTest extends TestCase
{
    use RefreshDatabase;

    private function approvedRequest($donor, $recipient, string $status = 'approved'): array
    {
        return [
            'id' => (string) Str::uuid(), 'food_id' => 1, 'food_title' => 'Nasi Kotak', 'donor_id' => $donor->id,
            'recipient_id' => $recipient->id, 'quantity' => 2, 'status' => $status,
        ];
    }

    private function body(string $requestId): array
    {
        return [
            'request_id' => $requestId,
            'pickup_time' => now()->addDay()->toIso8601ZuluString(),
            'pickup_location' => 'Jl. Veteran No. 5, Gresik',
            'instructions' => 'Hubungi saya saat tiba.',
        ];
    }

    private function createDonation($donor, $recipient, $mock = null): array
    {
        $mock ??= $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->with($req['id'])->andReturn($req);
        $mock->shouldReceive('updateStatus')->andReturn(true);

        return $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))
            ->assertCreated()->json('data');
    }

    public function test_donor_schedules_donation_and_request_service_is_notified(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->with($req['id'])->andReturn($req);
        $mock->shouldReceive('updateStatus')->once()->with($req['id'], 'scheduled', \Mockery::any())->andReturn(true);

        $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))
            ->assertCreated()
            ->assertJsonPath('data.status', 'scheduled')
            ->assertJsonPath('data.recipient_id', $recipient->id)
            ->assertJsonPath('data.quantity', 2);
    }

    public function test_callback_failure_marks_sync_pending(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->andReturn($req);
        $mock->shouldReceive('updateStatus')->andReturn(false);

        $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))->assertCreated();
        $this->assertTrue(Donation::where('request_id', $req['id'])->first()->sync_pending);
    }

    public function test_recipient_cannot_create_donation(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $this->mockRequestClient();
        $this->postJson('/api/v1/donations', $this->body((string) Str::uuid()), $this->authHeader($recipient))->assertStatus(403);
    }

    public function test_other_donor_cannot_schedule(): void
    {
        $donor = $this->makeUser('donor');
        $other = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->andReturn($req);
        $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($other))->assertStatus(403);
    }

    public function test_request_must_be_approved(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient, 'pending');
        $mock->shouldReceive('getRequest')->andReturn($req);
        $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))->assertStatus(409);
    }

    public function test_unknown_request_returns_404(): void
    {
        $donor = $this->makeUser('donor');
        $mock = $this->mockRequestClient();
        $mock->shouldReceive('getRequest')->andReturn(null);
        $this->postJson('/api/v1/donations', $this->body((string) Str::uuid()), $this->authHeader($donor))->assertStatus(404);
    }

    public function test_duplicate_donation_for_same_request_is_rejected(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->andReturn($req);
        $mock->shouldReceive('updateStatus')->andReturn(true);
        $h = $this->authHeader($donor);
        $this->postJson('/api/v1/donations', $this->body($req['id']), $h)->assertCreated();
        $this->postJson('/api/v1/donations', $this->body($req['id']), $h)->assertStatus(409);
    }

    public function test_pickup_time_must_be_in_future(): void
    {
        $donor = $this->makeUser('donor');
        $this->mockRequestClient();
        $body = $this->body((string) Str::uuid());
        $body['pickup_time'] = now()->subDay()->toIso8601ZuluString();
        $this->postJson('/api/v1/donations', $body, $this->authHeader($donor))->assertStatus(422);
    }

    public function test_both_parties_must_confirm_to_complete(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->andReturn($req);
        $mock->shouldReceive('updateStatus')->with($req['id'], 'scheduled', \Mockery::any())->andReturn(true);
        $mock->shouldReceive('updateStatus')->once()->with($req['id'], 'completed', \Mockery::any())->andReturn(true);

        $id = $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))->json('data.id');

        $this->postJson("/api/v1/donations/{$id}/confirm", [], $this->authHeader($donor))
            ->assertOk()->assertJsonPath('data.status', 'scheduled');
        $this->postJson("/api/v1/donations/{$id}/confirm", [], $this->authHeader($recipient))
            ->assertOk()->assertJsonPath('data.status', 'completed');
        $this->postJson("/api/v1/donations/{$id}/confirm", [], $this->authHeader($recipient))->assertStatus(409);
    }

    public function test_outsider_cannot_see_or_confirm(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $outsider = $this->makeUser('recipient');
        $d = $this->createDonation($donor, $recipient);
        $this->getJson("/api/v1/donations/{$d['id']}", $this->authHeader($outsider))->assertStatus(404);
        $this->postJson("/api/v1/donations/{$d['id']}/confirm", [], $this->authHeader($outsider))->assertStatus(404);
        $this->getJson("/api/v1/donations/{$d['id']}", $this->authHeader($recipient))->assertOk();
    }

    public function test_cancel_requires_reason_and_notifies(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->andReturn($req);
        $mock->shouldReceive('updateStatus')->with($req['id'], 'scheduled', \Mockery::any())->andReturn(true);
        $mock->shouldReceive('updateStatus')->once()->with($req['id'], 'cancelled', 'Donor berhalangan')->andReturn(true);
        $id = $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))->json('data.id');

        $this->postJson("/api/v1/donations/{$id}/cancel", [], $this->authHeader($donor))->assertStatus(422);
        $this->postJson("/api/v1/donations/{$id}/cancel", ['reason' => 'Donor berhalangan'], $this->authHeader($donor))
            ->assertOk()->assertJsonPath('data.status', 'cancelled');
        $this->postJson("/api/v1/donations/{$id}/cancel", ['reason' => 'Sekali lagi'], $this->authHeader($donor))->assertStatus(409);
    }

    public function test_list_is_scoped_by_role_and_stats(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $other = $this->makeUser('recipient');
        $admin = $this->makeUser('admin');
        $this->createDonation($donor, $recipient);

        $this->getJson('/api/v1/donations', $this->authHeader($recipient))->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/donations', $this->authHeader($other))->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/donations', $this->authHeader($admin))->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/donations/stats', $this->authHeader($admin))->assertOk()->assertJsonPath('data.by_status.scheduled', 1);
    }

    public function test_sync_command_resends_pending(): void
    {
        $donor = $this->makeUser('donor');
        $recipient = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = $this->approvedRequest($donor, $recipient);
        $mock->shouldReceive('getRequest')->andReturn($req);
        $mock->shouldReceive('updateStatus')->once()->andReturn(false);
        $this->postJson('/api/v1/donations', $this->body($req['id']), $this->authHeader($donor))->assertCreated();

        $mock2 = $this->mockRequestClient();
        $mock2->shouldReceive('updateStatus')->once()->with($req['id'], 'scheduled', null)->andReturn(true);
        $this->artisan('donations:sync')->assertSuccessful();
        $this->assertFalse(Donation::where('request_id', $req['id'])->first()->sync_pending);
    }
}
