<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Services\DashboardCache;
use App\Services\InvoiceNumberService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class SaleController extends Controller
{
    public function __construct(private InvoiceNumberService $invoices) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Sale::where('tenant_id', $request->user()->tenant_id)
                ->with(['customer', 'user', 'branch'])
                ->when($request->date_from, fn ($q) => $q->where('sale_date', '>=', $request->date_from))
                ->when($request->date_to, fn ($q) => $q->where('sale_date', '<=', $request->date_to))
                ->when($request->status, fn ($q) => $q->where('status', $request->status))
                ->when($request->payment_status, fn ($q) => $q->where('payment_status', $request->payment_status))
                ->latest()
                ->paginate($request->per_page ?? 20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tenant = $request->user()->tenant;
        $settings = $tenant?->mergedSettings() ?? [];
        $defaultTaxRate = (float) ($settings['default_tax_rate'] ?? 0);
        $allowNegativeStock = (bool) ($settings['allow_negative_stock'] ?? false);

        abort_unless($tenant, 404, 'Tenant not found.');

        $validated = $request->validate([
            'customer_id'    => ['nullable', Rule::exists('customers', 'id')->where('tenant_id', $tenantId)],
            'branch_id'      => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'sale_date'      => ['required', 'date'],
            'payment_method' => ['required', 'in:cash,transfer,pos,wallet'],
            'amount_paid'    => ['required', 'numeric', 'min:0'],
            'discount_amount'=> ['nullable', 'numeric', 'min:0'],
            'notes'          => ['nullable', 'string'],
            'items'          => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', $tenantId)],
            'items.*.quantity'   => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount'   => ['nullable', 'numeric', 'min:0'],
        ]);

        $response = DB::transaction(function () use ($validated, $request, $tenant, $tenantId, $defaultTaxRate, $allowNegativeStock) {
            $subtotal = 0;
            $taxAmount = 0;
            $saleItems = [];

            foreach ($validated['items'] as $item) {
                $product = Product::where('id', $item['product_id'])
                    ->where('tenant_id', $tenantId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($product->track_stock && ! $allowNegativeStock && $product->quantity < $item['quantity']) {
                    return response()->json([
                        'message' => "Insufficient stock for '{$product->name}'. Available: {$product->quantity}",
                    ], 422);
                }

                $lineDiscount = $item['discount'] ?? 0;
                $taxRate = (float) ($product->tax_rate ?? 0);
                if ($taxRate <= 0) {
                    $taxRate = $defaultTaxRate;
                }
                $lineTax = ($item['unit_price'] * $item['quantity']) * ($taxRate / 100);
                $lineSubtotal = ($item['unit_price'] * $item['quantity']) - $lineDiscount;

                $subtotal += $lineSubtotal;
                $taxAmount += $lineTax;

                $saleItems[] = [
                    'product'         => $product,
                    'quantity'        => $item['quantity'],
                    'unit_price'      => $item['unit_price'],
                    'cost_price'      => $product->cost_price,
                    'discount_amount' => $lineDiscount,
                    'tax_amount'      => $lineTax,
                    'subtotal'        => $lineSubtotal,
                ];
            }

            $discountAmount = $validated['discount_amount'] ?? 0;
            $totalAmount = $subtotal + $taxAmount - $discountAmount;
            $amountPaid = $validated['amount_paid'];
            $amountDue = max(0, $totalAmount - $amountPaid);

            $paymentStatus = match (true) {
                $amountPaid >= $totalAmount => 'paid',
                $amountPaid > 0 => 'partial',
                default => 'pending',
            };

            $sale = Sale::create([
                'tenant_id'       => $tenantId,
                'branch_id'       => $validated['branch_id'] ?? null,
                'customer_id'     => $validated['customer_id'] ?? null,
                'user_id'         => $request->user()->id,
                'invoice_number'  => $this->invoices->next($tenantId, $tenant),
                'sale_date'       => $validated['sale_date'],
                'subtotal'        => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount'      => $taxAmount,
                'total_amount'    => $totalAmount,
                'amount_paid'     => $amountPaid,
                'amount_due'      => $amountDue,
                'payment_method'  => $validated['payment_method'],
                'payment_status'  => $paymentStatus,
                'status'          => 'completed',
                'notes'           => $validated['notes'] ?? null,
            ]);

            foreach ($saleItems as $itemData) {
                $product = $itemData['product'];

                SaleItem::create([
                    'sale_id'         => $sale->id,
                    'product_id'      => $product->id,
                    'quantity'        => $itemData['quantity'],
                    'unit_price'      => $itemData['unit_price'],
                    'cost_price'      => $itemData['cost_price'],
                    'discount_amount' => $itemData['discount_amount'],
                    'tax_amount'      => $itemData['tax_amount'],
                    'subtotal'        => $itemData['subtotal'],
                ]);

                if ($product->track_stock) {
                    $before = $product->quantity;
                    $product->decrement('quantity', $itemData['quantity']);

                    StockMovement::create([
                        'tenant_id'       => $tenantId,
                        'product_id'      => $product->id,
                        'branch_id'       => $sale->branch_id,
                        'user_id'         => $request->user()->id,
                        'type'            => 'stock_out',
                        'quantity'        => $itemData['quantity'],
                        'quantity_before' => $before,
                        'quantity_after'  => $before - $itemData['quantity'],
                        'reference_type'  => 'sale',
                        'reference_id'    => $sale->id,
                    ]);
                }
            }

            return response()->json([
                'message' => 'Sale created successfully.',
                'sale'    => $sale->load(['items.product', 'customer']),
            ], 201);
        });

        if ($response->isSuccessful()) {
            DashboardCache::forget((int) $tenantId);
        }

        return $response;
    }

    public function show(Request $request, Sale $sale): JsonResponse
    {
        abort_if($sale->tenant_id !== $request->user()->tenant_id, 403);

        return response()->json($sale->load(['items.product', 'customer', 'user', 'branch']));
    }

    public function pdf(Request $request, Sale $sale): Response
    {
        abort_if($sale->tenant_id !== $request->user()->tenant_id, 403);

        $sale->load(['items.product', 'customer', 'branch', 'user']);
        $tenant = $request->user()->tenant;

        abort_unless($tenant, 404, 'Tenant not found.');

        $filename = 'receipt-'.preg_replace('/[^A-Za-z0-9\-_]/', '-', $sale->invoice_number).'.pdf';

        return Pdf::loadView('pdf.sale-receipt', compact('sale', 'tenant'))
            ->download($filename);
    }
}
