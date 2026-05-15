<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Check if user and tenant exist
        if (!$user || !$user->tenant) {
            return response()->json(['message' => 'User or tenant not found.'], 401);
        }

        // Check if subscription is active
        if (!$user->tenant->isOnTrial() && !$user->tenant->hasActiveSubscription()) {
            return response()->json(['message' => 'Subscription expired.'], 402);
        }

        return $next($request);
    }
}
