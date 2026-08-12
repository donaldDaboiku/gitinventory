<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_financial_report_returns_summary_for_tenant(): void
    {
        $user = $this->userForTenant();
        Sanctum::actingAs($user);

        Sale::create([
            'tenant_id'      => $user->tenant_id,
            'user_id'        => $user->id,
            'invoice_number' => 'INV-TEST-001',
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

        $this->getJson("/api/reports/financial?date_from={$today}&date_to={$today}")
            ->assertOk()
            ->assertJsonPath('summary.revenue', '1000.00')
            ->assertJsonStructure([
                'period' => ['date_from', 'date_to'],
                'summary' => [
                    'revenue',
                    'cost_of_goods_sold',
                    'gross_profit',
                    'receivables',
                    'payables',
                    'stock_valuation',
                ],
                'daily_breakdown',
            ]);
    }

    public function test_financial_export_requires_export_permission(): void
    {
        $tenant = Tenant::create([
            'name'          => 'Demo Business',
            'slug'          => 'demo-export',
            'email'         => 'export@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('sales_staff');

        Sanctum::actingAs($user);

        $this->get('/api/reports/financial/export')->assertForbidden();
    }

    private function userForTenant(): User
    {
        $tenant = Tenant::create([
            'name'          => 'Demo Business',
            'slug'          => 'demo-business-report',
            'email'         => 'demo-report@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
