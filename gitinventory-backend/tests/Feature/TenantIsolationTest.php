<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_product_search_does_not_return_products_from_other_tenants(): void
    {
        $user = $this->userForTenant();
        $otherTenant = Tenant::create([
            'name' => 'Other Business',
            'slug' => 'other-business',
            'email' => 'other@example.com',
        ]);

        Product::create($this->productData([
            'tenant_id' => $user->tenant_id,
            'name' => 'Local Item',
            'sku' => 'LOCAL-001',
        ]));

        Product::create($this->productData([
            'tenant_id' => $otherTenant->id,
            'name' => 'Remote Item',
            'sku' => 'REMOTE-001',
        ]));

        Sanctum::actingAs($user);

        $this->getJson('/api/products?search=REMOTE')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_global_scope_hides_other_tenant_products_without_manual_filter(): void
    {
        $user = $this->userForTenant();
        $otherTenant = Tenant::create([
            'name' => 'Scope Other',
            'slug' => 'scope-other',
            'email' => 'scope-other@example.com',
        ]);

        Product::create($this->productData([
            'tenant_id' => $user->tenant_id,
            'name' => 'Mine',
            'sku' => 'MINE-001',
        ]));

        Product::create($this->productData([
            'tenant_id' => $otherTenant->id,
            'name' => 'Theirs',
            'sku' => 'THEIRS-001',
        ]));

        Sanctum::actingAs($user);

        $visible = Product::query()->pluck('name')->all();

        $this->assertSame(['Mine'], $visible);
        $this->assertSame(2, Product::withoutGlobalScopes()->count());
    }

    public function test_product_cannot_use_category_from_another_tenant(): void
    {
        $user = $this->userForTenant();
        $otherTenant = Tenant::create([
            'name' => 'Other Business',
            'slug' => 'other-business',
            'email' => 'other@example.com',
        ]);
        $otherCategory = Category::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Category',
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/products', $this->productData([
            'category_id' => $otherCategory->id,
        ]))->assertUnprocessable();
    }

    public function test_sale_cannot_use_customer_or_product_from_another_tenant(): void
    {
        $user = $this->userForTenant();
        $otherTenant = Tenant::create([
            'name' => 'Other Business',
            'slug' => 'other-business',
            'email' => 'other@example.com',
        ]);
        $otherCustomer = Customer::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Customer',
        ]);
        $otherProduct = Product::create($this->productData([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Product',
        ]));

        Sanctum::actingAs($user);

        $this->postJson('/api/sales', [
            'customer_id' => $otherCustomer->id,
            'sale_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'amount_paid' => 1000,
            'items' => [[
                'product_id' => $otherProduct->id,
                'quantity' => 1,
                'unit_price' => 1000,
            ]],
        ])->assertUnprocessable();
    }

    public function test_purchase_cannot_use_supplier_or_product_from_another_tenant(): void
    {
        $user = $this->userForTenant();
        $otherTenant = Tenant::create([
            'name' => 'Other Business',
            'slug' => 'other-business',
            'email' => 'other@example.com',
        ]);
        $otherSupplier = Supplier::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Supplier',
        ]);
        $otherProduct = Product::create($this->productData([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Product',
        ]));

        Sanctum::actingAs($user);

        $this->postJson('/api/purchases', [
            'supplier_id' => $otherSupplier->id,
            'purchase_date' => now()->toDateString(),
            'amount_paid' => 0,
            'items' => [[
                'product_id' => $otherProduct->id,
                'quantity_ordered' => 5,
                'quantity_received' => 5,
                'unit_cost' => 400,
            ]],
        ])->assertUnprocessable();
    }

    public function test_product_show_returns_not_found_for_other_tenant_product(): void
    {
        $user = $this->userForTenant();
        $otherTenant = Tenant::create([
            'name'          => 'Other Business',
            'slug'          => 'other-business-show',
            'email'         => 'other-show@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $otherProduct = Product::create($this->productData([
            'tenant_id' => $otherTenant->id,
            'name'      => 'Remote Item',
        ]));

        Sanctum::actingAs($user);

        $this->getJson("/api/products/{$otherProduct->id}")->assertNotFound();
    }

    private function userForTenant(): User
    {
        $tenant = Tenant::create([
            'name'          => 'Demo Business',
            'slug'          => 'demo-business',
            'email'         => 'demo@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function productData(array $overrides = []): array
    {
        return array_merge([
            'tenant_id' => null,
            'name' => 'Test Product',
            'unit' => 'piece',
            'cost_price' => 500,
            'selling_price' => 1000,
            'quantity' => 10,
            'min_stock_level' => 2,
        ], $overrides);
    }
}
