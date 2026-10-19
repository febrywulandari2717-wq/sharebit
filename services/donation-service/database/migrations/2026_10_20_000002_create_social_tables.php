<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('favorites')) {
            Schema::create('favorites', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->unsignedBigInteger('user_id');
                $t->unsignedBigInteger('food_id');
                $t->string('food_title', 120)->nullable();
                $t->dateTime('created_at')->nullable();
                $t->unique(['user_id', 'food_id']);
            });
        }
        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->unsignedBigInteger('user_id');
                $t->string('type', 40);
                $t->string('title', 150);
                $t->string('body', 500)->nullable();
                $t->string('link', 200)->nullable();
                $t->dateTime('read_at')->nullable();
                $t->dateTime('created_at')->nullable();
                $t->index(['user_id', 'read_at']);
                $t->index(['user_id', 'id']);
            });
        }
        if (! Schema::hasTable('reports')) {
            Schema::create('reports', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->unsignedBigInteger('reporter_id');
                $t->string('target_type', 10); // food | user
                $t->unsignedBigInteger('target_id');
                $t->string('reason', 30);
                $t->text('details')->nullable();
                $t->string('status', 15)->default('open'); // open | reviewing | resolved | dismissed
                $t->text('admin_note')->nullable();
                $t->unsignedBigInteger('handled_by')->nullable();
                $t->dateTime('handled_at')->nullable();
                $t->timestamps();
                $t->index('status');
                $t->index(['target_type', 'target_id']);
            });
        }
        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->unsignedBigInteger('actor_id')->nullable();
                $t->string('actor_role', 20)->nullable();
                $t->string('action', 60);
                $t->string('target_type', 30)->nullable();
                $t->string('target_id', 40)->nullable();
                $t->text('meta')->nullable();
                $t->string('ip', 45)->nullable();
                $t->dateTime('created_at')->nullable();
                $t->index('action');
                $t->index('actor_id');
            });
        }
        if (! Schema::hasTable('campaigns')) {
            Schema::create('campaigns', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->string('title', 150);
                $t->text('description')->nullable();
                $t->unsignedInteger('target_portions');
                $t->dateTime('starts_at');
                $t->dateTime('ends_at');
                $t->string('status', 10)->default('active'); // draft | active | ended
                $t->unsignedBigInteger('created_by');
                $t->timestamps();
                $t->index('status');
            });
        }
        if (! Schema::hasTable('campaign_participants')) {
            Schema::create('campaign_participants', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->unsignedBigInteger('campaign_id');
                $t->unsignedBigInteger('user_id');
                $t->dateTime('joined_at')->nullable();
                $t->unique(['campaign_id', 'user_id']);
            });
        }
        if (! Schema::hasTable('point_events')) {
            Schema::create('point_events', function (Blueprint $t) {
                $t->bigIncrements('id');
                $t->unsignedBigInteger('user_id');
                $t->char('donation_id', 36);
                $t->string('type', 30);
                $t->integer('points');
                $t->unsignedInteger('portions')->default(0);
                $t->dateTime('created_at')->nullable();
                $t->unique(['user_id', 'donation_id', 'type']); // mencegah poin ganda untuk transaksi yang sama
                $t->index('created_at');
            });
        }
    }

    public function down(): void
    {
        foreach (['point_events', 'campaign_participants', 'campaigns', 'audit_logs', 'reports', 'notifications', 'favorites'] as $t) {
            Schema::dropIfExists($t);
        }
    }
};
