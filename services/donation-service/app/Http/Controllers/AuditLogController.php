<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $q = AuditLog::query();
        if ($a = $request->query('action')) {
            $q->where('action', 'like', str_replace(['%', '_'], ['\\%', '\\_'], $a).'%');
        }
        if ($actor = $request->query('actor_id')) {
            $q->where('actor_id', (int) $actor);
        }
        $perPage = min(max((int) $request->query('per_page', 20), 1), 100);
        $page = $q->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($l) => [
                'id' => $l->id, 'actor_id' => $l->actor_id, 'actor_role' => $l->actor_role, 'action' => $l->action,
                'target_type' => $l->target_type, 'target_id' => $l->target_id, 'meta' => $l->meta ? json_decode($l->meta, true) : null,
                'created_at' => $l->created_at?->utc()->format('Y-m-d\TH:i:s\Z'),
            ])->values(),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'total_pages' => $page->lastPage()],
        ]);
    }
}
