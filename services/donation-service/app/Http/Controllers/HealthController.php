<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function health()
    {
        try {
            DB::select('SELECT 1');
            $ok = true;
        } catch (\Throwable $e) {
            $ok = false;
        }

        return response()->json([
            'data' => ['status' => $ok ? 'ok' : 'degraded', 'service' => 'donation', 'database' => $ok ? 'up' : 'down'],
        ], $ok ? 200 : 503);
    }
}
