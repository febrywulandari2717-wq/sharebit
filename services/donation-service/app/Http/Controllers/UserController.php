<?php

namespace App\Http\Controllers;

use App\Models\RefreshToken;
use App\Models\User;
use App\Services\AuditService;
use App\Support\ApiErrors;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max((int) $request->query('per_page', 20), 1), 50);
        $query = User::query();

        if ($q = trim((string) $request->query('q', ''))) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $q).'%';
            $query->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like));
        }
        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }
        $isActive = $request->query('is_active');
        if ($isActive !== null && $isActive !== '') {
            $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
        }

        $page = $query->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($u) => $u->toApiArray())->values(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'total_pages' => $page->lastPage(),
            ],
        ]);
    }

    public function show(int $id)
    {
        $user = User::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Pengguna tidak ditemukan.', 404);

        return response()->json(['data' => $user->toApiArray()]);
    }

    /** Info minimal pengguna (untuk menampilkan nama donor/penerima). */
    public function publicProfile(int $id)
    {
        $user = User::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Pengguna tidak ditemukan.', 404);

        return response()->json(['data' => ['id' => $user->id, 'name' => $user->name]]);
    }

    public function update(Request $request, int $id, AuditService $audit)
    {
        $me = $request->attributes->get('user');
        $user = User::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Pengguna tidak ditemukan.', 404);

        $data = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', Rule::in(['donor', 'recipient', 'admin'])],
        ]);

        if ($user->id === $me->id) {
            if (($data['is_active'] ?? true) === false) {
                ApiErrors::abort('CONFLICT', 'Admin tidak bisa menonaktifkan dirinya sendiri.', 409);
            }
            if (isset($data['role']) && $data['role'] !== 'admin') {
                ApiErrors::abort('CONFLICT', 'Admin tidak bisa mengubah role dirinya sendiri.', 409);
            }
        }

        if (array_key_exists('is_active', $data)) {
            $user->is_active = (bool) $data['is_active'];
            if (! $user->is_active) {
                RefreshToken::where('user_id', $user->id)->whereNull('revoked_at')->update(['revoked_at' => now()]);
            }
        }
        $oldRole = $user->role;
        if (isset($data['role'])) {
            $user->role = $data['role'];
        }
        $wasChanged = $user->isDirty(['is_active', 'role']);
        $user->save();
        if ($wasChanged) {
            if (array_key_exists('is_active', $data)) {
                $audit->log($me->id, $me->role, $user->is_active ? 'user.activate' : 'user.deactivate', 'user', $user->id, ['email' => $user->email], $request->ip());
            }
            if (isset($data['role']) && $oldRole !== $user->role) {
                $audit->log($me->id, $me->role, 'user.role_change', 'user', $user->id, ['from' => $oldRole, 'to' => $user->role], $request->ip());
            }
        }

        return response()->json(['data' => $user->toApiArray()]);
    }
}
