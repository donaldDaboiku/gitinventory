<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Supplier::where('tenant_id', $request->user()->tenant_id)->latest()->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
        ]);
        return response()->json(['supplier' => Supplier::create([...$data, 'tenant_id' => $request->user()->tenant_id])], 201);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        abort_if($supplier->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($supplier);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        abort_if($supplier->tenant_id !== $request->user()->tenant_id, 403);

        $supplier->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]));

        return response()->json(['supplier' => $supplier]);
    }

    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        abort_if($supplier->tenant_id !== $request->user()->tenant_id, 403);
        $supplier->delete();
        return response()->json(['message' => 'Supplier deleted.']);
    }
}
