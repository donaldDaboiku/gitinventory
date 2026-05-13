<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
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

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'category_id'     => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'branch_id'       => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'sku'             => ['nullable', 'string', 'max:100'],
            'barcode'         => ['nullable', 'string', 'max:100'],
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

        $product = Product::create([
            ...$validated,
            'tenant_id' => $tenantId,
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

        return response()->json([
            'message' => 'Product created successfully.',
            'product' => $product->load(['category', 'branch']),
        ], 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);

        return response()->json($product->load(['category', 'branch', 'stockMovements' => fn ($q) => $q->latest()->limit(20)]));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name'            => ['sometimes', 'string', 'max:255'],
            'category_id'     => ['nullable', Rule::exists('categories', 'id')->where('tenant_id', $tenantId)],
            'branch_id'       => ['nullable', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
            'sku'             => ['nullable', 'string', 'max:100'],
            'barcode'         => ['nullable', 'string', 'max:100'],
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

        return response()->json([
            'message' => 'Product updated successfully.',
            'product' => $product->fresh(['category', 'branch']),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);
        $product->delete();
        return response()->json(['message' => 'Product deleted successfully.']);
    }

    private function authorizeProduct(Request $request, Product $product): void
    {
        abort_if($product->tenant_id !== $request->user()->tenant_id, 403, 'Access denied.');
    }
}
