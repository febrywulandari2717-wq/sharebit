<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['data' => ['service' => 'donation', 'docs' => '/api/health']]);
});
