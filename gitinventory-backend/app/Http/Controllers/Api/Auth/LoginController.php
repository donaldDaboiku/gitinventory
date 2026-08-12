<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = \App\Models\User::where('email', $request->email)
            ->with('tenant')
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The credentials you entered are incorrect.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Your account has been deactivated. Contact your administrator.'], 403);
        }

        if ($user->tenant && ! $user->tenant->is_active) {
            return response()->json(['message' => 'Your business account is inactive. Please contact support.'], 403);
        }

        // Revoke old tokens (optional — comment out to allow multiple device login)
        // $user->tokens()->delete();

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user'    => [
                'id'                => $user->id,
                'name'              => $user->name,
                'email'             => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'phone'             => $user->phone,
                'roles'             => $user->getRoleNames(),
                'tenant' => $user->tenant ? [
                    'id'                  => $user->tenant->id,
                    'name'                => $user->tenant->name,
                    'currency'            => $user->tenant->currency,
                    'subscription_plan'   => $user->tenant->subscription_plan,
                    'on_trial'            => $user->tenant->isOnTrial(),
                    'trial_ends_at'       => $user->tenant->trial_ends_at,
                ] : null,
            ],
            'token' => $token,
        ]);
    }
}
