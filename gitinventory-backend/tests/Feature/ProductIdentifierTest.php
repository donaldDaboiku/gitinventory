<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductIdentifierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_product_store_auto_generates_sku_and_barcode_when_omitted(): void
    {
        $user = $this->userForTenant();

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/products', [
            'name'          => 'Auto Coded Item',
            'unit'          => 'piece',
            'cost_price'    => 100,
            'selling_price' => 200,
            'quantity'      => 1,
        ])->assertCreated();

        $response->assertJsonPath('product.sku', 'SKU-00001');
        $this->assertMatchesRegularExpression('/^\d{13}$/', $response->json('product.barcode'));
    }

    public function test_preview_codes_endpoint_returns_next_sku_and_barcode(): void
    {
        $user = $this->userForTenant();

        Sanctum::actingAs($user);

        $this->getJson('/api/products/codes/preview')
            ->assertOk()
            ->assertJsonStructure(['sku', 'barcode'])
            ->assertJsonPath('sku', 'SKU-00001');
    }

    private function userForTenant(): User
    {
        $tenant = Tenant::create([
            'name'          => 'Code Test Co',
            'slug'          => 'code-test',
            'email'         => 'code@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
