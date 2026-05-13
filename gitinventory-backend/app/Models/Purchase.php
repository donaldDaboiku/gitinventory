<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Purchase extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'supplier_id',
        'user_id',
        'reference_number',
        'purchase_date',
        'total_amount',
        'amount_paid',
        'amount_due',
        'payment_status', // paid | partial | pending
        'status',         // received | partial | pending | cancelled
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'purchase_date' => 'date',
            'total_amount'  => 'decimal:2',
            'amount_paid'   => 'decimal:2',
            'amount_due'    => 'decimal:2',
        ];
    }

    public function items(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function supplier(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
