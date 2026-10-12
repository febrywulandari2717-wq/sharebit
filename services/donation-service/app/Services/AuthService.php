<?php

namespace App\Services;

use App\Models\RefreshToken;
use App\Models\User;
use App\Support\ApiErrors;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    public function __construct(private JwtService $jwt) {}

    public function register(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'is_active' => true,
        ]);
    }

    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();
        if (! $user || ! Hash::check($password, $user->password_hash)) {
            ApiErrors::abort('INVALID_CREDENTIALS', 'Email atau password salah.', 401);
        }
        if (! $user->is_active) {
            ApiErrors::abort('FORBIDDEN', 'Akun Anda dinonaktifkan.', 403);
        }

        return $this->issueTokens($user);
    }

    public function issueTokens(User $user, ?string $replacesHash = null): array
    {
        $plain = Str::random(64);
        $hash = hash('sha256', $plain);

        RefreshToken::create([
            'user_id' => $user->id,
            'token_hash' => $hash,
            'expires_at' => now()->addSeconds((int) config('sharebite.jwt.refresh_ttl')),
            'created_at' => now(),
        ]);
        if ($replacesHash) {
            RefreshToken::where('token_hash', $replacesHash)->update(['replaced_by' => $hash]);
        }

        return [
            'token_type' => 'Bearer',
            'access_token' => $this->jwt->issueAccessToken($user->id, $user->role),
            'expires_in' => (int) config('sharebite.jwt.access_ttl'),
            'refresh_token' => $plain,
            'user' => $user->toApiArray(),
        ];
    }

    public function refresh(string $plain): array
    {
        $hash = hash('sha256', $plain);
        $record = RefreshToken::where('token_hash', $hash)->first();
        if (! $record || ! $record->isActive()) {
            ApiErrors::abort('UNAUTHENTICATED', 'Refresh token tidak valid atau sudah dipakai. Silakan login ulang.', 401);
        }
        $user = User::find($record->user_id);
        if (! $user || ! $user->is_active) {
            ApiErrors::abort('FORBIDDEN', 'Akun Anda dinonaktifkan.', 403);
        }

        // Rotasi: token lama dicabut, token baru diterbitkan
        $record->revoked_at = now();
        $record->save();

        return $this->issueTokens($user, $hash);
    }

    public function logout(string $plain): void
    {
        RefreshToken::where('token_hash', hash('sha256', $plain))->whereNull('revoked_at')->update(['revoked_at' => now()]);
    }
}
