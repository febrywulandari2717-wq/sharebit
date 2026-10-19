<?php

namespace App\Http\Middleware;

use App\Support\ApiErrors;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Endpoint internal: wajib header X-Service-Key yang cocok (perbandingan constant-time). */
class ServiceKeyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $given = (string) $request->header('X-Service-Key', '');
        $expected = (string) config('sharebite.service_keys.donation');
        if ($given === '' || ! hash_equals($expected, $given)) {
            return ApiErrors::response('UNAUTHENTICATED', 'X-Service-Key tidak valid.', 401);
        }

        return $next($request);
    }
}
