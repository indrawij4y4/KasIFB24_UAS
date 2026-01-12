<?php

namespace App\Http\Controllers;

use App\Models\Pemasukan;
use App\Models\User;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    /**
     * Get leaderboard of top contributors
     */
    public function index(Request $request)
    {
        // Cache for 30 seconds - short enough for near real-time, long enough for performance
        return \Illuminate\Support\Facades\Cache::remember('leaderboard', 30, function () {
            $leaderboard = User::query()
                ->leftJoin('pemasukan', 'users.id', '=', 'pemasukan.user_id')
                ->select('users.id', 'users.nim', 'users.nama')
                ->selectRaw('COALESCE(SUM(pemasukan.nominal), 0) as total_amount')
                ->selectRaw('COUNT(pemasukan.id) as payment_count')
                ->groupBy('users.id', 'users.nim', 'users.nama')
                ->orderByDesc('total_amount')
                ->limit(20)
                ->get();

            return response()->json($leaderboard->map(function ($user) {
                return [
                    'nim' => $user->nim,
                    'nama' => $user->nama,
                    'total_amount' => (float) $user->total_amount,
                    'payment_count' => (int) $user->payment_count,
                ];
            }));
        });
    }
}

