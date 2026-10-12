<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [HealthController::class, 'health']);

Route::prefix('v1')->group(function () {
    // Publik
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Wajib login
    Route::middleware('jwt')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::patch('/auth/me', [AuthController::class, 'updateMe']);
        Route::get('/users/{id}/public', [UserController::class, 'publicProfile'])->whereNumber('id');

        Route::get('/donations/stats', [DonationController::class, 'stats']);
        Route::get('/donations', [DonationController::class, 'index']);
        Route::post('/donations', [DonationController::class, 'store'])->middleware('jwt:donor,admin');
        Route::get('/donations/{id}', [DonationController::class, 'show']);
        Route::patch('/donations/{id}', [DonationController::class, 'update'])->middleware('jwt:donor,admin');
        Route::post('/donations/{id}/confirm', [DonationController::class, 'confirm']);
        Route::post('/donations/{id}/cancel', [DonationController::class, 'cancel']);
    });

    // Khusus admin
    Route::middleware('jwt:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{id}', [UserController::class, 'show'])->whereNumber('id');
        Route::patch('/users/{id}', [UserController::class, 'update'])->whereNumber('id');
    });
});
