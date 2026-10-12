<?php

namespace Tests;

use App\Models\User;
use App\Services\JwtService;
use App\Services\RequestServiceClient;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;
use Mockery\MockInterface;

abstract class TestCase extends BaseTestCase
{
    private static ?string $keyDir = null;

    protected function setUp(): void
    {
        parent::setUp();

        // Kunci JWT sementara khusus pengujian (tidak menyentuh folder keys/)
        if (self::$keyDir === null) {
            self::$keyDir = sys_get_temp_dir().'/sharebite-donation-test-'.bin2hex(random_bytes(4));
            mkdir(self::$keyDir);
            $res = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
            openssl_pkey_export($res, $private);
            file_put_contents(self::$keyDir.'/private.pem', $private);
            file_put_contents(self::$keyDir.'/public.pem', openssl_pkey_get_details($res)['key']);
        }
        config([
            'sharebite.jwt.private_key_path' => self::$keyDir.'/private.pem',
            'sharebite.jwt.public_key_path' => self::$keyDir.'/public.pem',
        ]);
    }

    protected function makeUser(string $role = 'recipient', array $over = []): User
    {
        static $n = 0;
        $n++;

        return User::create(array_merge([
            'name' => "Pengguna {$n}",
            'email' => "user{$n}-".bin2hex(random_bytes(3))."@example.com",
            'password_hash' => Hash::make('Rahasia123'),
            'role' => $role,
            'is_active' => true,
        ], $over));
    }

    protected function authHeader(User $user): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccessToken($user->id, $user->role)];
    }

    /** Ganti klien Request Service dengan mock. */
    protected function mockRequestClient(): MockInterface
    {
        $mock = \Mockery::mock(RequestServiceClient::class);
        $this->app->instance(RequestServiceClient::class, $mock);

        return $mock;
    }
}
