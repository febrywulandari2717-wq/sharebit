<?php

namespace Tests\Unit;

use App\Services\JwtService;
use Tests\TestCase;

class JwtServiceTest extends TestCase
{
    public function test_issue_and_decode(): void
    {
        $svc = new JwtService();
        $payload = $svc->decode($svc->issueAccessToken(7, 'recipient'));
        $this->assertSame('7', $payload['sub']);
        $this->assertSame('recipient', $payload['role']);
        $this->assertSame('sharebite-identity', $payload['iss']);
        $this->assertSame('sharebite-api', $payload['aud']);
    }

    public function test_token_with_wrong_issuer_is_rejected(): void
    {
        $svc = new JwtService();
        $token = $svc->issueAccessToken(1, 'donor');
        config(['sharebite.jwt.issuer' => 'orang-lain']);
        $this->expectException(\UnexpectedValueException::class);
        $svc->decode($token);
    }

    public function test_tampered_token_is_rejected(): void
    {
        $svc = new JwtService();
        $token = $svc->issueAccessToken(1, 'recipient');
        [$h, $p, $s] = explode('.', $token);
        $evil = rtrim(strtr(base64_encode(json_encode(['sub' => '1', 'role' => 'admin', 'iss' => 'sharebite-identity', 'aud' => 'sharebite-api', 'exp' => time() + 900])), '+/', '-_'), '=');
        $this->expectException(\Throwable::class);
        $svc->decode("$h.$evil.$s");
    }
}
