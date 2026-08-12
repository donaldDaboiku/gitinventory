<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Mail\WelcomeMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class RegisterController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'password'      => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        try {
            DB::beginTransaction();

            // Create tenant (business account)
            $tenant = Tenant::create([
                'name'          => $validated['business_name'],
                'slug'          => Str::slug($validated['business_name']) . '-' . Str::random(4),
                'email'         => $validated['email'],
                'phone'         => $validated['phone'] ?? null,
                'currency'      => 'NGN',
                'timezone'      => 'Africa/Lagos',
                'trial_ends_at' => now()->addDays(14),
                'subscription_plan' => 'trial',
            ]);

            // Create default main branch
            Branch::create([
                'tenant_id' => $tenant->id,
                'name'      => 'Main Branch',
                'code'      => 'MAIN',
                'is_main'   => true,
            ]);

            // Create owner user
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name'      => $validated['name'],
                'email'     => $validated['email'],
                'phone'     => $validated['phone'] ?? null,
                'password'  => Hash::make($validated['password']),
            ]);

            // Assign owner role (created by seeder)
            $user->assignRole('owner');

            DB::commit();

            Mail::to($user->email)->send(new WelcomeMail($user, $tenant));
            $user->sendEmailVerificationNotification();

            $token = $user->createToken('auth-token', ['*'], now()->addDays(30))->plainTextToken;

            return response()->json([
                'message' => 'Registration successful. Your 14-day trial has started. Please verify your email.',
                'user'    => [
                    'id'                => $user->id,
                    'name'              => $user->name,
                    'email'             => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'role'              => 'owner',
                    'tenant' => [
                        'id'            => $tenant->id,
                        'name'          => $tenant->name,
                        'currency'      => $tenant->currency,
                        'trial_ends_at' => $tenant->trial_ends_at,
                    ],
                ],
                'token' => $token,
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);
            return response()->json(['message' => 'Registration failed. Please try again.'], 500);
        }
    }
}
