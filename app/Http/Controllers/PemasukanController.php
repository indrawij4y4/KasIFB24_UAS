<?php

namespace App\Http\Controllers;

use App\Models\Pemasukan;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PemasukanController extends Controller
{
    /**
     * Get all pemasukan with optional period filter
     */
    public function index(Request $request)
    {
        $query = Pemasukan::with('user:id,nim,nama')
            ->orderBy('created_at', 'desc');

        // Apply period filter if provided
        if ($request->has('bulan') && $request->has('tahun')) {
            $query->where('bulan', $request->bulan)
                ->where('tahun', $request->tahun);
        }

        $pemasukan = $query->get();

        // Format response with detailed info
        $formatted = $pemasukan->map(function ($p) {
            return [
                'id' => $p->id,
                'user_id' => $p->user_id,
                'nama' => $p->user->nama ?? 'Unknown',
                'nim' => $p->user->nim ?? '-',
                'bulan' => $p->bulan,
                'tahun' => $p->tahun,
                'minggu_ke' => $p->minggu_ke,
                'nominal' => (float) $p->nominal,
                'tanggal' => $p->created_at ? $p->created_at->format('Y-m-d') : null,
                'created_at' => $p->created_at,
            ];
        });

        return response()->json(['data' => $formatted]);
    }

    /**
     * Get payment matrix for a specific month/year
     */
    public function matrix(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2099',
        ]);

        $bulan = $request->bulan;
        $tahun = $request->tahun;

        // Get all users (including admin) with their payments for this period
        $users = User::query()
            ->with([
                'pemasukan' => function ($query) use ($bulan, $tahun) {
                    $query->where('bulan', $bulan)->where('tahun', $tahun);
                }
            ])
            ->orderBy('nama')
            ->get();


        $matrix = $users->map(function ($user) {
            // Group by minggu_ke and sum amounts to handle multiple payments per week
            $payments = $user->pemasukan->groupBy('minggu_ke')->map(function ($group) {
                return $group->sum('nominal');
            });

            $data = [
                'id' => $user->id,
                'nim' => $user->nim,
                'nama' => $user->nama,
                'm1' => (float) ($payments->get(1) ?? 0),
                'm2' => (float) ($payments->get(2) ?? 0),
                'm3' => (float) ($payments->get(3) ?? 0),
                'm4' => (float) ($payments->get(4) ?? 0),
                'm5' => (float) ($payments->get(5) ?? 0),
            ];

            return $data;
        });

        return response()->json($matrix);
    }
    // ...
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2099',
            'minggu_ke' => 'required|integer|min:1|max:5',
            'nominal' => 'required|numeric|min:0',
        ]);

        // Check for existing payment to handle "Additive / Top-up" logic respecting Unique Constraint
        $existing = Pemasukan::where('user_id', $request->user_id)
            ->where('bulan', $request->bulan)
            ->where('tahun', $request->tahun)
            ->where('minggu_ke', $request->minggu_ke)
            ->first();

        if ($existing) {
            // Add new nominal to existing nominal (Cicilan/Top-up)
            $newNominal = $existing->nominal + $request->nominal;
            $existing->update([
                'nominal' => $newNominal,
                // Touch created_at to bump it to top of history? 
                // Alternatively, we rely on updated_at, but dashboard sorts by created_at.
                // Let's explicitly update created_at to make it appear as "Latest Activity"
                'created_at' => now(),
            ]);

            // Invalidate caches
            Cache::forget('dashboard_stats');
            $bulanInt = (int) $request->bulan;
            $tahunInt = (int) $request->tahun;
            Cache::forget("arrears_list_{$bulanInt}_{$tahunInt}");

            return response()->json([
                'message' => 'Pembayaran berhasil ditambahkan (Top-up).',
                'data' => $existing,
            ], 200);
        }

        $pemasukan = Pemasukan::create([
            'user_id' => $request->user_id,
            'bulan' => $request->bulan,
            'tahun' => $request->tahun,
            'minggu_ke' => $request->minggu_ke,
            'nominal' => $request->nominal,
        ]);

        $pemasukan->load('user:id,nim,nama');

        // Invalidate dashboard cache
        Cache::forget('dashboard_stats');

        // Invalidate arrears cache for this period
        $bulanInt = (int) $request->bulan;
        $tahunInt = (int) $request->tahun;
        $arrearsCacheKey = "arrears_list_{$bulanInt}_{$tahunInt}";
        Cache::forget($arrearsCacheKey);

        return response()->json([
            'message' => 'Pembayaran berhasil disimpan',
            'data' => $pemasukan,
        ], 201);
    }

    /**
     * Update a payment (Admin only)
     */
    public function update(Request $request, int $id)
    {
        $request->validate([
            'nominal' => 'required|numeric|min:0',
        ]);

        $pemasukan = Pemasukan::findOrFail($id);

        $pemasukan->update([
            'nominal' => $request->nominal,
        ]);

        // Invalidate dashboard cache
        Cache::forget('dashboard_stats');

        // Invalidate arrears cache for this period
        $bulanInt = (int) $pemasukan->bulan;
        $tahunInt = (int) $pemasukan->tahun;
        $arrearsCacheKey = "arrears_list_{$bulanInt}_{$tahunInt}";
        Cache::forget($arrearsCacheKey);

        return response()->json([
            'message' => 'Pembayaran berhasil diupdate',
            'data' => $pemasukan,
        ]);
    }

    /**
     * Delete a payment (Admin only)
     */
    public function destroy(int $id)
    {
        $pemasukan = Pemasukan::findOrFail($id);
        // Get period info before delete
        $bulan = $pemasukan->bulan;
        $tahun = $pemasukan->tahun;

        $pemasukan->delete();

        // Invalidate dashboard cache
        Cache::forget('dashboard_stats');

        // Invalidate arrears cache for this period
        $bulanInt = (int) $bulan;
        $tahunInt = (int) $tahun;
        $arrearsCacheKey = "arrears_list_{$bulanInt}_{$tahunInt}";
        Cache::forget($arrearsCacheKey);

        return response()->json([
            'message' => 'Pembayaran berhasil dihapus',
        ]);
    }

    /**
     * Bulk Store payments (Pay All remaining weeks for a month)
     */
    public function bulkStore(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2099',
            'minggu_ke' => 'nullable|integer|min:1|max:5', // Optional: Pay specific week fully
        ]);

        $userId = $request->user_id;
        $bulan = $request->bulan;
        $tahun = $request->tahun;
        $targetWeek = $request->minggu_ke;

        // Get configuration
        $weeklyFee = Setting::getPeriodFee($bulan, $tahun);
        $weeksPerMonth = Setting::getPeriodWeeks($bulan, $tahun);

        if ($weeklyFee <= 0) {
            return response()->json(['message' => 'Biaya mingguan belum dikonfigurasi untuk periode ini.'], 400);
        }

        // Get existing payments keyed by week
        $existingPayments = Pemasukan::where('user_id', $userId)
            ->where('bulan', $bulan)
            ->where('tahun', $tahun)
            ->get()
            ->keyBy('minggu_ke');

        $createdCount = 0;
        $updatedCount = 0;
        $totalNominal = 0;

        // Determine range of weeks to pay
        $startWeek = $targetWeek ? $targetWeek : 1;
        $endWeek = $targetWeek ? $targetWeek : $weeksPerMonth;

        // Loop through target weeks
        for ($week = $startWeek; $week <= $endWeek; $week++) {
            $existing = $existingPayments->get($week);

            if ($existing) {
                // If exists but partial/underpaid, update it to FULL FEE ("Make Full" Logic)
                // This ensures we don't double charge, just top up to the full amount
                if ((float) $existing->nominal < (float) $weeklyFee) {
                    $diff = $weeklyFee - $existing->nominal;
                    $existing->update(['nominal' => $weeklyFee]);
                    $updatedCount++;
                    $totalNominal += $diff;
                }
                continue;
            }

            Pemasukan::create([
                'user_id' => $userId,
                'bulan' => $bulan,
                'tahun' => $tahun,
                'minggu_ke' => $week,
                'nominal' => $weeklyFee,
            ]);

            $createdCount++;
            $totalNominal += $weeklyFee;
        }

        if ($createdCount === 0 && $updatedCount === 0) {
            return response()->json(['message' => 'Semua minggu sudah lunas.'], 200);
        }

        // Invalidate caches
        Cache::forget('dashboard_stats');
        $bulanInt = (int) $bulan;
        $tahunInt = (int) $tahun;
        $arrearsCacheKey = "arrears_list_{$bulanInt}_{$tahunInt}";
        Cache::forget($arrearsCacheKey);

        return response()->json([
            'message' => "Berhasil melunasi {$createdCount} minggu.",
            'weeks_paid' => $createdCount,
            'total_amount' => $totalNominal
        ], 201);
    }
}
