<?php

use Illuminate\Support\Facades\Schedule;

// Jalankan `php artisan schedule:work` agar pengingat terkirim otomatis tiap jam.
Schedule::command('donations:remind')->hourly();
