<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            Category::where('tenant_id', $request->user()->tenant_id)->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $category = Category::create([...$data, 'tenant_id' => $request->user()->tenant_id]);

        return response()->json(['message' => 'Category created.', 'category' => $category], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        abort_if($category->tenant_id !== $request->user()->tenant_id, 403);
        $category->update($request->validate(['name' => 'required|string|max:255', 'description' => 'nullable|string']));
        return response()->json(['message' => 'Category updated.', 'category' => $category]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        abort_if($category->tenant_id !== $request->user()->tenant_id, 403);
        $category->delete();
        return response()->json(['message' => 'Category deleted.']);
    }

    public function show(Request $request, Category $category): JsonResponse
    {
        abort_if($category->tenant_id !== $request->user()->tenant_id, 403);
        return response()->json($category);
    }
}
