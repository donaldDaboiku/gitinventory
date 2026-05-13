<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(Branch::where('tenant_id', $request->user()->tenant_id)->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'    => ['required', 'string', 'max:255'],
            'code'    => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'city'    => ['nullable', 'string'],
            'state'   => ['nullable', 'string'],
            'phone'   => ['nullable', 'string'],
            'email'   => ['nullable', 'email'],
        ]);
        return response()->json(Branch::create([...$data, 'tenant_id' => $request->user()->tenant_id]), 201);
    }

    public function show(Request $request, Branch $branch): JsonResponse
    {
        abort_if($branch->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($branch);
    }

    public function update(Request $request, Branch $branch): JsonResponse
    {
        abort_if($branch->tenant_id !== $request->user()->tenant_id, 403);

        $branch->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'state' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'is_active' => ['boolean'],
        ]));

        return response()->json($branch);
    }

    public function destroy(Request $request, Branch $branch): JsonResponse
    {
        abort_if($branch->tenant_id !== $request->user()->tenant_id, 403);
        abort_if($branch->is_main, 422, 'Cannot delete the main branch.');
        $branch->delete();
        return response()->json(['message' => 'Branch deleted.']);
    }
}
