<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\DashboardCache;
use App\Services\BarcodeImageService;
use App\Services\ProductIdentifierService;
use App\Services\ProductImportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function __construct(
        private ProductIdentifierService $identifiers,
        private BarcodeImageService $barcodes,
        private ProductImportService $importer,
    ) {}

    public function importTemplate(): StreamedResponse
    {
        $filename = 'product-import-template.csv';

        return response()->streamDownload(function () {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['name', 'unit', 'cost_price', 'selling_price', 'quantity', 'sku', 'barcode', 'min_stock_level', 'tax_rate', 'category']);
            fputcsv($out, ['Paracetamol 500mg', 'piece', '50', '100', '20', '', '', '5', '0', 'Medicine']);
            fclose($out);
        }, $filename, [
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
            'message'  => "Imported {$result['imported']} product(s). {$result['failed']} row(s) failed.",
            'imported' => $result['imported'],
            'failed'   => $result['failed'],
            'errors'   => $result['errors'],
        ], $result['imported'] > 0 ? 201 : 422);
    }

    public function previewCodes(Request $request): JsonResponse
    {
        return response()->json(
            $this->identifiers->preview($request->user()->tenant_id)
        );
    }

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        $products = Product::where('tenant_id', $tenantId)
            ->with(['category', 'branch'])
            ->when($request->search, fn ($q) => $q->where(function ($query) use ($request, $likeOperator) {
                $query->where('name', $likeOperator, "%{$request->search}%")
                    ->orWhere('sku', $likeOperator, "%{$request->search}%")
                    ->orWhere('barcode', $likeOperator, "%{$request->search}%");
            }))
            ->when($request->category_id, fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->branch_id, fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->low_stock, fn ($q) => $q->whereColumn('quantity', '<=', 'min_stock_level'))
            ->when($request->expiring_soon, fn ($q) => $q->whereNotNull('expiry_date')
                ->where('expiry_date', '<=', now()->addDays(30)))
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json($products);
    }

    public function lookup(Request $request): JsonResponse
    {
        $code = trim($request->validate(['code' => ['required', 'string', 'max:100']])['code']);
        $tenantId = $request->user()->tenant_id;

        $product = Product::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where(function ($query) use ($code) {
                $query->where('barcode', $code)->orWhere('sku', $code);
            })
            ->first();

        if (! $product) {
            return response()->json(['message' => 'Product not found for this code.'], 404);
        }

        return response()->json([
            'product' => [
                'id'            => $product->id,
                'name'          => $product->name,
                'sku'           => $product->sku,
                'barcode'       => $product->barcode,
                'selling_price' => $product->selling_price,
                'quantity'      => $product->quantity,
                'tax_rate'      => $product->tax_rate,
                'unit'          => $product->unit,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'category_id'     => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'branch_id'       => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'sku'             => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->where('tenant_id', $tenantId)],
            'barcode'         => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->where('tenant_id', $tenantId)],
            'unit'            => ['required', 'string', 'in:piece,kg,litre,box,pack,dozen,carton'],
            'cost_price'      => ['required', 'numeric', 'min:0'],
            'selling_price'   => ['required', 'numeric', 'min:0'],
            'tax_rate'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'quantity'        => ['required', 'integer', 'min:0'],
            'min_stock_level' => ['nullable', 'integer', 'min:0'],
            'expiry_date'     => ['nullable', 'date', 'after:today'],
            'description'     => ['nullable', 'string'],
            'track_stock'     => ['boolean'],
        ]);

        $validated = $this->identifiers->ensureIdentifiers($validated, $tenantId);
        $settings = $request->user()->tenant?->mergedSettings() ?? [];

        $product = Product::create([
            ...$validated,
            'tenant_id'       => $tenantId,
            'min_stock_level' => $validated['min_stock_level'] ?? ($settings['default_min_stock_level'] ?? 0),
            'tax_rate'        => $validated['tax_rate'] ?? ($settings['default_tax_rate'] ?? 0),
        ]);

        // Log initial stock movement if quantity > 0
        if ($validated['quantity'] > 0) {
            \App\Models\StockMovement::create([
                'tenant_id'      => $product->tenant_id,
                'product_id'     => $product->id,
                'branch_id'      => $product->branch_id,
                'user_id'        => $request->user()->id,
                'type'           => 'stock_in',
                'quantity'       => $validated['quantity'],
                'quantity_before' => 0,
                'quantity_after'  => $validated['quantity'],
                'reference_type' => 'opening_stock',
                'note'           => 'Opening stock entry',
                'unit_cost'      => $validated['cost_price'],
            ]);
        }

        DashboardCache::forget($tenantId);

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $product->load(['category', 'branch']),
        ], 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        return response()->json($product->load(['category', 'branch', 'stockMovements' => fn ($q) => $q->latest()->limit(20)]));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name'            => ['sometimes', 'string', 'max:255'],
            'category_id'     => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'branch_id'       => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'sku'             => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->where('tenant_id', $tenantId)->ignore($product->id)],
            'barcode'         => ['nullable', 'string', 'max:100', Rule::unique('products', 'barcode')->where('tenant_id', $tenantId)->ignore($product->id)],
            'unit'            => ['sometimes', 'string'],
            'cost_price'      => ['sometimes', 'numeric', 'min:0'],
            'selling_price'   => ['sometimes', 'numeric', 'min:0'],
            'tax_rate'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'min_stock_level' => ['nullable', 'integer', 'min:0'],
            'expiry_date'     => ['nullable', 'date'],
            'description'     => ['nullable', 'string'],
            'is_active'       => ['boolean'],
        ]);

        $product->update($validated);
        DashboardCache::forget($tenantId);

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $product->fresh(['category', 'branch']),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $tenantId = (int) $product->tenant_id;
        $product->delete();
        DashboardCache::forget($tenantId);

        return response()->json(['message' => 'Product deleted successfully.']);
    }

    public function label(Request $request, Product $product): Response
    {
        abort_if($product->tenant_id !== $request->user()->tenant_id, 403);

        $tenant = $request->user()->tenant;
        abort_unless($tenant, 404, 'Tenant not found.');

        $code = $product->barcode ?: $product->sku;
        $barcodeSvg = $code ? $this->barcodes->svg($code) : '';

        $filename = 'label-'.preg_replace('/[^A-Za-z0-9\-_]/', '-', (string) $product->id).'.pdf';

        return Pdf::loadView('pdf.product-label', compact('product', 'tenant', 'barcodeSvg'))
            ->setPaper([0, 0, 226.77, 113.39])
            ->download($filename);
    }
}
