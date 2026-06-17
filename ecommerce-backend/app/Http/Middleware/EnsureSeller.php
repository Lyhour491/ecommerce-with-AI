<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSeller
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || $request->user()->cannot('seller.access')) {
            return response()->json(['message' => 'Seller access required'], 403);
        }

        return $next($request);
    }
}
