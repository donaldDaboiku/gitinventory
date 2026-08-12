<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class TeamUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::where('tenant_id', $request->user()->tenant_id)
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => $this->formatUser($user));

        return response()->json(['users' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'role'     => ['required', 'string', Rule::in($this->assignableRoles($request->user()))],
        ]);

        $user = User::create([
            'tenant_id' => $tenantId,
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'phone'     => $validated['phone'] ?? null,
            'password'  => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        $user->assignRole($validated['role']);

        return response()->json([
            'message' => 'Team member invited successfully.',
            'user'    => $this->formatUser($user->fresh()),
        ], 201);
    }

    public function update(Request $request, User $teamMember): JsonResponse
    {
        abort_if($teamMember->tenant_id !== $request->user()->tenant_id, 403);

        $validated = $request->validate([
            'name'      => ['sometimes', 'string', 'max:255'],
            'phone'     => ['nullable', 'string', 'max:30'],
            'is_active' => ['sometimes', 'boolean'],
            'role'      => ['sometimes', 'string', Rule::in($this->assignableRoles($request->user()))],
        ]);

        if (array_key_exists('is_active', $validated) && ! $validated['is_active'] && $teamMember->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        if (isset($validated['role'])) {
            if ($teamMember->hasRole('owner') && $validated['role'] !== 'owner' && $this->ownerCount($request->user()->tenant_id) <= 1) {
                return response()->json(['message' => 'At least one owner is required.'], 422);
            }

            $teamMember->syncRoles([$validated['role']]);
            unset($validated['role']);
        }

        $teamMember->update($validated);

        return response()->json([
            'message' => 'Team member updated.',
            'user'    => $this->formatUser($teamMember->fresh()),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatUser(User $user): array
    {
        return [
            'id'            => $user->id,
            'name'          => $user->name,
            'email'         => $user->email,
            'phone'         => $user->phone,
            'is_active'     => $user->is_active,
            'roles'         => $user->getRoleNames(),
            'last_login_at' => $user->last_login_at,
        ];
    }

    /**
     * @return list<string>
     */
    private function assignableRoles(User $actor): array
    {
        $roles = ['manager', 'sales_staff', 'inventory_officer', 'accountant'];

        if ($actor->hasRole('owner')) {
            array_unshift($roles, 'owner');
        }

        return $roles;
    }

    private function ownerCount(int $tenantId): int
    {
        return User::where('tenant_id', $tenantId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'owner'))
            ->count();
    }
}
