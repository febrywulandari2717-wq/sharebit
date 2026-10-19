<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('donations')) {
            return; // database lama yang sudah memiliki tabel ini
        }

        Schema::create('donations', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('request_id', 36)->unique();
            $table->unsignedBigInteger('food_id');
            $table->unsignedBigInteger('donor_id');
            $table->unsignedBigInteger('recipient_id');
            $table->unsignedInteger('quantity');
            $table->dateTime('pickup_time');
            $table->string('pickup_location', 255);
            $table->text('instructions')->nullable();
            $table->string('status', 20)->default('scheduled'); // scheduled | completed | cancelled
            $table->dateTime('donor_confirmed_at')->nullable();
            $table->dateTime('recipient_confirmed_at')->nullable();
            $table->string('cancel_reason', 255)->nullable();
            $table->boolean('sync_pending')->default(false);
            $table->timestamps();

            $table->index('donor_id');
            $table->index('recipient_id');
            $table->index('food_id');
            $table->index('status');
            $table->index('sync_pending');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
