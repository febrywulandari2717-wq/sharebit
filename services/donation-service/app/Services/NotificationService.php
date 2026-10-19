<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /** Membuat notifikasi in-app. Dilewati jika pengguna mematikan notifikasi atau akun tidak ada. */
    public function notify(int $userId, string $type, string $title, ?string $body = null, ?string $link = null): ?Notification
    {
        $user = User::find($userId);
        if (! $user || ! $user->is_active || ! ($user->notify_enabled ?? true)) {
            return null;
        }

        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => mb_substr($title, 0, 150),
            'body' => $body !== null ? mb_substr($body, 0, 500) : null,
            'link' => $link,
            'created_at' => now(),
        ]);
    }
}
