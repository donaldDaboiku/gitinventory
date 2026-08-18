<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\LogoutController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\Auth\ResendVerificationController;
use App\Http\Controllers\Api\Auth\ResetPasswordController;
use App\Http\Controllers\Api\Auth\VerifyEmailController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\TeamUserController;
use App\Http\Middleware\CheckEmailVerified;
use App\Http\Middleware\CheckSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| GITInventory API Routes
|--------------------------------------------------------------------------
*/

// Public routes (rate-limited)
Route::prefix('auth')->middleware('throttle:10,1')->group(function () {
    Route::post('register', RegisterController::class);
    Route::post('login', LoginController::class);
    Route::post('forgot-password', ForgotPasswordController::class);
    Route::post('reset-password', ResetPasswordController::class);
});

Route::post('billing/webhook', [BillingController::class, 'webhook']);

Route::get('auth/email/verify/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// Authenticated routes that must work even when subscription expired / email unverified
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('auth/logout', LogoutController::class);
    Route::get('auth/me', fn (Request $req) => response()->json([
        'user' => array_merge($req->user()->load('tenant')->toArray(), [
            'roles'       => $req->user()->getRoleNames(),
            'permissions' => $req->user()->getAllPermissions()->pluck('name'),
        ]),
    ]));
    Route::post('auth/email/resend', ResendVerificationController::class)->middleware('throttle:6,1');

    Route::prefix('billing')->group(function () {
        Route::get('plans', [BillingController::class, 'plans']);
        Route::get('status', [BillingController::class, 'status']);
        Route::post('checkout', [BillingController::class, 'checkout'])->middleware('can:settings.edit');
        Route::post('confirm-demo', [BillingController::class, 'confirmDemo'])->middleware('can:settings.edit');
    });

    Route::get('settings', [SettingsController::class, 'show'])->middleware('can:settings.view');
});

// Protected routes (verified email + active trial or subscription required)
Route::middleware(['auth:sanctum', CheckEmailVerified::class, CheckSubscription::class])->group(function () {
    // Dashboard
    Route::get('dashboard', DashboardController::class)->middleware('can:reports.view');

    // Financial reports
    Route::prefix('reports')->group(function () {
        Route::get('financial', [ReportController::class, 'financial'])->middleware('can:reports.view');
        Route::get('financial/export', [ReportController::class, 'exportFinancial'])->middleware('can:reports.export');
        Route::get('financial/export/pdf', [ReportController::class, 'exportFinancialPdf'])->middleware('can:reports.export');
    });

    // Settings & team
    Route::prefix('settings')->group(function () {
        Route::put('/', [SettingsController::class, 'update'])->middleware('can:settings.edit');
        Route::get('activity/export', [ActivityLogController::class, 'export'])->middleware('can:settings.view');
        Route::get('users', [TeamUserController::class, 'index'])->middleware('can:users.view');
        Route::post('users', [TeamUserController::class, 'store'])->middleware('can:users.create');
        Route::put('users/{teamMember}', [TeamUserController::class, 'update'])->middleware('can:users.edit');
    });

    // Products
    Route::get('products/codes/preview', [ProductController::class, 'previewCodes'])->middleware('can:products.create');
    Route::get('products/import/template', [ProductController::class, 'importTemplate'])->middleware('can:products.create');
    Route::post('products/import', [ProductController::class, 'import'])->middleware('can:products.create');
    Route::get('products/lookup', [ProductController::class, 'lookup'])->middleware('can:sales.create');
    Route::get('products/{product}/label', [ProductController::class, 'label'])->middleware('can:products.view');
    Route::apiResource('products', ProductController::class)->middleware([
        'index'   => 'can:products.view',
        'show'    => 'can:products.view',
        'store'   => 'can:products.create',
        'update'  => 'can:products.edit',
        'destroy' => 'can:products.delete',
    ]);

    // Stock movements
    Route::prefix('stock')->group(function () {
        Route::get('movements', [StockController::class, 'movements'])->middleware('can:stock.view');
        Route::post('in', [StockController::class, 'stockIn'])->middleware('can:stock.in');
        Route::post('out', [StockController::class, 'stockOut'])->middleware('can:stock.out');
        Route::post('adjust', [StockController::class, 'adjust'])->middleware('can:stock.adjust');
    });

    // Categories (catalog permissions)
    Route::apiResource('categories', CategoryController::class)->middleware([
        'index'   => 'can:products.view',
        'show'    => 'can:products.view',
        'store'   => 'can:products.create',
        'update'  => 'can:products.edit',
        'destroy' => 'can:products.delete',
    ]);

    // Customers
    Route::apiResource('customers', CustomerController::class)->middleware([
        'index'   => 'can:customers.view',
        'show'    => 'can:customers.view',
        'store'   => 'can:customers.create',
        'update'  => 'can:customers.edit',
        'destroy' => 'can:customers.delete',
    ]);

    // Suppliers
    Route::apiResource('suppliers', SupplierController::class)->middleware([
        'index'   => 'can:suppliers.view',
        'show'    => 'can:suppliers.view',
        'store'   => 'can:suppliers.create',
        'update'  => 'can:suppliers.edit',
        'destroy' => 'can:suppliers.delete',
    ]);

    // Sales
    Route::get('sales/{sale}/pdf', [SaleController::class, 'pdf'])->middleware('can:sales.view');
    Route::apiResource('sales', SaleController::class)->only(['index', 'store', 'show'])->middleware([
        'index' => 'can:sales.view',
        'show'  => 'can:sales.view',
        'store' => 'can:sales.create',
    ]);

    // Purchases
    Route::get('purchases/import/template', [PurchaseController::class, 'importTemplate'])->middleware('can:purchases.create');
    Route::post('purchases/import', [PurchaseController::class, 'import'])->middleware('can:purchases.create');
    Route::apiResource('purchases', PurchaseController::class)->only(['index', 'store', 'show'])->middleware([
        'index' => 'can:purchases.view',
        'show'  => 'can:purchases.view',
        'store' => 'can:purchases.create',
    ]);

    // Branches
    Route::apiResource('branches', BranchController::class)->middleware([
        'index'   => 'can:branches.view',
        'show'    => 'can:branches.view',
        'store'   => 'can:branches.create',
        'update'  => 'can:branches.edit',
        'destroy' => 'can:branches.delete',
    ]);
});
