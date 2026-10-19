<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use App\Support\ApiErrors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function __construct(private AuthService $auth) {}

    public function register(Request $request)
    {
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'regex:/[A-Za-z]/', 'regex:/[0-9]/', 'confirmed'],
            'role' => ['required', Rule::in(['donor', 'recipient'])],
            'phone' => ['nullable', 'string', 'regex:/^[0-9]{8,15}$/'],
            'address' => ['nullable', 'string', 'max:255'],
        ], [
            'email.unique' => 'Email sudah terdaftar.',
            'password.regex' => 'Password harus mengandung huruf dan angka.',
            'password.confirmed' => 'Konfirmasi password tidak cocok.',
            'phone.regex' => 'Nomor telepon harus 8-15 digit angka.',
        ]);

        return response()->json(['data' => $this->auth->register($data)->toApiArray()], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        return response()->json(['data' => $this->auth->login(strtolower(trim($data['email'])), $data['password'])]);
    }

    public function refresh(Request $request)
    {
        $data = $request->validate(['refresh_token' => ['required', 'string']]);

        return response()->json(['data' => $this->auth->refresh($data['refresh_token'])]);
    }

    public function logout(Request $request)
    {
        $data = $request->validate(['refresh_token' => ['required', 'string']]);
        $this->auth->logout($data['refresh_token']);

        return response()->noContent();
    }

    public function me(Request $request)
    {
        return response()->json(['data' => $request->attributes->get('user')->toApiArray()]);
    }

    public function updateMe(Request $request)
    {
        $user = $request->attributes->get('user');
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:3', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'regex:/^[0-9]{8,15}$/'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'current_password' => ['required_with:new_password', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'max:100', 'regex:/[A-Za-z]/', 'regex:/[0-9]/'],
            'notify_enabled' => ['sometimes', 'boolean'],
            'leaderboard_visible' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['new_password'])) {
            if (! Hash::check($data['current_password'] ?? '', $user->password_hash)) {
                ApiErrors::abort('VALIDATION_ERROR', 'Data tidak valid.', 422, ['current_password' => ['Password lama tidak cocok.']]);
            }
            $user->password_hash = Hash::make($data['new_password']);
        }
        foreach (['name', 'phone', 'address', 'notify_enabled', 'leaderboard_visible'] as $field) {
            if (array_key_exists($field, $data)) {
                $user->{$field} = $data[$field];
            }
        }
        $user->save();

        return response()->json(['data' => $user->toApiArray()]);
    }
}
