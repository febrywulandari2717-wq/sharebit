<?php

namespace App\Services;

use App\Support\ApiErrors;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/** Klien REST ke Request Service (endpoint internal, memakai X-Service-Key). */
class RequestServiceClient
{
    private Client $http;

    public function __construct(?Client $http = null)
    {
        $this->http = $http ?? new Client([
            'base_uri' => rtrim((string) config('sharebite.request_service_url'), '/').'/',
            'timeout' => 5.0,
            'connect_timeout' => 2.0,
            'http_errors' => false,
        ]);
    }

    /** @return array<string,mixed>|null null jika permintaan tidak ditemukan */
    public function getRequest(string $id): ?array
    {
        try {
            $res = $this->http->get("internal/v1/requests/{$id}", ['headers' => $this->headers()]);
        } catch (GuzzleException $e) {
            ApiErrors::abort('UPSTREAM_UNAVAILABLE', 'Request Service tidak dapat dihubungi.', 503);
        }
        if ($res->getStatusCode() === 404) {
            return null;
        }
        if ($res->getStatusCode() !== 200) {
            ApiErrors::abort('UPSTREAM_ERROR', 'Request Service mengembalikan kesalahan (cek DONATION_SERVICE_KEY).', 502);
        }
        $body = json_decode((string) $res->getBody(), true);

        return $body['data'] ?? null;
    }

    public function updateStatus(string $id, string $status, ?string $reason = null): bool
    {
        try {
            $res = $this->http->post("internal/v1/requests/{$id}/status", [
                'headers' => $this->headers(),
                'json' => ['status' => $status, 'reason' => $reason],
            ]);
        } catch (GuzzleException $e) {
            return false;
        }

        return $res->getStatusCode() === 200;
    }

    private function headers(): array
    {
        return [
            'X-Service-Key' => config('sharebite.service_keys.donation'),
            'Accept' => 'application/json',
        ];
    }
}
