<?php

return [
    'jwt' => [
        'private_key_path' => env('JWT_PRIVATE_KEY_PATH', '../../keys/jwt_private.pem'),
        'public_key_path' => env('JWT_PUBLIC_KEY_PATH', '../../keys/jwt_public.pem'),
        'issuer' => env('JWT_ISSUER', 'sharebite-identity'),
        'audience' => env('JWT_AUDIENCE', 'sharebite-api'),
        'access_ttl' => (int) env('JWT_ACCESS_TTL', 900),
        'refresh_ttl' => (int) env('JWT_REFRESH_TTL', 604800),
    ],
    'service_keys' => [
        'donation' => env('DONATION_SERVICE_KEY', 'donation-secret-key-2026'),
    ],
    'request_service_url' => env('REQUEST_SERVICE_URL', 'http://127.0.0.1:5002'),
];
