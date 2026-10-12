<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/** Akun demo: php artisan db:seed --class=DemoUsersSeeder */
class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            ['Bu Siti (Donor)', 'donor@sharebite.local', 'donor'],
            ['Pak Budi (Penerima)', 'penerima@sharebite.local', 'recipient'],
        ];
        foreach ($users as [$name, $email, $role]) {
            User::firstOrCreate(['email' => $email], [
                'name' => $name,
                'password_hash' => Hash::make('Rahasia123'),
                'role' => $role,
                'is_active' => true,
            ]);
        }
    }
}
