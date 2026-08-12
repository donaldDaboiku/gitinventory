<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Phase4Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_product_lookup_finds_by_barcode_or_sku(): void
    {
        $user = $this->userForTenant();
        $product = Product::create($this->productData([
            'tenant_id' => $user->tenant_id,
            'sku'       => 'SKU-LOOKUP',
            'barcode'   => '2000000000017',
        ]));

        Sanctum::actingAs($user);

        $this->getJson('/api/products/lookup?code=2000000000017')
            ->assertOk()
            ->assertJsonPath('product.id', $product->id);

        $this->getJson('/api/products/lookup?code=SKU-LOOKUP')
            ->assertOk()
            ->assertJsonPath('product.id', $product->id);

        $this->getJson('/api/products/lookup?code=missing')
            ->assertNotFound();
    }

    public function test_sale_uses_tenant_invoice_prefix_and_default_tax_rate(): void
    {
        $user = $this->userForTenant([
            'settings' => [
                'invoice_prefix'   => 'RCPT',
                'default_tax_rate' => 10,
            ],
        ]);

        $product = Product::create($this->productData([
            'tenant_id' => $user->tenant_id,
            'quantity'  => 10,
            'tax_rate'  => 0,
        ]));

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/sales', [
            'sale_date'      => now()->toDateString(),
            'payment_method' => 'cash',
            'amount_paid'    => 1100,
            'items'          => [
                [
                    'product_id' => $product->id,
                    'quantity'   => 1,
                    'unit_price' => 1000,
                ],
            ],
        ])->assertCreated();

        $response->assertJsonPath('sale.invoice_number', 'RCPT-00001');
        $this->assertSame(100.0, (float) $response->json('sale.tax_amount'));
    }

    public function test_sale_pdf_and_financial_pdf_endpoints_return_pdf(): void
    {
        $user = $this->userForTenant();
        $product = Product::create($this->productData(['tenant_id' => $user->tenant_id]));

        Sanctum::actingAs($user);

        $sale = Sale::create([
            'tenant_id'      => $user->tenant_id,
            'user_id'        => $user->id,
            'invoice_number' => 'INV-00001',
            'sale_date'      => now()->toDateString(),
            'subtotal'       => 1000,
            'discount_amount'=> 0,
            'tax_amount'     => 0,
            'total_amount'   => 1000,
            'amount_paid'    => 1000,
            'amount_due'     => 0,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
            'status'         => 'completed',
        ]);

        $today = now()->toDateString();

        $this->get("/api/sales/{$sale->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->get("/api/products/{$product->id}/label")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->get("/api/reports/financial/export/pdf?date_from={$today}&date_to={$today}")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    /**
     * @param array<string, mixed> $tenantOverrides
     */
    private function userForTenant(array $tenantOverrides = []): User
    {
        $tenant = Tenant::create(array_merge([
            'name'          => 'Demo Business',
            'slug'          => 'demo-phase4',
            'email'         => 'phase4@example.com',
            'trial_ends_at' => now()->addDays(14),
        ], $tenantOverrides));

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
            'quantity'        => 5,
            'min_stock_level' => 1,
            'tax_rate'        => 0,
        ], $overrides);
    }
}
