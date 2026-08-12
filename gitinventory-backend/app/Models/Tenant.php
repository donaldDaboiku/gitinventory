<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Tenant extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'country',
        'logo',
        'currency',
        'timezone',
        'is_active',
        'subscription_plan',
        'subscription_expires_at',
        'trial_ends_at',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active'               => 'boolean',
            'subscription_expires_at' => 'datetime',
            'trial_ends_at'           => 'datetime',
            'settings'                => 'array',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'is_active', 'subscription_plan'])
            ->logOnlyDirty();
    }

    public function users(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(User::class);
    }

    public function branches(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function products(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function isOnTrial(): bool
    {
        return $this->trial_ends_at && $this->trial_ends_at->isFuture();
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscription_expires_at && $this->subscription_expires_at->isFuture();
    }

    /**
     * @return array<string, mixed>
     */
    public function defaultSettings(): array
    {
        return [
            'default_min_stock_level' => 5,
            'default_tax_rate'        => 0,
            'invoice_prefix'          => 'INV',
            'allow_negative_stock'    => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function mergedSettings(): array
    {
        return array_merge($this->defaultSettings(), $this->settings ?? []);
    }
}
