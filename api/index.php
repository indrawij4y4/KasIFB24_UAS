<?php

// Enable maximum error reporting
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Handle CORS preflight requests BEFORE loading Laravel
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: https://indrawij4y4.github.io');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

// Set base path for Vercel
$basePath = dirname(__DIR__);

// Vercel serverless: Create writable directories in /tmp BEFORE loading Laravel
if (getenv('VERCEL') || isset($_ENV['VERCEL'])) {
    $tmpBase = '/tmp';

    // Create all required directories
    $dirs = [
        $tmpBase . '/storage',
        $tmpBase . '/storage/app',
        $tmpBase . '/storage/app/public',
        $tmpBase . '/storage/framework',
        $tmpBase . '/storage/framework/cache',
        $tmpBase . '/storage/framework/cache/data',
        $tmpBase . '/storage/framework/sessions',
        $tmpBase . '/storage/framework/views',
        $tmpBase . '/storage/logs',
        $tmpBase . '/bootstrap/cache',
    ];

    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }

    // Set environment variables BEFORE Laravel loads
    putenv('APP_SERVICES_CACHE=' . $tmpBase . '/bootstrap/cache/services.php');
    putenv('APP_PACKAGES_CACHE=' . $tmpBase . '/bootstrap/cache/packages.php');
    putenv('APP_CONFIG_CACHE=' . $tmpBase . '/bootstrap/cache/config.php');
    putenv('APP_ROUTES_CACHE=' . $tmpBase . '/bootstrap/cache/routes.php');
    putenv('APP_EVENTS_CACHE=' . $tmpBase . '/bootstrap/cache/events.php');

    $_ENV['APP_SERVICES_CACHE'] = $tmpBase . '/bootstrap/cache/services.php';
    $_ENV['APP_PACKAGES_CACHE'] = $tmpBase . '/bootstrap/cache/packages.php';
    $_ENV['APP_CONFIG_CACHE'] = $tmpBase . '/bootstrap/cache/config.php';
    $_ENV['APP_ROUTES_CACHE'] = $tmpBase . '/bootstrap/cache/routes.php';
    $_ENV['APP_EVENTS_CACHE'] = $tmpBase . '/bootstrap/cache/events.php';

    // FIX: Vercel's vercel-php sets PATH_INFO to exclude /api prefix
    // Laravel uses REQUEST_URI for routing, but we need to ensure it's correct
    // The SCRIPT_NAME is /api/index.php, but we want Laravel to see the full path
    if (isset($_SERVER['PATH_INFO']) && !str_starts_with($_SERVER['PATH_INFO'], '/api')) {
        // If PATH_INFO doesn't start with /api, prepend it
        $_SERVER['PATH_INFO'] = '/api' . $_SERVER['PATH_INFO'];
    }

    // Also fix SCRIPT_NAME to be just /index.php for proper URL generation
    $_SERVER['SCRIPT_NAME'] = '/index.php';
}

// Wrap everything in try-catch to capture any errors
try {
    // Check autoload
    $autoloadPath = $basePath . '/vendor/autoload.php';
    if (!file_exists($autoloadPath)) {
        throw new Exception('Autoload not found: ' . $autoloadPath);
    }

    define('LARAVEL_START', microtime(true));

    // Register the Composer autoloader
    require $autoloadPath;

    // Bootstrap Laravel
    /** @var \Illuminate\Foundation\Application $app */
    $app = require_once $basePath . '/bootstrap/app.php';

    // Override storage path for Vercel BEFORE handling request
    if (getenv('VERCEL') || isset($_ENV['VERCEL'])) {
        $app->useStoragePath('/tmp/storage');

        // Also bind the bootstrap cache path
        $app->instance('path.bootstrap.cache', '/tmp/bootstrap/cache');
    }

    // Handle request
    $app->handleRequest(\Illuminate\Http\Request::capture());

} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ], JSON_PRETTY_PRINT);
}
