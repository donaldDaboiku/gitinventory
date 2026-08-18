<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PurchaseImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_purchase_csv_import_creates_purchase_and_updates_stock(): void
    {
        $user = $this->owner();
        $product = Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'Widget',
            'sku' => 'WDG-001',
            'quantity' => 5,
            'cost_price' => 10,
            'selling_price' => 20,
        ]);

        Sanctum::actingAs($user);

        $csv = "product_id,quantity,unit_cost,supplier\n{$product->id},10,15.00,Acme Supplies";
        $file = UploadedFile::fake()->createWithContent('purchases.csv', $csv);

        $this->postJson('/api/purchases/import', ['file' => $file])
            ->assertCreated()
            ->assertJsonFragment(['imported' => 1, 'failed' => 0]);

        $this->assertDatabaseHas('purchases', [
            'tenant_id' => $user->tenant_id,
            'payment_status' => 'pending',
        ]);

        $product->refresh();
        $this->assertEquals(15, $product->quantity);
        $this->assertEquals('15.00', $product->cost_price);
    }

    public function test_purchase_csv_import_resolves_product_by_sku(): void
    {
        $user = $this->owner();
        $product = Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'Gizmo',
            'sku' => 'GIZ-001',
            'quantity' => 0,
            'cost_price' => 10,
            'selling_price' => 25,
        ]);

        Sanctum::actingAs($user);

        $csv = "product_id,quantity,unit_cost,supplier\nGIZ-001,5,12.00,";
        $file = UploadedFile::fake()->createWithContent('purchases.csv', $csv);

        $this->postJson('/api/purchases/import', ['file' => $file])
            ->assertCreated()
            ->assertJsonFragment(['imported' => 1]);

        $product->refresh();
        $this->assertEquals(5, $product->quantity);
    }

    public function test_purchase_csv_import_rejects_missing_columns(): void
    {
        $user = $this->owner();
        Sanctum::actingAs($user);

        $csv = "product_id,quantity\n1,10";
        $file = UploadedFile::fake()->createWithContent('purchases.csv', $csv);

        $this->postJson('/api/purchases/import', ['file' => $file])
            ->assertUnprocessable()
            ->assertJsonFragment(['message' => 'Missing required CSV column: unit_cost']);
    }

    public function test_purchase_csv_groups_rows_by_supplier(): void
    {
        $user = $this->owner();
        $p1 = Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'A',
            'quantity' => 0,
            'cost_price' => 1,
            'selling_price' => 2,
        ]);
        $p2 = Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'B',
            'quantity' => 0,
            'cost_price' => 1,
            'selling_price' => 2,
        ]);

        Sanctum::actingAs($user);

        $csv = "product_id,quantity,unit_cost,supplier\n{$p1->id},3,10,SupplierX\n{$p2->id},2,20,SupplierY";
        $file = UploadedFile::fake()->createWithContent('purchases.csv', $csv);

        $this->postJson('/api/purchases/import', ['file' => $file])
            ->assertCreated()
            ->assertJsonFragment(['imported' => 2]);

        $this->assertDatabaseCount('purchases', 2);
        $this->assertDatabaseHas('suppliers', ['name' => 'SupplierX', 'tenant_id' => $user->tenant_id]);
        $this->assertDatabaseHas('suppliers', ['name' => 'SupplierY', 'tenant_id' => $user->tenant_id]);
    }

    public function test_purchase_import_template_downloads(): void
    {
        $user = $this->owner();
        Sanctum::actingAs($user);

        $this->get('/api/purchases/import/template')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Test Co',
            'slug' => 'test-co-'.uniqid(),
            'email' => 'test@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
