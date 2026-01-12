<?php

namespace App\Http\Controllers;

use App\Models\Pemasukan;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;

class ArrearsController extends Controller
{
    /**
     * Get list of users with arrears (Admin only)
     */
    public function index(Request $request)
    {
        $request->validate([
            'bulan' => 'required|integer|min:1|max:12',
            'tahun' => 'required|integer|min:2020|max:2099',
        ]);

        $bulan = (int) $request->bulan;
        $tahun = (int) $request->tahun;

        $cacheKey = "arrears_list_{$bulan}_{$tahun}";

        // Cache for 2 minutes for faster updates after payments
        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 120, function () use ($bulan, $tahun) {
            $weeklyFee = Setting::getPeriodFee($bulan, $tahun);
            $weeksPerMonth = Setting::getPeriodWeeks($bulan, $tahun);

            // If no settings configured (weeklyFee is 0 or null), return empty arrears
            if (!$weeklyFee || $weeklyFee <= 0) {
                return response()->json([
                    'bulan' => $bulan,
                    'tahun' => $tahun,
                    'weekly_fee' => 0,
                    'data' => [],
                ]);
            }

            // Get all users (including admin) with their payments for this period
            $users = User::query()
                ->with([
                    'pemasukan' => function ($query) use ($bulan, $tahun) {
                        $query->where('bulan', $bulan)->where('tahun', $tahun);
                    }
                ])
                ->orderBy('nama')
                ->get();

            $arrears = [];

            foreach ($users as $user) {
                // Group by week and sum to handle multiple payments (additive/top-up)
                $payments = $user->pemasukan->groupBy('minggu_ke')->map(fn($g) => $g->sum('nominal'));
                $unpaidWeeks = [];

                for ($week = 1; $week <= $weeksPerMonth; $week++) {
                    $paid = $payments->get($week) ?? 0;
                    if ($paid < $weeklyFee) {
                        $unpaidWeeks[] = $week;
                    }
                }

                if (!empty($unpaidWeeks)) {
                    $arrears[] = [
                        'id' => $user->id,
                        'nim' => $user->nim,
                        'nama' => $user->nama,
                        'unpaid_weeks' => $unpaidWeeks,
                        'total_unpaid' => count($unpaidWeeks) * $weeklyFee,
                    ];
                }
            }

            return response()->json([
                'bulan' => $bulan,
                'tahun' => $tahun,
                'weekly_fee' => $weeklyFee,
                'data' => $arrears,
            ]);
        });
    }
}
