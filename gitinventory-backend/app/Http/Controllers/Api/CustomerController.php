<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $likeOperator = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        return response()->json(
            Customer::where('tenant_id', $request->user()->tenant_id)
                ->when($request->search, fn ($q) => $q->where(function ($query) use ($request, $likeOperator) {
                    $query->where('name', $likeOperator, "%{$request->search}%")
                        ->orWhere('phone', 'like', "%{$request->search}%");
                }))
                ->latest()->paginate(20)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'email'        => ['nullable', 'email'],
            'phone'        => ['nullable', 'string'],
            'address'      => ['nullable', 'string'],
            'city'         => ['nullable', 'string'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $customer = Customer::create([...$data, 'tenant_id' => $request->user()->tenant_id]);
        return response()->json(['message' => 'Customer created.', 'customer' => $customer], 201);
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        abort_if($customer->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($customer->load(['sales' => fn ($q) => $q->latest()->limit(10)]));
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        abort_if($customer->tenant_id !== $request->user()->tenant_id, 403);
        $customer->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['boolean'],
        ]));
        return response()->json(['message' => 'Customer updated.', 'customer' => $customer]);
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        abort_if($customer->tenant_id !== $request->user()->tenant_id, 403);
        $customer->delete();
        return response()->json(['message' => 'Customer deleted.']);
    }
}
