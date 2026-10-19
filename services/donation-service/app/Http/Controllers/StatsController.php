<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /** Statistik dampak publik; seluruhnya dihitung dari data donasi yang benar-benar selesai. */
    public function publicImpact()
    {
        $done = Donation::where('status', 'completed');

        return response()->json(['data' => [
            'completed_donations' => (clone $done)->count(),
            'portions_delivered' => (int) (clone $done)->sum('quantity'),
            'active_donors' => (clone $done)->distinct('donor_id')->count('donor_id'),
            'recipients_served' => (clone $done)->distinct('recipient_id')->count('recipient_id'),
            'members' => User::where('is_active', true)->where('role', '!=', 'admin')->count(),
        ]]);
    }

    /** Deret harian N hari terakhir (maks 90), dibatasi sesuai peran. */
    public function timeline(Request $request)
    {
        $user = $request->attributes->get('user');
        $days = min(max((int) $request->query('days', 14), 1), 90);
        $from = now()->subDays($days - 1)->startOfDay();

        $scope = fn ($q) => $user->role === 'donor' ? $q->where('donor_id', $user->id) : ($user->role === 'recipient' ? $q->where('recipient_id', $user->id) : $q);
        $created = $scope(Donation::query())->where('created_at', '>=', $from)
            ->selectRaw('DATE(created_at) d, COUNT(*) n')->groupBy('d')->pluck('n', 'd');
        $completed = $scope(Donation::query())->where('status', 'completed')->where('completed_at', '>=', $from)
            ->selectRaw('DATE(completed_at) d, COUNT(*) n, SUM(quantity) p')->groupBy('d')->get()->keyBy('d');

        $series = [];
        for ($i = 0; $i < $days; $i++) {
            $d = $from->copy()->addDays($i)->format('Y-m-d');
            $series[] = ['date' => $d, 'scheduled' => (int) ($created[$d] ?? 0), 'completed' => (int) ($completed[$d]->n ?? 0), 'portions' => (int) ($completed[$d]->p ?? 0)];
        }
        $out = ['days' => $days, 'unit' => 'donasi per hari (UTC)', 'series' => $series];
        if ($user->role === 'admin') {
            $reg = User::where('created_at', '>=', $from)->selectRaw('DATE(created_at) d, COUNT(*) n')->groupBy('d')->pluck('n', 'd');
            $out['registrations'] = collect($series)->map(fn ($s) => ['date' => $s['date'], 'users' => (int) ($reg[$s['date']] ?? 0)])->all();
        }

        return response()->json(['data' => $out]);
    }
}
