<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\DashboardController;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_dashboard_response_is_cached_per_tenant(): void
    {
        $user = $this->owner();
        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonStructure(['metrics', 'charts']);

        $this->assertTrue(Cache::has(DashboardController::cacheKey($user->tenant_id)));
    }

    public function test_stock_changes_invalidate_dashboard_cache(): void
    {
        $user = $this->owner();
        $product = Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'Stock cache test product',
            'quantity' => 1,
        ]);
        $key = DashboardController::cacheKey($user->tenant_id);
        Cache::put($key, ['cached' => true], 60);

        Sanctum::actingAs($user);

        $this->postJson('/api/stock/in', [
            'product_id' => $product->id,
            'quantity' => 1,
        ])->assertOk();

        $this->assertFalse(Cache::has($key));
    }

    public function test_sales_invalidate_dashboard_cache(): void
    {
        $user = $this->owner();
        $product = Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'Sale cache test product',
            'quantity' => 2,
            'cost_price' => 50,
            'selling_price' => 100,
        ]);
        $key = DashboardController::cacheKey($user->tenant_id);
        Cache::put($key, ['cached' => true], 60);

        Sanctum::actingAs($user);

        $this->postJson('/api/sales', [
            'sale_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'amount_paid' => 100,
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'unit_price' => 100,
            ]],
        ])->assertCreated();

        $this->assertFalse(Cache::has($key));
    }

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Dash Co',
            'slug' => 'dash-co',
            'email' => 'dash@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
