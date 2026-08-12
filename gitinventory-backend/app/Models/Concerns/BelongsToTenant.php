<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenantId = auth()->user()?->tenant_id;

            if (! $tenantId) {
                return;
            }

            $builder->where(
                $builder->getModel()->getTable().'.tenant_id',
                $tenantId
            );
        });

        static::creating(function (Model $model) {
            if (! empty($model->getAttribute('tenant_id'))) {
                return;
            }

            $tenantId = auth()->user()?->tenant_id;
            if ($tenantId) {
                $model->setAttribute('tenant_id', $tenantId);
            }
        });
    }

    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Models\Tenant::class);
    }
}
