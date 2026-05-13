<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Product extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'category_id',
        'name',
        'sku',
        'barcode',
        'description',
        'unit',
        'cost_price',
        'selling_price',
        'tax_rate',
        'quantity',
        'min_stock_level',
        'expiry_date',
        'image',
        'is_active',
        'track_stock',
    ];

    protected function casts(): array
    {
        return [
            'cost_price'    => 'decimal:2',
            'selling_price' => 'decimal:2',
            'tax_rate'      => 'decimal:2',
            'quantity'      => 'integer',
            'expiry_date'   => 'date',
            'is_active'     => 'boolean',
            'track_stock'   => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'quantity', 'selling_price', 'cost_price'])
            ->logOnlyDirty();
    }

    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function branch(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function category(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stockMovements(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock_level;
    }

    public function isExpired(): bool
    {
        return $this->expiry_date && $this->expiry_date->isPast();
    }

    public function profitMargin(): float
    {
        if ($this->cost_price <= 0) return 0;
        return (($this->selling_price - $this->cost_price) / $this->cost_price) * 100;
    }
}
