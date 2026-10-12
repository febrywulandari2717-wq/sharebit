<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Services\RequestServiceClient;
use App\Support\ApiErrors;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DonationController extends Controller
{
    public function __construct(private RequestServiceClient $requests) {}

    private function find(string $id, $user): Donation
    {
        $donation = Donation::find($id);
        $isParty = $donation && ($donation->donor_id === $user->id || $donation->recipient_id === $user->id);
        if (! $donation || (! $isParty && $user->role !== 'admin')) {
            ApiErrors::abort('NOT_FOUND', 'Donasi tidak ditemukan.', 404); // disamarkan
        }

        return $donation;
    }

    private function sync(Donation $donation, string $status, ?string $reason): void
    {
        if (! $this->requests->updateStatus($donation->request_id, $status, $reason)) {
            $donation->sync_pending = true;
            $donation->save();
        }
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user');
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'pickup_time' => ['required', 'date', 'after:now'],
            'pickup_location' => ['required', 'string', 'min:5', 'max:255'],
            'instructions' => ['nullable', 'string', 'max:2000'],
        ]);

        $req = $this->requests->getRequest($data['request_id'])
            ?? ApiErrors::abort('NOT_FOUND', 'Permintaan tidak ditemukan.', 404);

        if ((int) $req['donor_id'] !== $user->id && $user->role !== 'admin') {
            ApiErrors::abort('FORBIDDEN', 'Anda bukan donor pemilik permintaan ini.', 403);
        }
        if ($req['status'] !== 'approved') {
            ApiErrors::abort('CONFLICT', "Permintaan harus berstatus approved (sekarang: {$req['status']}).", 409);
        }
        if (Donation::where('request_id', $data['request_id'])->exists()) {
            ApiErrors::abort('CONFLICT', 'Donasi untuk permintaan ini sudah ada.', 409);
        }

        try {
            $donation = Donation::create([
                'id' => (string) Str::uuid(),
                'request_id' => $data['request_id'],
                'food_id' => (int) $req['food_id'],
                'donor_id' => (int) $req['donor_id'],
                'recipient_id' => (int) $req['recipient_id'],
                'quantity' => (int) $req['quantity'],
                'pickup_time' => Carbon::parse($data['pickup_time'])->utc(),
                'pickup_location' => $data['pickup_location'],
                'instructions' => $data['instructions'] ?? null,
                'status' => 'scheduled',
            ]);
        } catch (QueryException $e) {
            ApiErrors::abort('CONFLICT', 'Donasi untuk permintaan ini sudah ada.', 409);
        }

        $this->sync($donation, 'scheduled', 'Donasi dijadwalkan.');

        return response()->json(['data' => $donation->fresh()->toApiArray()], 201);
    }

    public function index(Request $request)
    {
        $user = $request->attributes->get('user');
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);
        $query = Donation::query();

        if ($user->role === 'donor') {
            $query->where('donor_id', $user->id);
        } elseif ($user->role === 'recipient') {
            $query->where('recipient_id', $user->id);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        $page = $query->orderByDesc('created_at')->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($d) => $d->toApiArray())->values(),
            'meta' => [
                'page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'total_pages' => $page->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, string $id)
    {
        return response()->json(['data' => $this->find($id, $request->attributes->get('user'))->toApiArray()]);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('user');
        $donation = $this->find($id, $user);
        if ($donation->donor_id !== $user->id && $user->role !== 'admin') {
            ApiErrors::abort('FORBIDDEN', 'Hanya donor yang boleh mengubah jadwal.', 403);
        }
        if ($donation->status !== 'scheduled') {
            ApiErrors::abort('CONFLICT', 'Hanya donasi berstatus scheduled yang bisa diubah.', 409);
        }
        $data = $request->validate([
            'pickup_time' => ['sometimes', 'date', 'after:now'],
            'pickup_location' => ['sometimes', 'string', 'min:5', 'max:255'],
            'instructions' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
        if (isset($data['pickup_time'])) {
            $data['pickup_time'] = Carbon::parse($data['pickup_time'])->utc();
        }
        $donation->fill($data)->save();

        return response()->json(['data' => $donation->toApiArray()]);
    }

    public function confirm(Request $request, string $id)
    {
        $user = $request->attributes->get('user');
        $this->find($id, $user);

        $donation = DB::transaction(function () use ($id, $user) {
            $d = Donation::lockForUpdate()->find($id);
            if ($d->status !== 'scheduled') {
                ApiErrors::abort('CONFLICT', "Donasi tidak bisa dikonfirmasi (status: {$d->status}).", 409);
            }
            $isDonor = $d->donor_id === $user->id;
            $isRecipient = $d->recipient_id === $user->id;
            if (! $isDonor && ! $isRecipient) {
                ApiErrors::abort('FORBIDDEN', 'Hanya donor atau penerima yang boleh mengonfirmasi.', 403);
            }
            if ($isDonor && ! $d->donor_confirmed_at) {
                $d->donor_confirmed_at = now();
            }
            if ($isRecipient && ! $d->recipient_confirmed_at) {
                $d->recipient_confirmed_at = now();
            }
            if ($d->donor_confirmed_at && $d->recipient_confirmed_at) {
                $d->status = 'completed';
            }
            $d->save();

            return $d;
        });

        if ($donation->status === 'completed') {
            $this->sync($donation, 'completed', 'Serah terima selesai.');
        }

        return response()->json(['data' => $donation->fresh()->toApiArray()]);
    }

    public function cancel(Request $request, string $id)
    {
        $user = $request->attributes->get('user');
        $this->find($id, $user);
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']]);

        $donation = DB::transaction(function () use ($id, $user, $data) {
            $d = Donation::lockForUpdate()->find($id);
            if ($d->status !== 'scheduled') {
                ApiErrors::abort('CONFLICT', "Donasi tidak bisa dibatalkan (status: {$d->status}).", 409);
            }
            if ($d->donor_id !== $user->id && $d->recipient_id !== $user->id && $user->role !== 'admin') {
                ApiErrors::abort('FORBIDDEN', 'Anda tidak berhak membatalkan donasi ini.', 403);
            }
            $d->status = 'cancelled';
            $d->cancel_reason = $data['reason'];
            $d->save();

            return $d;
        });

        $this->sync($donation, 'cancelled', $data['reason']);

        return response()->json(['data' => $donation->fresh()->toApiArray()]);
    }

    public function stats(Request $request)
    {
        $user = $request->attributes->get('user');
        $query = Donation::query();
        if ($user->role === 'donor') {
            $query->where('donor_id', $user->id);
        } elseif ($user->role === 'recipient') {
            $query->where('recipient_id', $user->id);
        }

        $byStatus = (clone $query)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status')
            ->map(fn ($n) => (int) $n);
        $portions = (clone $query)->where('status', 'completed')->sum('quantity');

        return response()->json(['data' => [
            'total' => (int) $byStatus->sum(),
            'by_status' => $byStatus,
            'total_portions_delivered' => (int) $portions,
        ]]);
    }
}
