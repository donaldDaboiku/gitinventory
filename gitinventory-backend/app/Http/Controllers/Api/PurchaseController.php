<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PurchaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Purchase::where('tenant_id', $request->user()->tenant_id)
                ->with(['supplier', 'user'])
                ->latest()->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'supplier_id'      => ['nullable', Rule::exists('suppliers', 'id')->where('tenant_id', $tenantId)],
            'branch_id'        => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'purchase_date'    => ['required', 'date'],
            'reference_number' => ['nullable', 'string'],
            'amount_paid'      => ['nullable', 'numeric', 'min:0'],
            'notes'            => ['nullable', 'string'],
            'items'            => ['required', 'array', 'min:1'],
            'items.*.product_id'        => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'items.*.quantity_ordered'  => ['required', 'integer', 'min:1'],
            'items.*.quantity_received' => ['required', 'integer', 'min:0'],
            'items.*.unit_cost'         => ['required', 'numeric', 'min:0'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $tenantId   = $request->user()->tenant_id;
            $total      = 0;
            $amountPaid = $validated['amount_paid'] ?? 0;

            foreach ($validated['items'] as $item) {
                $total += $item['unit_cost'] * $item['quantity_ordered'];
            }

            $purchase = Purchase::create([
                'tenant_id'        => $tenantId,
                'branch_id'        => $validated['branch_id'] ?? null,
                'supplier_id'      => $validated['supplier_id'] ?? null,
                'user_id'          => $request->user()->id,
                'reference_number' => $validated['reference_number'] ?? null,
                'purchase_date'    => $validated['purchase_date'],
                'total_amount'     => $total,
                'amount_paid'      => $amountPaid,
                'amount_due'       => max(0, $total - $amountPaid),
                'payment_status'   => $amountPaid >= $total ? 'paid' : ($amountPaid > 0 ? 'partial' : 'pending'),
                'status'           => 'received',
                'notes'            => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id'       => $purchase->id,
                    'product_id'        => $item['product_id'],
                    'quantity_ordered'  => $item['quantity_ordered'],
                    'quantity_received' => $item['quantity_received'],
                    'unit_cost'         => $item['unit_cost'],
                    'subtotal'          => $item['unit_cost'] * $item['quantity_ordered'],
                ]);

                if ($item['quantity_received'] > 0) {
                    $product = Product::where('tenant_id', $tenantId)
                        ->lockForUpdate()
                        ->findOrFail($item['product_id']);
                    $before  = $product->quantity;
                    $product->increment('quantity', $item['quantity_received']);

                    StockMovement::create([
                        'tenant_id'       => $tenantId,
                        'product_id'      => $product->id,
                        'branch_id'       => $purchase->branch_id,
                        'user_id'         => $request->user()->id,
                        'type'            => 'stock_in',
                        'quantity'        => $item['quantity_received'],
                        'quantity_before' => $before,
                        'quantity_after'  => $before + $item['quantity_received'],
                        'reference_type'  => 'purchase',
                        'reference_id'    => $purchase->id,
                        'unit_cost'       => $item['unit_cost'],
                    ]);

                    // Update cost price if changed
                    $product->update(['cost_price' => $item['unit_cost']]);
                }
            }

            return response()->json(['message' => 'Purchase recorded.', 'purchase' => $purchase->load('items.product')], 201);
        });
    }

    public function show(Request $request, Purchase $purchase): JsonResponse
    {
        abort_if($purchase->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($purchase->load(['items.product', 'supplier']));
    }
}
