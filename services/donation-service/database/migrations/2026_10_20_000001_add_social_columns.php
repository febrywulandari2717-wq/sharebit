<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'notify_enabled')) {
                $table->boolean('notify_enabled')->default(true);
            }
            if (! Schema::hasColumn('users', 'leaderboard_visible')) {
                $table->boolean('leaderboard_visible')->default(true);
            }
        });
        Schema::table('donations', function (Blueprint $table) {
            if (! Schema::hasColumn('donations', 'completed_at')) {
                $table->dateTime('completed_at')->nullable();
            }
            if (! Schema::hasColumn('donations', 'reminded_at')) {
                $table->dateTime('reminded_at')->nullable();
            }
        });
        // donasi lama yang sudah selesai: isi completed_at dari updated_at agar masuk statistik
        \Illuminate\Support\Facades\DB::table('donations')->where('status', 'completed')->whereNull('completed_at')
            ->update(['completed_at' => \Illuminate\Support\Facades\DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['notify_enabled', 'leaderboard_visible']));
        Schema::table('donations', fn (Blueprint $t) => $t->dropColumn(['completed_at', 'reminded_at']));
    }
};
