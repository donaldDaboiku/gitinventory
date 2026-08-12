<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PermissionEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_sales_staff_cannot_create_purchases(): void
    {
        $user = $this->userWithRole('sales_staff');

        Sanctum::actingAs($user);

        $this->postJson('/api/purchases', [
            'purchase_date' => now()->toDateString(),
            'amount_paid'   => 0,
            'items'         => [],
        ])->assertForbidden();
    }

    public function test_sales_staff_cannot_export_financial_reports(): void
    {
        $user = $this->userWithRole('sales_staff');

        Sanctum::actingAs($user);

        $this->get('/api/reports/financial/export')->assertForbidden();
    }

    public function test_sales_staff_cannot_delete_products(): void
    {
        $user = $this->userWithRole('sales_staff');
        $product = Product::create([
            'tenant_id'     => $user->tenant_id,
            'name'          => 'Widget',
            'unit'          => 'piece',
            'cost_price'    => 100,
            'selling_price' => 200,
            'quantity'      => 5,
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson("/api/products/{$product->id}")->assertForbidden();
    }

    private function userWithRole(string $role): User
    {
        $tenant = Tenant::create([
            'name'          => 'Role Test Co',
            'slug'          => "role-{$role}",
            'email'         => "{$role}@example.com",
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole($role);

        return $user;
    }
}
