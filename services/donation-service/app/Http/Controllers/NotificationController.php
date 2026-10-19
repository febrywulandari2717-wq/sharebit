<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Support\ApiErrors;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    private function row(Notification $n): array
    {
        return [
            'id' => $n->id, 'type' => $n->type, 'title' => $n->title, 'body' => $n->body, 'link' => $n->link,
            'read' => $n->read_at !== null, 'created_at' => $n->created_at?->utc()->format('Y-m-d\TH:i:s\Z'),
        ];
    }

    public function index(Request $request)
    {
        $user = $request->attributes->get('user');
        $perPage = min(max((int) $request->query('per_page', 15), 1), 50);
        $q = Notification::where('user_id', $user->id);
        if (filter_var($request->query('unread'), FILTER_VALIDATE_BOOLEAN)) {
            $q->whereNull('read_at');
        }
        $page = $q->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($n) => $this->row($n))->values(),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'total_pages' => $page->lastPage()],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->attributes->get('user');

        return response()->json(['data' => ['unread' => Notification::where('user_id', $user->id)->whereNull('read_at')->count()]]);
    }

    public function read(Request $request, int $id)
    {
        $user = $request->attributes->get('user');
        $n = Notification::where('user_id', $user->id)->find($id) ?? ApiErrors::abort('NOT_FOUND', 'Notifikasi tidak ditemukan.', 404);
        if (! $n->read_at) {
            $n->read_at = now();
            $n->save();
        }

        return response()->json(['data' => $this->row($n)]);
    }

    public function readAll(Request $request)
    {
        $user = $request->attributes->get('user');
        $n = Notification::where('user_id', $user->id)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['data' => ['updated' => $n]]);
    }
}
