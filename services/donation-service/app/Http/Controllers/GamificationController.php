<?php

namespace App\Http\Controllers;

use App\Services\GamificationService;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(private GamificationService $game) {}

    public function me(Request $request)
    {
        return response()->json(['data' => $this->game->summary($request->attributes->get('user'))]);
    }

    public function leaderboard(Request $request)
    {
        $period = $request->query('period') === 'month' ? 'month' : 'all';

        return response()->json(['data' => [
            'period' => $period,
            'entries' => $this->game->leaderboard($period, min(max((int) $request->query('limit', 10), 1), 50)),
            'rules' => $this->game->rules(),
            'privacy' => 'Hanya nama dan poin pengguna yang mengizinkan tampil di papan peringkat; dapat diubah di Pengaturan.',
        ]]);
    }
}
