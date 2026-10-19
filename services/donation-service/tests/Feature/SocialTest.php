<?php

namespace Tests\Feature;

use App\Models\Donation;
use App\Models\Notification;
use App\Models\PointEvent;
use App\Services\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SocialTest extends TestCase
{
    use RefreshDatabase;

    private function donation($donor, $recipient, array $over = []): Donation
    {
        return Donation::create(array_merge([
            'id' => (string) Str::uuid(), 'request_id' => (string) Str::uuid(), 'food_id' => 1, 'donor_id' => $donor->id,
            'recipient_id' => $recipient->id, 'quantity' => 4, 'pickup_time' => now()->addHours(5), 'pickup_location' => 'Jl. Veteran 5',
            'status' => 'scheduled',
        ], $over));
    }

    // ---------------- favorit
    public function test_favorites_add_list_remove_without_duplicates(): void
    {
        $u = $this->makeUser('recipient');
        $h = $this->authHeader($u);
        $this->postJson('/api/v1/favorites', ['food_id' => 7, 'food_title' => 'Nasi'], $h)->assertCreated();
        $this->postJson('/api/v1/favorites', ['food_id' => 7], $h)->assertOk(); // idempoten
        $this->getJson('/api/v1/favorites', $h)->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.food_title', 'Nasi');
        $this->getJson('/api/v1/favorites/ids', $h)->assertExactJson(['data' => [7]]);
        $this->deleteJson('/api/v1/favorites/7', [], $h)->assertNoContent();
        $this->getJson('/api/v1/favorites', $h)->assertJsonPath('meta.total', 0);
    }

    public function test_favorites_are_private_per_user_and_need_login(): void
    {
        $a = $this->makeUser('recipient');
        $b = $this->makeUser('recipient');
        $this->postJson('/api/v1/favorites', ['food_id' => 3], $this->authHeader($a))->assertCreated();
        $this->getJson('/api/v1/favorites', $this->authHeader($b))->assertJsonPath('meta.total', 0);
        $this->getJson('/api/v1/favorites')->assertStatus(401);
        $this->postJson('/api/v1/favorites', ['food_id' => 0], $this->authHeader($a))->assertStatus(422);
    }

    // ---------------- notifikasi
    public function test_internal_notification_requires_service_key_and_is_scoped_to_user(): void
    {
        $u = $this->makeUser('donor');
        $other = $this->makeUser('donor');
        $payload = ['user_id' => $u->id, 'type' => 'request_new', 'title' => 'Permintaan baru', 'body' => '2 porsi', 'link' => 'dashboard-donor.html'];
        $this->postJson('/api/v1/internal/notifications', $payload)->assertStatus(401);
        $this->postJson('/api/v1/internal/notifications', $payload, ['X-Service-Key' => 'salah'])->assertStatus(401);
        $this->postJson('/api/v1/internal/notifications', $payload, ['X-Service-Key' => config('sharebite.service_keys.donation')])->assertCreated();

        $this->getJson('/api/v1/notifications/unread-count', $this->authHeader($u))->assertJsonPath('data.unread', 1);
        $this->getJson('/api/v1/notifications/unread-count', $this->authHeader($other))->assertJsonPath('data.unread', 0);
        $id = $this->getJson('/api/v1/notifications', $this->authHeader($u))->assertJsonPath('data.0.read', false)->json('data.0.id');
        $this->postJson("/api/v1/notifications/{$id}/read", [], $this->authHeader($other))->assertStatus(404);
        $this->postJson("/api/v1/notifications/{$id}/read", [], $this->authHeader($u))->assertOk()->assertJsonPath('data.read', true);
        $this->getJson('/api/v1/notifications/unread-count', $this->authHeader($u))->assertJsonPath('data.unread', 0);
    }

    public function test_read_all_and_unread_filter(): void
    {
        $u = $this->makeUser('recipient');
        Notification::create(['user_id' => $u->id, 'type' => 'x', 'title' => 'A', 'created_at' => now()]);
        Notification::create(['user_id' => $u->id, 'type' => 'x', 'title' => 'B', 'created_at' => now()]);
        $h = $this->authHeader($u);
        $this->getJson('/api/v1/notifications?unread=1', $h)->assertJsonPath('meta.total', 2);
        $this->postJson('/api/v1/notifications/read-all', [], $h)->assertJsonPath('data.updated', 2);
        $this->getJson('/api/v1/notifications?unread=1', $h)->assertJsonPath('meta.total', 0);
    }

    public function test_user_can_disable_notifications(): void
    {
        $u = $this->makeUser('recipient');
        $this->patchJson('/api/v1/auth/me', ['notify_enabled' => false], $this->authHeader($u))->assertOk()->assertJsonPath('data.notify_enabled', false);
        $this->postJson('/api/v1/internal/notifications', ['user_id' => $u->id, 'type' => 'x', 'title' => 'T'], ['X-Service-Key' => config('sharebite.service_keys.donation')])->assertOk();
        $this->assertSame(0, Notification::where('user_id', $u->id)->count());
    }

    public function test_donation_flow_creates_notifications_and_points_once(): void
    {
        $donor = $this->makeUser('donor');
        $rec = $this->makeUser('recipient');
        $mock = $this->mockRequestClient();
        $req = ['id' => (string) Str::uuid(), 'food_id' => 1, 'donor_id' => $donor->id, 'recipient_id' => $rec->id, 'quantity' => 3, 'status' => 'approved'];
        $mock->shouldReceive('getRequest')->andReturn($req);
        $mock->shouldReceive('updateStatus')->andReturn(true);
        $body = ['request_id' => $req['id'], 'pickup_time' => now()->addDay()->toIso8601ZuluString(), 'pickup_location' => 'Jl. Veteran No. 5'];
        $id = $this->postJson('/api/v1/donations', $body, $this->authHeader($donor))->assertCreated()->json('data.id');
        $this->assertSame(1, Notification::where('user_id', $rec->id)->where('type', 'donation_scheduled')->count());

        $this->postJson("/api/v1/donations/{$id}/confirm", [], $this->authHeader($donor))->assertOk();
        $this->assertSame(1, Notification::where('user_id', $rec->id)->where('type', 'donation_confirm')->count());
        $this->postJson("/api/v1/donations/{$id}/confirm", [], $this->authHeader($rec))->assertOk()->assertJsonPath('data.status', 'completed');
        $this->postJson("/api/v1/donations/{$id}/confirm", [], $this->authHeader($rec))->assertStatus(409);

        $this->assertSame(1, PointEvent::where('donation_id', $id)->count());
        $this->assertSame(13, (int) PointEvent::where('user_id', $donor->id)->sum('points')); // 10 + 3 porsi
        $this->assertSame(2, Notification::where('type', 'donation_completed')->count());
        $this->assertNotNull(Donation::find($id)->completed_at);
    }

    public function test_points_are_never_awarded_twice_for_same_donation(): void
    {
        $donor = $this->makeUser('donor');
        $d = $this->donation($donor, $this->makeUser('recipient'), ['status' => 'completed', 'completed_at' => now()]);
        $g = app(GamificationService::class);
        $this->assertTrue($g->awardForCompletedDonation($d));
        $this->assertFalse($g->awardForCompletedDonation($d));
        $this->assertSame(1, PointEvent::count());
    }

    public function test_points_not_awarded_for_unfinished_donation(): void
    {
        $d = $this->donation($this->makeUser('donor'), $this->makeUser('recipient'));
        $this->assertFalse(app(GamificationService::class)->awardForCompletedDonation($d));
    }

    public function test_pickup_reminder_command_sends_once(): void
    {
        $donor = $this->makeUser('donor');
        $rec = $this->makeUser('recipient');
        $this->donation($donor, $rec, ['pickup_time' => now()->addHours(3)]);
        $this->donation($donor, $rec, ['pickup_time' => now()->addDays(5)]); // terlalu jauh
        $this->artisan('donations:remind')->assertSuccessful();
        $this->artisan('donations:remind')->assertSuccessful();
        $this->assertSame(2, Notification::where('type', 'pickup_reminder')->count());
    }

    // ---------------- gamifikasi
    public function test_gamification_summary_badges_and_leaderboard(): void
    {
        $donor = $this->makeUser('donor', ['name' => 'Bu Siti']);
        $hidden = $this->makeUser('donor', ['name' => 'Rahasia', 'leaderboard_visible' => false]);
        $rec = $this->makeUser('recipient');
        $g = app(GamificationService::class);
        for ($i = 0; $i < 3; $i++) {
            $g->awardForCompletedDonation($this->donation($donor, $rec, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 4]));
        }
        $g->awardForCompletedDonation($this->donation($hidden, $rec, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 50]));

        $me = $this->getJson('/api/v1/me/gamification', $this->authHeader($donor))->assertOk();
        $me->assertJsonPath('data.points', 42)->assertJsonPath('data.completed_donations', 3)->assertJsonPath('data.portions_shared', 12)->assertJsonPath('data.rank', 1);
        $badges = collect($me->json('data.badges'))->keyBy('code');
        $this->assertTrue($badges['first_donor']['earned']);
        $this->assertTrue($badges['portions_10']['earned']);
        $this->assertFalse($badges['donations_10']['earned']);
        $this->assertTrue($badges['active_contributor']['earned']);

        $lb = $this->getJson('/api/v1/public/leaderboard?period=month')->assertOk()->json('data.entries');
        $this->assertCount(1, $lb); // pengguna yang menyembunyikan diri tidak tampil
        $this->assertSame('Bu Siti', $lb[0]['name']);
        $this->assertSame(42, $lb[0]['points']);
    }

    // ---------------- laporan, audit, kampanye
    public function test_report_lifecycle_with_audit_and_notification(): void
    {
        $rec = $this->makeUser('recipient');
        $admin = $this->makeUser('admin');
        $r = $this->postJson('/api/v1/reports', ['target_type' => 'food', 'target_id' => 9, 'reason' => 'spoiled', 'details' => 'Berbau'], $this->authHeader($rec))->assertCreated();
        $id = $r->json('data.id');
        $this->postJson('/api/v1/reports', ['target_type' => 'food', 'target_id' => 9, 'reason' => 'spoiled'], $this->authHeader($rec))->assertStatus(409);
        $this->getJson('/api/v1/reports', $this->authHeader($rec))->assertStatus(403);
        $this->getJson('/api/v1/reports?status=open', $this->authHeader($admin))->assertJsonPath('meta.total', 1);

        $this->patchJson("/api/v1/reports/{$id}", ['status' => 'resolved'], $this->authHeader($admin))->assertStatus(422); // catatan wajib
        $this->patchJson("/api/v1/reports/{$id}", ['status' => 'resolved', 'admin_note' => 'Makanan ditutup'], $this->authHeader($admin))->assertOk();
        $this->patchJson("/api/v1/reports/{$id}", ['status' => 'dismissed', 'admin_note' => 'lagi'], $this->authHeader($admin))->assertStatus(409);

        $this->assertSame(1, Notification::where('user_id', $rec->id)->where('type', 'report')->count());
        $logs = $this->getJson('/api/v1/audit-logs?action=report.', $this->authHeader($admin))->assertOk()->json('data');
        $this->assertSame('report.resolved', $logs[0]['action']);
        $this->getJson('/api/v1/reports/mine', $this->authHeader($rec))->assertJsonPath('data.0.admin_note', 'Makanan ditutup');
    }

    public function test_cannot_report_self_or_unknown_user(): void
    {
        $u = $this->makeUser('recipient');
        $h = $this->authHeader($u);
        $this->postJson('/api/v1/reports', ['target_type' => 'user', 'target_id' => $u->id, 'reason' => 'fraud'], $h)->assertStatus(422);
        $this->postJson('/api/v1/reports', ['target_type' => 'user', 'target_id' => 99999, 'reason' => 'fraud'], $h)->assertStatus(404);
        $this->postJson('/api/v1/reports', ['target_type' => 'food', 'target_id' => 1, 'reason' => 'ngawur'], $h)->assertStatus(422);
    }

    public function test_audit_log_is_admin_only_records_user_changes_and_hides_secrets(): void
    {
        $admin = $this->makeUser('admin');
        $user = $this->makeUser('recipient');
        $this->getJson('/api/v1/audit-logs', $this->authHeader($user))->assertStatus(403);
        $this->patchJson("/api/v1/users/{$user->id}", ['is_active' => false], $this->authHeader($admin))->assertOk();
        $this->postJson('/api/v1/internal/audit', ['action' => 'food.close', 'actor_id' => $admin->id, 'actor_role' => 'admin', 'target_type' => 'food', 'target_id' => '5',
            'meta' => ['reason' => 'laporan', 'token' => 'RAHASIA', 'password' => 'x']], ['X-Service-Key' => config('sharebite.service_keys.donation')])->assertCreated();
        $logs = $this->getJson('/api/v1/audit-logs', $this->authHeader($admin))->json('data');
        $actions = collect($logs)->pluck('action')->all();
        $this->assertContains('user.deactivate', $actions);
        $this->assertContains('food.close', $actions);
        $food = collect($logs)->firstWhere('action', 'food.close');
        $this->assertSame(['reason' => 'laporan'], $food['meta']); // token & password dibuang
    }

    public function test_campaign_crud_join_and_progress_from_real_donations(): void
    {
        $admin = $this->makeUser('admin');
        $donor = $this->makeUser('donor');
        $rec = $this->makeUser('recipient');
        $body = ['title' => 'Berbagi Ramadan', 'description' => 'Uji', 'target_portions' => 20, 'starts_at' => now()->subDay()->toIso8601ZuluString(), 'ends_at' => now()->addDays(10)->toIso8601ZuluString()];
        $this->postJson('/api/v1/campaigns', $body, $this->authHeader($donor))->assertStatus(403);
        $this->postJson('/api/v1/campaigns', array_merge($body, ['ends_at' => $body['starts_at']]), $this->authHeader($admin))->assertStatus(422);
        $cid = $this->postJson('/api/v1/campaigns', $body, $this->authHeader($admin))->assertCreated()->json('data.id');

        $this->getJson('/api/v1/public/campaigns')->assertOk()->assertJsonPath('data.0.progress.portions', 0);
        $this->postJson("/api/v1/campaigns/{$cid}/join", [], $this->authHeader($donor))->assertOk()->assertJsonPath('data.joined', true);
        $this->postJson("/api/v1/campaigns/{$cid}/join", [], $this->authHeader($donor))->assertOk(); // idempoten

        $this->donation($donor, $rec, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 5]);
        $this->donation($this->makeUser('donor'), $rec, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 99]); // bukan peserta
        $this->donation($donor, $rec, ['status' => 'scheduled', 'quantity' => 7]);                                                   // belum selesai
        $p = $this->getJson("/api/v1/campaigns/{$cid}", $this->authHeader($donor))->json('data.progress');
        $this->assertSame(5, $p['portions']);
        $this->assertSame(25, $p['percent']);
        $this->assertSame(1, $p['participants']);

        $this->patchJson("/api/v1/campaigns/{$cid}", ['status' => 'draft'], $this->authHeader($admin))->assertOk();
        $this->getJson("/api/v1/campaigns/{$cid}", $this->authHeader($donor))->assertStatus(404); // draft tersembunyi
        $this->deleteJson("/api/v1/campaigns/{$cid}/join", [], $this->authHeader($donor))->assertNoContent();
    }

    // ---------------- statistik
    public function test_public_impact_counts_only_completed_donations(): void
    {
        $d = $this->makeUser('donor');
        $r = $this->makeUser('recipient');
        $this->donation($d, $r, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 6]);
        $this->donation($d, $r, ['status' => 'scheduled', 'quantity' => 50]);
        $this->donation($d, $r, ['status' => 'cancelled', 'quantity' => 50]);
        $this->getJson('/api/v1/public/stats')->assertOk()
            ->assertJsonPath('data.completed_donations', 1)->assertJsonPath('data.portions_delivered', 6)
            ->assertJsonPath('data.active_donors', 1)->assertJsonPath('data.recipients_served', 1);
    }

    public function test_timeline_is_scoped_by_role(): void
    {
        $d1 = $this->makeUser('donor');
        $d2 = $this->makeUser('donor');
        $r = $this->makeUser('recipient');
        $admin = $this->makeUser('admin');
        $this->donation($d1, $r, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 4]);
        $this->donation($d2, $r, ['status' => 'completed', 'completed_at' => now(), 'quantity' => 9]);
        $sum = fn ($res) => collect($res->json('data.series'))->sum('portions');
        $this->assertSame(4, $sum($this->getJson('/api/v1/stats/timeline?days=7', $this->authHeader($d1))));
        $this->assertSame(13, $sum($this->getJson('/api/v1/stats/timeline?days=7', $this->authHeader($admin))));
        $res = $this->getJson('/api/v1/stats/timeline?days=7', $this->authHeader($admin));
        $this->assertCount(7, $res->json('data.series'));
        $this->assertNotNull($res->json('data.registrations'));
    }
}
