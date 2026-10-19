<?php

namespace App\Services;

use App\Models\CampaignParticipant;
use App\Models\Donation;
use App\Models\PointEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class GamificationService
{
    public const POINTS_PER_DONATION = 10;

    public const POINTS_PER_PORTION = 1;

    public function rules(): array
    {
        return [
            'donor_completed_donation' => self::POINTS_PER_DONATION,
            'donor_per_portion' => self::POINTS_PER_PORTION,
            'note' => 'Poin hanya diberikan kepada donor ketika donasi benar-benar selesai (dikonfirmasi donor dan penerima), satu kali per donasi.',
        ];
    }

    /** Memberi poin untuk donasi selesai. Idempoten berkat unique key (user, donation, type). */
    public function awardForCompletedDonation(Donation $d): bool
    {
        if ($d->status !== 'completed') {
            return false;
        }
        $points = self::POINTS_PER_DONATION + self::POINTS_PER_PORTION * (int) $d->quantity;

        return DB::table('point_events')->insertOrIgnore([
            'user_id' => $d->donor_id,
            'donation_id' => $d->id,
            'type' => 'donation_completed',
            'points' => $points,
            'portions' => (int) $d->quantity,
            'created_at' => now(),
        ]) === 1;
    }

    public function summary(User $user): array
    {
        $done = Donation::where('donor_id', $user->id)->where('status', 'completed');
        $completed = (clone $done)->count();
        $portions = (int) (clone $done)->sum('quantity');
        $recent = (clone $done)->where('completed_at', '>=', now()->subDays(30))->count();
        $points = (int) PointEvent::where('user_id', $user->id)->sum('points');
        $campaigns = CampaignParticipant::where('user_id', $user->id)->count();

        $badge = fn (string $code, string $name, string $desc, int $have, int $need) => [
            'code' => $code, 'name' => $name, 'description' => $desc,
            'earned' => $have >= $need, 'progress' => min($have, $need), 'target' => $need,
        ];
        $badges = [
            $badge('first_donor', 'Donatur Pertama', 'Menyelesaikan 1 donasi.', $completed, 1),
            $badge('portions_10', 'Berbagi 10 Porsi', 'Total 10 porsi tersalurkan.', $portions, 10),
            $badge('donations_10', 'Donasi Selesai 10 Kali', 'Menyelesaikan 10 donasi.', $completed, 10),
            $badge('active_contributor', 'Kontributor Aktif', '3 donasi selesai dalam 30 hari terakhir.', $recent, 3),
            $badge('community_partner', 'Mitra Komunitas', 'Bergabung di kampanye dan menyelesaikan donasi.', $campaigns > 0 ? $completed : 0, 1),
        ];

        $rank = null;
        if ($points > 0 && ($user->leaderboard_visible ?? true)) {
            $ahead = DB::table('point_events')->join('users', 'users.id', '=', 'point_events.user_id')
                ->where('users.leaderboard_visible', true)->where('users.is_active', true)
                ->groupBy('point_events.user_id')->select('point_events.user_id')->havingRaw('SUM(point_events.points) > ?', [$points])->get()->count();
            $rank = $ahead + 1;
        }

        return [
            'points' => $points, 'completed_donations' => $completed, 'portions_shared' => $portions,
            'rank' => $rank, 'badges' => $badges, 'rules' => $this->rules(),
        ];
    }

    public function leaderboard(string $period, int $limit = 10): array
    {
        $q = DB::table('point_events')->join('users', 'users.id', '=', 'point_events.user_id')
            ->where('users.leaderboard_visible', true)->where('users.is_active', true);
        if ($period === 'month') {
            $q->where('point_events.created_at', '>=', now()->startOfMonth());
        }
        $rows = $q->groupBy('point_events.user_id', 'users.name')
            ->selectRaw('point_events.user_id as user_id, users.name as name, SUM(point_events.points) as points, COUNT(*) as donations, SUM(point_events.portions) as portions')
            ->orderByDesc('points')->orderBy('user_id')->limit($limit)->get();

        return $rows->values()->map(fn ($r, $i) => [
            'rank' => $i + 1, 'user_id' => (int) $r->user_id, 'name' => $r->name,
            'points' => (int) $r->points, 'donations' => (int) $r->donations, 'portions' => (int) $r->portions,
        ])->all();
    }
}
