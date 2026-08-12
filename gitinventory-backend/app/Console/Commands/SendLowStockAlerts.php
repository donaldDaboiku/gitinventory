<?php

namespace App\Console\Commands;

use App\Mail\LowStockAlertMail;
use App\Models\Product;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendLowStockAlerts extends Command
{
    protected $signature = 'inventory:send-low-stock-alerts';

    protected $description = 'Email tenant owners about products at or below minimum stock';

    public function handle(): int
    {
        $sent = 0;

        Tenant::query()
            ->where('is_active', true)
            ->where(function ($query) {
                $query->where('trial_ends_at', '>', now())
                    ->orWhere('subscription_expires_at', '>', now());
            })
            ->with(['users.roles'])
            ->chunkById(50, function ($tenants) use (&$sent) {
                foreach ($tenants as $tenant) {
                    $products = Product::query()
                        ->where('tenant_id', $tenant->id)
                        ->where('is_active', true)
                        ->where('track_stock', true)
                        ->whereColumn('quantity', '<=', 'min_stock_level')
                        ->orderBy('name')
                        ->limit(25)
                        ->get();

                    if ($products->isEmpty()) {
                        continue;
                    }

                    $recipient = $tenant->users
                        ->first(fn ($user) => $user->is_active && $user->hasRole('owner'))
                        ?? $tenant->users->first(fn ($user) => $user->is_active);

                    if (! $recipient?->email) {
                        continue;
                    }

                    Mail::to($recipient->email)->send(new LowStockAlertMail($tenant, $products));
                    $sent++;
                }
            });

        $this->info("Sent {$sent} low-stock alert(s).");

        return self::SUCCESS;
    }
}
