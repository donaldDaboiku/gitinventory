<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        abort_unless($tenant, 404, 'Tenant not found.');

        return response()->json($this->formatSettings($tenant, $request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        abort_unless($tenant, 404, 'Tenant not found.');

        $validated = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'email', 'max:255', 'unique:tenants,email,'.$tenant->id],
            'phone'    => ['nullable', 'string', 'max:30'],
            'address'  => ['nullable', 'string', 'max:500'],
            'city'     => ['nullable', 'string', 'max:100'],
            'state'    => ['nullable', 'string', 'max:100'],
            'country'  => ['nullable', 'string', 'max:2'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'timezone' => ['sometimes', 'string', 'max:64'],
            'logo'     => ['nullable', 'string', 'max:500'],
            'preferences' => ['sometimes', 'array'],
            'preferences.default_min_stock_level' => ['nullable', 'integer', 'min:0'],
            'preferences.default_tax_rate'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'preferences.invoice_prefix'          => ['nullable', 'string', 'max:20'],
            'preferences.allow_negative_stock'    => ['nullable', 'boolean'],
        ]);

        $tenantFields = collect($validated)->except('preferences')->all();

        if ($tenantFields !== []) {
            $tenant->update($tenantFields);
        }

        if (array_key_exists('preferences', $validated)) {
            $tenant->update([
                'settings' => array_merge(
                    $tenant->mergedSettings(),
                    $validated['preferences']
                ),
            ]);
        }

        return response()->json([
            'message'  => 'Settings updated successfully.',
            'settings' => $this->formatSettings($tenant->fresh(), $request->user()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatSettings(Tenant $tenant, User $actor): array
    {
        return [
            'tenant' => [
                'id'                      => $tenant->id,
                'name'                    => $tenant->name,
                'email'                   => $tenant->email,
                'phone'                   => $tenant->phone,
                'address'                 => $tenant->address,
                'city'                    => $tenant->city,
                'state'                   => $tenant->state,
                'country'                 => $tenant->country,
                'currency'                => $tenant->currency,
                'timezone'                => $tenant->timezone,
                'logo'                    => $tenant->logo,
                'subscription_plan'       => $tenant->subscription_plan,
                'trial_ends_at'           => $tenant->trial_ends_at,
                'subscription_expires_at' => $tenant->subscription_expires_at,
                'on_trial'                => $tenant->isOnTrial(),
                'has_active_subscription' => $tenant->hasActiveSubscription(),
            ],
            'preferences' => $tenant->mergedSettings(),
            'assignable_roles' => $this->assignableRoles($actor),
        ];
    }

    /**
     * @return list<string>
     */
    private function assignableRoles(User $actor): array
    {
        $roles = ['manager', 'sales_staff', 'inventory_officer', 'accountant'];

        if ($actor->hasRole('owner')) {
            array_unshift($roles, 'owner');
        }

        return $roles;
    }
}
