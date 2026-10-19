<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use App\Support\ApiErrors;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    private const REASONS = ['spoiled', 'misleading', 'fraud', 'inappropriate', 'other'];

    private function row(Report $r, bool $admin = false): array
    {
        $out = [
            'id' => $r->id, 'target_type' => $r->target_type, 'target_id' => (int) $r->target_id, 'reason' => $r->reason,
            'details' => $r->details, 'status' => $r->status, 'created_at' => $r->created_at?->utc()->format('Y-m-d\TH:i:s\Z'),
        ];
        if ($admin) {
            $out += ['reporter_id' => (int) $r->reporter_id, 'admin_note' => $r->admin_note, 'handled_by' => $r->handled_by,
                'handled_at' => $r->handled_at?->utc()->format('Y-m-d\TH:i:s\Z')];
        } else {
            $out['admin_note'] = in_array($r->status, ['resolved', 'dismissed'], true) ? $r->admin_note : null;
        }

        return $out;
    }

    public function store(Request $request, AuditService $audit)
    {
        $user = $request->attributes->get('user');
        $data = $request->validate([
            'target_type' => ['required', Rule::in(['food', 'user'])],
            'target_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', Rule::in(self::REASONS)],
            'details' => ['nullable', 'string', 'max:2000'],
        ]);
        if ($data['target_type'] === 'user' && (int) $data['target_id'] === $user->id) {
            ApiErrors::abort('VALIDATION_ERROR', 'Anda tidak bisa melaporkan diri sendiri.', 422, ['target_id' => ['Tidak valid.']]);
        }
        if ($data['target_type'] === 'user' && ! User::find($data['target_id'])) {
            ApiErrors::abort('NOT_FOUND', 'Pengguna yang dilaporkan tidak ditemukan.', 404);
        }
        $dup = Report::where('reporter_id', $user->id)->where('target_type', $data['target_type'])->where('target_id', $data['target_id'])
            ->whereIn('status', ['open', 'reviewing'])->exists();
        if ($dup) {
            ApiErrors::abort('CONFLICT', 'Anda sudah melaporkan ini dan laporannya masih diproses.', 409);
        }
        $r = Report::create($data + ['reporter_id' => $user->id, 'status' => 'open']);

        return response()->json(['data' => $this->row($r)], 201);
    }

    public function mine(Request $request)
    {
        $user = $request->attributes->get('user');
        $page = Report::where('reporter_id', $user->id)->orderByDesc('id')->paginate(15);

        return response()->json([
            'data' => collect($page->items())->map(fn ($r) => $this->row($r))->values(),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'total_pages' => $page->lastPage()],
        ]);
    }

    public function index(Request $request)
    {
        $q = Report::query();
        foreach (['status', 'target_type', 'reason'] as $f) {
            if ($v = $request->query($f)) {
                $q->where($f, $v);
            }
        }
        $perPage = min(max((int) $request->query('per_page', 15), 1), 50);
        $page = $q->orderByRaw("FIELD(status,'open','reviewing','resolved','dismissed')")->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($r) => $this->row($r, true))->values(),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'total_pages' => $page->lastPage(),
                'open' => Report::whereIn('status', ['open', 'reviewing'])->count()],
        ]);
    }

    public function update(Request $request, int $id, AuditService $audit, NotificationService $notifications)
    {
        $admin = $request->attributes->get('user');
        $r = Report::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Laporan tidak ditemukan.', 404);
        $data = $request->validate([
            'status' => ['required', Rule::in(['reviewing', 'resolved', 'dismissed'])],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);
        if (in_array($r->status, ['resolved', 'dismissed'], true)) {
            ApiErrors::abort('CONFLICT', 'Laporan sudah selesai ditangani.', 409);
        }
        if (in_array($data['status'], ['resolved', 'dismissed'], true) && strlen(trim((string) ($data['admin_note'] ?? ''))) < 3) {
            ApiErrors::abort('VALIDATION_ERROR', 'Data tidak valid.', 422, ['admin_note' => ['Catatan admin wajib diisi saat menutup laporan.']]);
        }
        $before = $r->status;
        $r->fill(['status' => $data['status'], 'admin_note' => $data['admin_note'] ?? $r->admin_note, 'handled_by' => $admin->id, 'handled_at' => now()])->save();
        $audit->log($admin->id, $admin->role, 'report.'.$data['status'], 'report', $r->id, ['from' => $before, 'target' => $r->target_type.':'.$r->target_id], $request->ip());
        if (in_array($data['status'], ['resolved', 'dismissed'], true)) {
            $notifications->notify($r->reporter_id, 'report', 'Laporan Anda sudah ditangani', 'Status: '.($data['status'] === 'resolved' ? 'diselesaikan' : 'ditolak').'.', 'help.html#laporan-saya');
        }

        return response()->json(['data' => $this->row($r, true)]);
    }
}
