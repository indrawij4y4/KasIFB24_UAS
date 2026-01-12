<?php

use App\Http\Controllers\ArrearsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\LeaderboardController;
use App\Http\Controllers\PemasukanController;
use App\Http\Controllers\PengeluaranController;
use App\Http\Controllers\ResetController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\AuthenticateWithTokenQuery;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::get('/test', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'API is working!',
        'php_version' => PHP_VERSION,
        'laravel_version' => app()->version(),
    ]);
});



Route::post('/auth/login', [AuthController::class, 'login'])->name('login');

// Export routes - use token-query middleware for browser file downloads
Route::middleware(AuthenticateWithTokenQuery::class)->group(function () {
    Route::get('/export/personal', [ExportController::class, 'personal']);
    Route::get('/export/global', [ExportController::class, 'global']);
    Route::get('/export/pengeluaran', [ExportController::class, 'pengeluaran']);
});

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Pemasukan (Income)
    Route::get('/pemasukan', [PemasukanController::class, 'index']);
    Route::get('/pemasukan/matrix', [PemasukanController::class, 'matrix']);
    Route::get('/pemasukan/my-payments', [PemasukanController::class, 'myPayments']);

    // Pengeluaran (Expense)
    Route::get('/pengeluaran', [PengeluaranController::class, 'index']);
    Route::get('/pengeluaran/{id}', [PengeluaranController::class, 'show']);

    // Leaderboard
    Route::get('/leaderboard', [LeaderboardController::class, 'index']);

    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);

    // Admin only routes
    Route::middleware(AdminMiddleware::class)->group(function () {
        // Auth - Reset Password
        Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

        // Users
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{id}', [UserController::class, 'show']);

        // Pemasukan CRUD
        Route::post('/pemasukan/bulk', [PemasukanController::class, 'bulkStore']);
        Route::post('/pemasukan', [PemasukanController::class, 'store']);
        Route::put('/pemasukan/{id}', [PemasukanController::class, 'update']);
        Route::delete('/pemasukan/{id}', [PemasukanController::class, 'destroy']);

        // Pengeluaran CRUD
        Route::post('/pengeluaran', [PengeluaranController::class, 'store']);
        Route::put('/pengeluaran/{id}', [PengeluaranController::class, 'update']);
        Route::delete('/pengeluaran/{id}', [PengeluaranController::class, 'destroy']);

        // Arrears
        Route::get('/arrears', [ArrearsController::class, 'index']);

        // Settings Update
        Route::put('/settings', [SettingsController::class, 'update']);

        // Reset All Data
        Route::post('/reset-data', [ResetController::class, 'resetAllData']);
    });
});

