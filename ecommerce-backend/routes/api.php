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
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\PayoutController;
use App\Http\Controllers\Api\AdminSettingsController;
use App\Http\Controllers\Api\NotificationController;


Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider']);
Route::post('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback']);
Route::post('/forgot-password', [AuthController::class, 'sendResetLinkEmail']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/top-products', [ProductController::class, 'topProducts']);
Route::get('/products/{product}', [ProductController::class, 'show']);
Route::get('/products/{product}/reviews', [ReviewController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/ai/chat', [AiController::class, 'chat'])->middleware('throttle:ai-chat');
    Route::get('/ai/recommend-products', [AiController::class, 'recommendProducts']);

    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/seller/apply', [UserController::class, 'applySeller']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    // ── Admin routes ────────────────────────────────────────────────────
    Route::middleware('admin')->group(function () {
        Route::get('/admin/stats', [AdminStatsController::class, 'index']);
        Route::get('/admin/settings', [AdminSettingsController::class, 'index']);
        Route::put('/admin/settings', [AdminSettingsController::class, 'update']);
        Route::post('/admin/settings/reset', [AdminSettingsController::class, 'reset']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/products/{product}/approve', [ProductController::class, 'approve']);
        Route::post('/products/{product}/reject', [ProductController::class, 'reject']);
        Route::get('/products/{product}/ai-check', [AiController::class, 'checkProduct']);
        Route::patch('/product-images/{productImage}/primary', [ProductImageController::class, 'setPrimary']);
        Route::delete('/product-images/{productImage}', [ProductImageController::class, 'destroy']);

        Route::put('/orders/{order}', [OrderController::class, 'update']);

        Route::get('/users', [UserController::class, 'index']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}/role', [UserController::class, 'updateRole']);
        Route::post('/users/{user}/ban-seller', [UserController::class, 'banSeller']);
        Route::get('/admin/seller-applications', [UserController::class, 'getSellerApplications']);
        Route::post('/admin/seller-applications/{user}/approve', [UserController::class, 'approveSeller']);
        Route::post('/admin/seller-applications/{user}/reject', [UserController::class, 'rejectSeller']);

        Route::get('/admin/payouts', [PayoutController::class, 'adminIndex']);
        Route::post('/admin/payouts/{id}/process', [PayoutController::class, 'adminProcess']);
        Route::post('/admin/payouts/batch-process', [PayoutController::class, 'adminBatchProcess']);
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
        Route::post('/ai/generate-product-content', [AiController::class, 'generateProductContent']);
        Route::post('/ai/product-title', [AiController::class, 'generateProductTitle']);
        Route::post('/ai/product-description', [AiController::class, 'generateProductDescription']);
        Route::post('/ai/product-category', [AiController::class, 'suggestProductCategory']);
        Route::post('/ai/product-tags', [AiController::class, 'generateProductTags']);
        Route::post('/ai/product-price', [AiController::class, 'suggestProductPrice']);

        Route::get('/payouts', [PayoutController::class, 'sellerIndex']);
        Route::post('/payouts', [PayoutController::class, 'sellerStore']);
        Route::get('/ai-insights', [AiController::class, 'sellerInsights']);
    });


    // ── Customer routes ─────────────────────────────────────────────────
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::put('/cart/{cart}', [CartController::class, 'update']);
    Route::delete('/cart/{cart}', [CartController::class, 'destroy']);
    Route::delete('/cart-clear', [CartController::class, 'clear']);

    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{productId}', [WishlistController::class, 'destroy']);

    Route::post('/products/{product}/reviews', [ReviewController::class, 'store']);

    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::get('/orders/{order}/messages', [MessageController::class, 'index']);
    Route::post('/orders/{order}/messages', [MessageController::class, 'store']);
});
