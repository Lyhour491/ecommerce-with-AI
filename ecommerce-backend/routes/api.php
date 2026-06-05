<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\ProductImageController;
use App\Http\Controllers\Api\SellerProductController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/top-products', [ProductController::class, 'topProducts']);
Route::get('/products/{product}', [ProductController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/seller/apply', [UserController::class, 'applySeller']);

    // ── Admin routes ────────────────────────────────────────────────────
    Route::middleware('admin')->group(function () {
        Route::get('/admin/stats', [AdminStatsController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::patch('/product-images/{productImage}/primary', [ProductImageController::class, 'setPrimary']);
        Route::delete('/product-images/{productImage}', [ProductImageController::class, 'destroy']);

        Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
        Route::put('/orders/{order}', [OrderController::class, 'update']);

        Route::get('/users', [UserController::class, 'index']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);
        Route::get('/admin/seller-applications', [UserController::class, 'getSellerApplications']);
        Route::post('/admin/seller-applications/{user}/approve', [UserController::class, 'approveSeller']);
        Route::post('/admin/seller-applications/{user}/reject', [UserController::class, 'rejectSeller']);
    });

    // ── Seller routes ───────────────────────────────────────────────────
    Route::middleware('seller')->prefix('seller')->group(function () {
        Route::get('/stats', [SellerProductController::class, 'stats']);
        Route::get('/products', [SellerProductController::class, 'index']);
        Route::post('/products', [SellerProductController::class, 'store']);
        Route::get('/products/{product}', [SellerProductController::class, 'show']);
        Route::put('/products/{product}', [SellerProductController::class, 'update']);
        Route::delete('/products/{product}', [SellerProductController::class, 'destroy']);
        Route::get('/orders', [SellerProductController::class, 'orders']);
    });

    // ── Customer routes ─────────────────────────────────────────────────
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::put('/cart/{cart}', [CartController::class, 'update']);
    Route::delete('/cart/{cart}', [CartController::class, 'destroy']);
    Route::delete('/cart-clear', [CartController::class, 'clear']);

    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
});