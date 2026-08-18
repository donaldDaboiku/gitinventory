<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class DashboardCache
{
    public static function key(int $tenantId): string
    {
        return 'dashboard:'.$tenantId.':'.now()->toDateString();
    }

    public static function forget(int $tenantId): void
    {
        Cache::forget(self::key($tenantId));
    }
}
