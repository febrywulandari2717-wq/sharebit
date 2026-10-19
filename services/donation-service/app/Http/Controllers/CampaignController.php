<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\CampaignParticipant;
use App\Models\Donation;
use App\Services\AuditService;
use App\Support\ApiErrors;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CampaignController extends Controller
{
    /** Kemajuan dihitung dari donasi SELESAI milik peserta (sebagai donor) pada periode kampanye. */
    public function progress(Campaign $c): array
    {
        $ids = CampaignParticipant::where('campaign_id', $c->id)->pluck('user_id');
        $portions = $ids->isEmpty() ? 0 : (int) Donation::where('status', 'completed')->whereIn('donor_id', $ids)
            ->whereBetween('completed_at', [$c->starts_at, $c->ends_at])->sum('quantity');
        $target = max(1, (int) $c->target_portions);

        return ['portions' => $portions, 'target' => (int) $c->target_portions, 'percent' => min(100, (int) floor($portions * 100 / $target)), 'participants' => $ids->count()];
    }

    public function row(Campaign $c, ?int $userId = null): array
    {
        $now = now();
        $state = $c->status === 'draft' ? 'draft' : ($c->status === 'ended' || $c->ends_at < $now ? 'ended' : ($c->starts_at > $now ? 'upcoming' : 'running'));

        return [
            'id' => $c->id, 'title' => $c->title, 'description' => $c->description, 'target_portions' => (int) $c->target_portions,
            'starts_at' => $c->starts_at->utc()->format('Y-m-d\TH:i:s\Z'), 'ends_at' => $c->ends_at->utc()->format('Y-m-d\TH:i:s\Z'),
            'status' => $c->status, 'state' => $state, 'progress' => $this->progress($c),
            'joined' => $userId ? CampaignParticipant::where('campaign_id', $c->id)->where('user_id', $userId)->exists() : false,
        ];
    }

    private function rules(bool $partial = false): array
    {
        $r = fn (array $x) => $partial ? array_merge(['sometimes'], $x) : array_merge(['required'], $x);

        return [
            'title' => $r(['string', 'min:5', 'max:150']), 'description' => ['nullable', 'string', 'max:3000'],
            'target_portions' => $r(['integer', 'min:1', 'max:1000000']), 'starts_at' => $r(['date']), 'ends_at' => $r(['date', 'after:starts_at']),
            'status' => ['sometimes', Rule::in(['draft', 'active', 'ended'])],
        ];
    }

    private function listing(Request $request, bool $publicOnly)
    {
        $q = Campaign::query();
        if ($publicOnly) {
            $q->whereIn('status', ['active', 'ended']);
        } elseif ($s = $request->query('status')) {
            $q->where('status', $s);
        }
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);
        $page = $q->orderByDesc('starts_at')->paginate($perPage);
        $uid = $request->attributes->get('user')?->id;

        return response()->json([
            'data' => collect($page->items())->map(fn ($c) => $this->row($c, $uid))->values(),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'total_pages' => $page->lastPage()],
        ]);
    }

    public function publicIndex(Request $request)
    {
        return $this->listing($request, true);
    }

    public function index(Request $request)
    {
        return $this->listing($request, $request->attributes->get('user')->role !== 'admin');
    }

    public function show(Request $request, int $id)
    {
        $c = Campaign::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
        $user = $request->attributes->get('user');
        if ($c->status === 'draft' && $user->role !== 'admin') {
            ApiErrors::abort('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
        }

        return response()->json(['data' => $this->row($c, $user->id)]);
    }

    public function store(Request $request, AuditService $audit)
    {
        $admin = $request->attributes->get('user');
        $data = $request->validate($this->rules());
        $data['starts_at'] = Carbon::parse($data['starts_at'])->utc();
        $data['ends_at'] = Carbon::parse($data['ends_at'])->utc();
        $c = Campaign::create($data + ['status' => $data['status'] ?? 'active', 'created_by' => $admin->id]);
        $audit->log($admin->id, $admin->role, 'campaign.create', 'campaign', $c->id, ['title' => $c->title], $request->ip());

        return response()->json(['data' => $this->row($c)], 201);
    }

    public function update(Request $request, int $id, AuditService $audit)
    {
        $admin = $request->attributes->get('user');
        $c = Campaign::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
        $data = $request->validate($this->rules(true));
        foreach (['starts_at', 'ends_at'] as $k) {
            if (isset($data[$k])) {
                $data[$k] = Carbon::parse($data[$k])->utc();
            }
        }
        $start = $data['starts_at'] ?? $c->starts_at;
        $end = $data['ends_at'] ?? $c->ends_at;
        if ($end <= $start) {
            ApiErrors::abort('VALIDATION_ERROR', 'Data tidak valid.', 422, ['ends_at' => ['Harus setelah tanggal mulai.']]);
        }
        $c->fill($data)->save();
        $audit->log($admin->id, $admin->role, 'campaign.update', 'campaign', $c->id, ['fields' => array_keys($data)], $request->ip());

        return response()->json(['data' => $this->row($c)]);
    }

    public function join(Request $request, int $id)
    {
        $user = $request->attributes->get('user');
        $c = Campaign::find($id) ?? ApiErrors::abort('NOT_FOUND', 'Kampanye tidak ditemukan.', 404);
        if ($c->status !== 'active' || $c->ends_at < now()) {
            ApiErrors::abort('CONFLICT', 'Kampanye tidak sedang menerima peserta.', 409);
        }
        CampaignParticipant::firstOrCreate(['campaign_id' => $c->id, 'user_id' => $user->id], ['joined_at' => now()]);

        return response()->json(['data' => $this->row($c, $user->id)]);
    }

    public function leave(Request $request, int $id)
    {
        $user = $request->attributes->get('user');
        CampaignParticipant::where('campaign_id', $id)->where('user_id', $user->id)->delete();

        return response()->noContent();
    }
}
