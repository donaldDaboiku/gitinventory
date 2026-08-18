<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use App\Services\DashboardCache;
use App\Services\PurchaseImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseController extends Controller
{
    public function __construct(private PurchaseImportService $importer) {}

    public function importTemplate(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['product_id', 'quantity', 'unit_cost', 'supplier']);
            fputcsv($out, ['SKU-001', '10', '50.00', 'Acme Supplies']);
            fclose($out);
        }, 'purchase-import-template.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $contents = file_get_contents($request->file('file')->getRealPath() ?: '');
        if ($contents === false || trim($contents) === '') {
            return response()->json(['message' => 'Could not read CSV file.'], 422);
        }

        try {
            $result = $this->importer->import($request->user(), $contents);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($result['imported'] > 0) {
            DashboardCache::forget((int) $request->user()->tenant_id);
        }

        return response()->json([
            'message'  => "Imported {$result['imported']} line(s). {$result['failed']} row(s) failed.",
            'imported' => $result['imported'],
            'failed'   => $result['failed'],
            'errors'   => $result['errors'],
        ], $result['imported'] > 0 ? 201 : 422);
    }
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Purchase::where('tenant_id', $request->user()->tenant_id)
                ->with(['supplier', 'user'])
                ->when($request->date_from, fn ($q) => $q->where('purchase_date', '>=', $request->date_from))
                ->when($request->date_to, fn ($q) => $q->where('purchase_date', '<=', $request->date_to))
                ->when($request->payment_status, fn ($q) => $q->where('payment_status', $request->payment_status))
                ->latest()
                ->paginate($request->per_page ?? 20)
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

        $response = DB::transaction(function () use ($validated, $request) {
            $tenantId   = $request->user()->tenant_id;
            $total      = 0;
            $amountPaid = $validated['amount_paid'] ?? 0;

            foreach ($validated['items'] as $item) {
                $total += $item['unit_cost'] * $item['quantity_received'];
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
                    'subtotal'          => $item['unit_cost'] * $item['quantity_received'],
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

        DashboardCache::forget((int) $tenantId);

        return $response;
    }

    public function show(Request $request, Purchase $purchase): JsonResponse
    {
        abort_if($purchase->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($purchase->load(['items.product', 'supplier']));
    }
}
