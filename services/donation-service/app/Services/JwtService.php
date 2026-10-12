<?php

namespace App\Services;

use App\Support\ApiErrors;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtService
{
    public function issueAccessToken(int $userId, string $role): string
    {
        $now = time();
        $payload = [
            'iss' => config('sharebite.jwt.issuer'),
            'aud' => config('sharebite.jwt.audience'),
            'sub' => (string) $userId,
            'role' => $role,
            'jti' => bin2hex(random_bytes(16)),
            'iat' => $now,
            'exp' => $now + (int) config('sharebite.jwt.access_ttl'),
        ];

        return JWT::encode($payload, $this->readKey('private_key_path'), 'RS256');
    }

    /** @return array<string,mixed> payload; melempar exception jika token tidak valid */
    public function decode(string $token): array
    {
        JWT::$leeway = 5;
        $payload = (array) JWT::decode($token, new Key($this->readKey('public_key_path'), 'RS256'));

        if (($payload['iss'] ?? null) !== config('sharebite.jwt.issuer')
            || ($payload['aud'] ?? null) !== config('sharebite.jwt.audience')) {
            throw new \UnexpectedValueException('Issuer atau audience tidak cocok.');
        }

        return $payload;
    }

    private function readKey(string $configName): string
    {
        $path = (string) config("sharebite.jwt.$configName");
        $abs = (str_starts_with($path, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $path)) ? $path : base_path($path);
        $content = is_file($abs) ? file_get_contents($abs) : false;
        if ($content === false) {
            ApiErrors::abort('INTERNAL_ERROR', 'Kunci JWT tidak ditemukan. Jalankan: node scripts/generate-keys.js', 500);
        }

        return $content;
    }
}
