<?php

namespace App\Console\Commands;

use App\Mail\TrialEndingMail;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendTrialReminders extends Command
{
    protected $signature = 'subscriptions:send-trial-reminders';

    protected $description = 'Email tenants whose trial ends in 3 or 1 days';

    public function handle(): int
    {
        $sent = 0;

        foreach ([3, 1] as $daysLeft) {
            $tenants = Tenant::query()
                ->whereDate('trial_ends_at', now()->addDays($daysLeft)->toDateString())
                ->get();

            foreach ($tenants as $tenant) {
                if ($tenant->hasActiveSubscription()) {
                    continue;
                }

                $owner = $tenant->users()->whereHas('roles', fn ($q) => $q->where('name', 'owner'))->first()
                    ?? $tenant->users()->first();

                if (! $owner?->email) {
                    continue;
                }

                Mail::to($owner->email)->send(new TrialEndingMail($tenant, $daysLeft));
                $sent++;
            }
        }

        $this->info("Sent {$sent} trial reminder(s).");

        return self::SUCCESS;
    }
}
