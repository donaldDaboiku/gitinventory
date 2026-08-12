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

class ProductImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_owner_can_download_import_template(): void
    {
        Sanctum::actingAs($this->owner());

        $this->get('/api/products/import/template')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    public function test_owner_can_import_products_from_csv(): void
    {
        Sanctum::actingAs($this->owner());

        $csv = "name,unit,cost_price,selling_price,quantity,sku,barcode,min_stock_level,tax_rate,category\n"
            ."Amoxicillin,piece,80,150,10,,,3,0,Medicine\n"
            ."Syringe Pack,box,200,350,5,SYR-1,,2,0,Supplies\n";

        $file = UploadedFile::fake()->createWithContent('products.csv', $csv);

        $this->post('/api/products/import', ['file' => $file], [
            'Accept' => 'application/json',
        ])->assertCreated()
            ->assertJsonPath('imported', 2)
            ->assertJsonPath('failed', 0);

        $this->assertDatabaseHas('products', [
            'name' => 'Amoxicillin',
        ]);
        $this->assertDatabaseHas('products', [
            'sku' => 'SYR-1',
        ]);
        $this->assertSame(2, Product::count());
    }

    public function test_import_reports_row_errors_without_aborting_valid_rows(): void
    {
        Sanctum::actingAs($this->owner());

        $csv = "name,unit,cost_price,selling_price,quantity\n"
            ."Good Item,piece,10,20,1\n"
            ."Bad Item,not-a-unit,10,20,1\n";

        $file = UploadedFile::fake()->createWithContent('products.csv', $csv);

        $this->post('/api/products/import', ['file' => $file], [
            'Accept' => 'application/json',
        ])->assertCreated()
            ->assertJsonPath('imported', 1)
            ->assertJsonPath('failed', 1);

        $this->assertDatabaseHas('products', ['name' => 'Good Item']);
    }

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Import Co',
            'slug' => 'import-co',
            'email' => 'import@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
