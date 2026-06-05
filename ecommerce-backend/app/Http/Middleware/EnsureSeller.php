<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSeller
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || !in_array($request->user()->role, ['seller', 'admin'])) {
            return response()->json(['message' => 'Seller access required'], 403);
        }

        return $next($request);
    }
}
