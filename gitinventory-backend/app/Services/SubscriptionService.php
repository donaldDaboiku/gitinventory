<?php

namespace App\Services;

use App\Models\Tenant;
use Carbon\Carbon;

class SubscriptionService
{
    /**
     * @return array<string, mixed>
     */
    public function status(Tenant $tenant): array
    {
        $onTrial = $tenant->isOnTrial();
        $hasSubscription = $tenant->hasActiveSubscription();
        $trialDaysLeft = $onTrial && $tenant->trial_ends_at
            ? max(0, now()->diffInDays($tenant->trial_ends_at, false))
            : 0;

        return [
            'plan' => $tenant->subscription_plan,
            'on_trial' => $onTrial,
            'has_active_subscription' => $hasSubscription,
            'trial_ends_at' => $tenant->trial_ends_at,
            'subscription_expires_at' => $tenant->subscription_expires_at,
            'trial_days_left' => $trialDaysLeft,
            'is_active' => $onTrial || $hasSubscription,
        ];
    }

    public function activate(Tenant $tenant, string $plan, ?string $reference = null): Tenant
    {
        $plans = config('billing.plans');
        abort_unless(isset($plans[$plan]), 422, 'Invalid plan.');

        $days = (int) ($plans[$plan]['interval_days'] ?? 30);
        $base = $tenant->subscription_expires_at && $tenant->subscription_expires_at->isFuture()
            ? $tenant->subscription_expires_at
            : now();

        $tenant->update([
            'subscription_plan' => $plan,
            'subscription_expires_at' => Carbon::parse($base)->addDays($days),
        ]);

        return $tenant->fresh();
    }
}
