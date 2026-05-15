<?php

use App\Http\Controllers\Api\Auth\LoginController;
use App\Http\Controllers\Api\Auth\LogoutController;
use App\Http\Controllers\Api\Auth\RegisterController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StockController;
use App\Http\Middleware\CheckSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| GITInventory API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('register', RegisterController::class);
    Route::post('login',    LoginController::class);
});

// Protected routes (Sanctum token required)
Route::middleware(['auth:sanctum', CheckSubscription::class, 'can:products.view'])->group(function () {

    // Auth
    Route::post('auth/logout', LogoutController::class);
    Route::get('auth/me', fn (Request $req) => response()->json([
        'user' => array_merge($req->user()->load('tenant')->toArray(), [
            'roles'       => $req->user()->getRoleNames(),
            'permissions' => $req->user()->getAllPermissions()->pluck('name'),
        ]),
    ]));

    // Dashboard
    Route::get('dashboard', DashboardController::class);

    // Products
     Route::apiResource('products', ProductController::class)->only(['index', 'show']);
    // stock
    Route::apiResource('products', ProductController::class)->only(['store']);
    // Stock movements
    
    Route::prefix('stock')->group(function () {
        Route::post('in',        [StockController::class, 'stockIn']);
        Route::post('out',       [StockController::class, 'stockOut']);
        Route::post('adjust',    [StockController::class, 'adjust']);
        Route::get('movements',  [StockController::class, 'movements']);
    });

    // Categories
    Route::apiResource('categories', \App\Http\Controllers\Api\CategoryController::class);

    // Customers
    Route::apiResource('customers', \App\Http\Controllers\Api\CustomerController::class);

    // Suppliers
    Route::apiResource('suppliers', \App\Http\Controllers\Api\SupplierController::class);

    // Sales
    Route::apiResource('sales', \App\Http\Controllers\Api\SaleController::class)->only(['index', 'store', 'show']);

    // Purchases
    Route::apiResource('purchases', \App\Http\Controllers\Api\PurchaseController::class)->only(['index', 'store', 'show']);

    // Branches (owner/manager only)
    Route::apiResource('branches', \App\Http\Controllers\Api\BranchController::class);
});
