<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(['email' => env('ADMIN_EMAIL', 'admin@sharebite.local')], [
            'name' => 'Admin ShareBite',
            'password_hash' => Hash::make(env('ADMIN_PASSWORD', 'Admin12345')),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }
}
