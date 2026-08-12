<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StockOperationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_stock_in_increases_product_quantity(): void
    {
        $user = $this->userForTenant();
        $product = Product::create($this->productData(['tenant_id' => $user->tenant_id, 'quantity' => 5]));

        Sanctum::actingAs($user);

        $this->postJson('/api/stock/in', [
            'product_id' => $product->id,
            'quantity'   => 3,
            'note'       => 'Restock',
        ])->assertOk();

        $this->assertSame(8, $product->fresh()->quantity);
    }

    public function test_stock_out_fails_when_insufficient_quantity(): void
    {
        $user = $this->userForTenant();
        $product = Product::create($this->productData(['tenant_id' => $user->tenant_id, 'quantity' => 2]));

        Sanctum::actingAs($user);

        $this->postJson('/api/stock/out', [
            'product_id' => $product->id,
            'quantity'   => 5,
        ])->assertUnprocessable();

        $this->assertSame(2, $product->fresh()->quantity);
    }

    private function userForTenant(): User
    {
        $tenant = Tenant::create([
            'name'          => 'Demo Business',
            'slug'          => 'demo-stock',
            'email'         => 'stock@example.com',
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
            'name'            => 'Test Product',
            'unit'            => 'piece',
            'cost_price'      => 500,
            'selling_price'   => 1000,
            'quantity'        => 10,
            'min_stock_level' => 2,
        ], $overrides);
    }
}
