<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityLogExportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_owner_can_export_activity_log_csv(): void
    {
        $user = $this->owner();
        Sanctum::actingAs($user);

        Product::create([
            'tenant_id' => $user->tenant_id,
            'name' => 'Logged Item',
            'unit' => 'piece',
            'cost_price' => 100,
            'selling_price' => 200,
            'quantity' => 5,
            'min_stock_level' => 1,
        ]);

        $response = $this->get('/api/settings/activity/export');

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $this->assertStringContainsString('created_at', $response->streamedContent());
    }

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Audit Co',
            'slug' => 'audit-co',
            'email' => 'audit@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
