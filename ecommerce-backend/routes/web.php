<?php

use App\Http\Controllers\DocumentationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/test', function () {
    return view('test');
});

Route::get('/docs', [DocumentationController::class, 'swagger'])->name('docs.swagger');
Route::get('/docs/openapi.yaml', [DocumentationController::class, 'openApi'])->name('docs.openapi');
Route::get('/api/documentation', [DocumentationController::class, 'swagger']);
Route::get('/api/documentation/openapi.yaml', [DocumentationController::class, 'openApi']);
