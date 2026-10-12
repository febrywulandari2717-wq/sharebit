<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class ApiErrors
{
    public static function response(string $code, string $message, int $status, ?array $details = null, array $headers = []): JsonResponse
    {
        $error = ['code' => $code, 'message' => $message];
        if (! empty($details)) {
            $error['details'] = $details;
        }
        $keep = array_intersect_key($headers, array_flip(['Allow', 'Retry-After']));

        return response()->json(['error' => $error], $status, $keep);
    }

    public static function codeForStatus(int $status): string
    {
        return match ($status) {
            400 => 'BAD_REQUEST',
            401 => 'UNAUTHENTICATED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            405 => 'METHOD_NOT_ALLOWED',
            409 => 'CONFLICT',
            422 => 'VALIDATION_ERROR',
            429 => 'RATE_LIMITED',
            502 => 'UPSTREAM_ERROR',
            503 => 'UPSTREAM_UNAVAILABLE',
            504 => 'UPSTREAM_TIMEOUT',
            default => 'ERROR',
        };
    }

    public static function messageForStatus(int $status, string $fallback): string
    {
        return match ($status) {
            404 => 'Data atau endpoint tidak ditemukan.',
            405 => 'Metode HTTP tidak diizinkan untuk endpoint ini.',
            429 => 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
            default => $fallback !== '' ? $fallback : 'Terjadi kesalahan.',
        };
    }

    public static function abort(string $code, string $message, int $status, ?array $details = null): never
    {
        throw new ApiException($code, $message, $status, $details);
    }
}
