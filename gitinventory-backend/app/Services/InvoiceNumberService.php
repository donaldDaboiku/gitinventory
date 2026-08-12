<?php

namespace App\Services;

use App\Models\Sale;
use App\Models\Tenant;

class InvoiceNumberService
{
    public function next(int $tenantId, Tenant $tenant): string
    {
        $prefix = strtoupper((string) ($tenant->mergedSettings()['invoice_prefix'] ?? 'INV'));
        $sequence = Sale::where('tenant_id', $tenantId)->count() + 1;

        return sprintf('%s-%05d', $prefix, $sequence);
    }
}
