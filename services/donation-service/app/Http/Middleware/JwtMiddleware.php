<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use App\Support\ApiErrors;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    public function __construct(private JwtService $jwt) {}

    /** Pemakaian: 'jwt' (semua role) atau 'jwt:donor,admin' (role tertentu). */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $header = (string) $request->header('Authorization', '');
        if (! str_starts_with($header, 'Bearer ')) {
            return ApiErrors::response('UNAUTHENTICATED', 'Header Authorization tidak ada.', 401);
        }

        try {
            $payload = $this->jwt->decode(trim(substr($header, 7)));
        } catch (\App\Support\ApiException $e) {
            throw $e;
        } catch (\Firebase\JWT\ExpiredException $e) {
            return ApiErrors::response('UNAUTHENTICATED', 'Token kedaluwarsa.', 401);
        } catch (\Throwable $e) {
            return ApiErrors::response('UNAUTHENTICATED', 'Token tidak valid.', 401);
        }

        $user = User::find((int) ($payload['sub'] ?? 0));
        if (! $user || ! $user->is_active) {
            return ApiErrors::response('UNAUTHENTICATED', 'Akun tidak ditemukan atau dinonaktifkan.', 401);
        }

        if ($roles !== []) {
            $allowed = array_values(array_filter(array_map('trim', explode(',', implode(',', $roles)))));
            if (! in_array($user->role, $allowed, true)) {
                return ApiErrors::response('FORBIDDEN', 'Anda tidak punya akses.', 403);
            }
        }

        $request->attributes->set('user', $user);

        return $next($request);
    }
}
