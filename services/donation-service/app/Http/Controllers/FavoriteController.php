<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Support\ApiErrors;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->attributes->get('user');
        $perPage = min(max((int) $request->query('per_page', 12), 1), 50);
        $page = Favorite::where('user_id', $user->id)->orderByDesc('id')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($f) => ['food_id' => (int) $f->food_id, 'food_title' => $f->food_title, 'created_at' => $f->created_at?->utc()->format('Y-m-d\TH:i:s\Z')])->values(),
            'meta' => ['page' => $page->currentPage(), 'per_page' => $page->perPage(), 'total' => $page->total(), 'total_pages' => $page->lastPage()],
        ]);
    }

    public function ids(Request $request)
    {
        $user = $request->attributes->get('user');

        return response()->json(['data' => Favorite::where('user_id', $user->id)->pluck('food_id')->map(fn ($i) => (int) $i)->values()]);
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('user');
        $data = $request->validate(['food_id' => ['required', 'integer', 'min:1'], 'food_title' => ['nullable', 'string', 'max:120']]);
        // firstOrCreate + unique key: menambahkan dua kali tetap menghasilkan satu baris
        $fav = Favorite::firstOrCreate(['user_id' => $user->id, 'food_id' => $data['food_id']], ['food_title' => $data['food_title'] ?? null, 'created_at' => now()]);

        return response()->json(['data' => ['food_id' => (int) $fav->food_id, 'favorited' => true]], $fav->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, int $foodId)
    {
        $user = $request->attributes->get('user');
        Favorite::where('user_id', $user->id)->where('food_id', $foodId)->delete();

        return response()->noContent();
    }
}
