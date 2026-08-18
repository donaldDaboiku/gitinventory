<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\DashboardCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StockController extends Controller
{
    public function stockIn(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'product_id'     => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'quantity'       => ['required', 'integer', 'min:1'],
            'unit_cost'      => ['nullable', 'numeric', 'min:0'],
            'reference_type' => ['nullable', 'string'],
            'reference_id'   => ['nullable', 'integer'],
            'note'           => ['nullable', 'string'],
        ]);

        $response = DB::transaction(function () use ($validated, $request) {
            $product = Product::where('id', $validated['product_id'])
                ->where('tenant_id', $request->user()->tenant_id)
                ->lockForUpdate()
                ->firstOrFail();

            $before = $product->quantity;
            $product->increment('quantity', $validated['quantity']);

            StockMovement::create([
                'tenant_id'       => $request->user()->tenant_id,
                'product_id'      => $product->id,
                'branch_id'       => $product->branch_id,
                'user_id'         => $request->user()->id,
                'type'            => 'stock_in',
                'quantity'        => $validated['quantity'],
                'quantity_before' => $before,
                'quantity_after'  => $before + $validated['quantity'],
                'reference_type'  => $validated['reference_type'] ?? null,
                'reference_id'    => $validated['reference_id'] ?? null,
                'unit_cost'       => $validated['unit_cost'] ?? $product->cost_price,
                'note'            => $validated['note'] ?? null,
            ]);

            return response()->json([
                'message'         => 'Stock added successfully.',
                'product_id'      => $product->id,
                'quantity_before' => $before,
                'quantity_after'  => $product->fresh()->quantity,
            ]);
        });

        DashboardCache::forget((int) $tenantId);

        return $response;
    }

    public function stockOut(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'product_id'     => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'quantity'       => ['required', 'integer', 'min:1'],
            'reference_type' => ['nullable', 'string'],
            'reference_id'   => ['nullable', 'integer'],
            'note'           => ['nullable', 'string'],
        ]);

        $response = DB::transaction(function () use ($validated, $request) {
            $product = Product::where('id', $validated['product_id'])
                ->where('tenant_id', $request->user()->tenant_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($product->quantity < $validated['quantity']) {
                return response()->json([
                    'message' => "Insufficient stock. Available: {$product->quantity}",
                ], 422);
            }

            $before = $product->quantity;
            $product->decrement('quantity', $validated['quantity']);

            StockMovement::create([
                'tenant_id'       => $request->user()->tenant_id,
                'product_id'      => $product->id,
                'branch_id'       => $product->branch_id,
                'user_id'         => $request->user()->id,
                'type'            => 'stock_out',
                'quantity'        => $validated['quantity'],
                'quantity_before' => $before,
                'quantity_after'  => $before - $validated['quantity'],
                'reference_type'  => $validated['reference_type'] ?? null,
                'reference_id'    => $validated['reference_id'] ?? null,
                'note'            => $validated['note'] ?? null,
            ]);

            return response()->json([
                'message'         => 'Stock removed successfully.',
                'product_id'      => $product->id,
                'quantity_before' => $before,
                'quantity_after'  => $product->fresh()->quantity,
            ]);
        });

        if ($response->isSuccessful()) {
            DashboardCache::forget((int) $tenantId);
        }

        return $response;
    }

    public function adjust(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'product_id'      => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'new_quantity'    => ['required', 'integer', 'min:0'],
            'note'            => ['required', 'string', 'max:500'],
        ]);

        $response = DB::transaction(function () use ($validated, $request) {
            $product = Product::where('id', $validated['product_id'])
                ->where('tenant_id', $request->user()->tenant_id)
                ->lockForUpdate()
                ->firstOrFail();

            $before = $product->quantity;
            $diff   = $validated['new_quantity'] - $before;

            $product->update(['quantity' => $validated['new_quantity']]);

            StockMovement::create([
                'tenant_id'       => $request->user()->tenant_id,
                'product_id'      => $product->id,
                'branch_id'       => $product->branch_id,
                'user_id'         => $request->user()->id,
                'type'            => 'adjustment',
                'quantity'        => abs($diff),
                'quantity_before' => $before,
                'quantity_after'  => $validated['new_quantity'],
                'reference_type'  => 'manual_adjustment',
                'note'            => $validated['note'],
            ]);

            return response()->json([
                'message'         => 'Stock adjusted successfully.',
                'product_id'      => $product->id,
                'quantity_before' => $before,
                'quantity_after'  => $validated['new_quantity'],
                'difference'      => $diff,
            ]);
        });

        DashboardCache::forget((int) $tenantId);

        return $response;
    }

    public function movements(Request $request): JsonResponse
    {
        $movements = StockMovement::where('tenant_id', $request->user()->tenant_id)
            ->with(['product', 'user', 'branch'])
            ->when($request->product_id, fn ($q) => $q->where('product_id', $request->product_id))
            ->when($request->type, fn ($q) => $q->where('type', $request->type))
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json($movements);
    }
}
