<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\DonationController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\GamificationController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\InternalController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [HealthController::class, 'health']);

Route::prefix('v1')->group(function () {
    // Publik (tanpa login)
    Route::get('/public/stats', [StatsController::class, 'publicImpact']);
    Route::get('/public/campaigns', [CampaignController::class, 'publicIndex']);
    Route::get('/public/leaderboard', [GamificationController::class, 'leaderboard']);

    // Internal antar-service (X-Service-Key)
    Route::middleware('service.key')->prefix('internal')->group(function () {
        Route::post('/notifications', [InternalController::class, 'notify']);
        Route::post('/audit', [InternalController::class, 'audit']);
    });

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

        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::get('/favorites/ids', [FavoriteController::class, 'ids']);
        Route::post('/favorites', [FavoriteController::class, 'store']);
        Route::delete('/favorites/{foodId}', [FavoriteController::class, 'destroy'])->whereNumber('foodId');

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'read'])->whereNumber('id');

        Route::post('/reports', [ReportController::class, 'store']);
        Route::get('/reports/mine', [ReportController::class, 'mine']);

        Route::get('/campaigns', [CampaignController::class, 'index']);
        Route::get('/campaigns/{id}', [CampaignController::class, 'show'])->whereNumber('id');
        Route::post('/campaigns/{id}/join', [CampaignController::class, 'join'])->whereNumber('id');
        Route::delete('/campaigns/{id}/join', [CampaignController::class, 'leave'])->whereNumber('id');

        Route::get('/me/gamification', [GamificationController::class, 'me']);
        Route::get('/stats/timeline', [StatsController::class, 'timeline']);

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
        Route::get('/reports', [ReportController::class, 'index']);
        Route::patch('/reports/{id}', [ReportController::class, 'update'])->whereNumber('id');
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::post('/campaigns', [CampaignController::class, 'store']);
        Route::patch('/campaigns/{id}', [CampaignController::class, 'update'])->whereNumber('id');
    });
});
