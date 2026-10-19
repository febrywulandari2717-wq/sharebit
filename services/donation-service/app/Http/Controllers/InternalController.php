<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\Request;

/** Dipanggil service lain (Request/Food) dengan X-Service-Key. */
class InternalController extends Controller
{
    public function notify(Request $request, NotificationService $notifications)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'min:1'],
            'type' => ['required', 'string', 'max:40'],
            'title' => ['required', 'string', 'max:150'],
            'body' => ['nullable', 'string', 'max:500'],
            'link' => ['nullable', 'string', 'max:200'],
        ]);
        $n = $notifications->notify($data['user_id'], $data['type'], $data['title'], $data['body'] ?? null, $data['link'] ?? null);

        return response()->json(['data' => ['created' => $n !== null]], $n ? 201 : 200);
    }

    public function audit(Request $request, AuditService $audit)
    {
        $data = $request->validate([
            'actor_id' => ['nullable', 'integer'], 'actor_role' => ['nullable', 'string', 'max:20'],
            'action' => ['required', 'string', 'max:60'], 'target_type' => ['nullable', 'string', 'max:30'],
            'target_id' => ['nullable', 'string', 'max:40'], 'meta' => ['nullable', 'array'],
        ]);
        $audit->log($data['actor_id'] ?? null, $data['actor_role'] ?? null, $data['action'], $data['target_type'] ?? null, $data['target_id'] ?? null, $data['meta'] ?? []);

        return response()->json(['data' => ['logged' => true]], 201);
    }
}
