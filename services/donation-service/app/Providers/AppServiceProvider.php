<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Batasi percobaan login: 10x per 15 menit untuk kombinasi IP + email
        RateLimiter::for('login', function (Request $request) {
            $key = $request->ip().'|'.strtolower((string) $request->input('email'));

            return Limit::perMinutes(15, 10)->by($key);
        });
    }
}
