<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'address',
        'city',
        'credit_limit',
        'outstanding_balance',
        'is_active',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'credit_limit'        => 'decimal:2',
            'outstanding_balance' => 'decimal:2',
            'is_active'           => 'boolean',
        ];
    }

    public function sales(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
