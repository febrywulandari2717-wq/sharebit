<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditService
{
    private const SECRET_KEYS = ['password', 'password_hash', 'token', 'access_token', 'refresh_token', 'secret', 'authorization', 'key'];

    /** Mencatat aksi penting. Data sensitif otomatis dibuang dari meta. */
    public function log(?int $actorId, ?string $actorRole, string $action, ?string $targetType = null, $targetId = null, array $meta = [], ?string $ip = null): AuditLog
    {
        return AuditLog::create([
            'actor_id' => $actorId,
            'actor_role' => $actorRole,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId !== null ? (string) $targetId : null,
            'meta' => $meta ? json_encode($this->scrub($meta), JSON_UNESCAPED_UNICODE) : null,
            'ip' => $ip,
            'created_at' => now(),
        ]);
    }

    private function scrub(array $meta): array
    {
        foreach ($meta as $k => $v) {
            if (in_array(strtolower((string) $k), self::SECRET_KEYS, true)) {
                unset($meta[$k]);
            } elseif (is_array($v)) {
                $meta[$k] = $this->scrub($v);
            }
        }

        return $meta;
    }
}
