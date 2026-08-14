<?php

namespace Tests\Feature;

use App\Mail\LowStockAlertMail;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LowStockAlertTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        Mail::fake();
    }

    public function test_low_stock_command_emails_owner(): void
    {
        $tenant = Tenant::create([
            'name' => 'Stock Alert Co',
            'slug' => 'stock-alert-co',
            'email' => 'alerts@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'owner@stockalert.test',
        ]);
        $owner->assignRole('owner');

        Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Low Item',
            'unit' => 'piece',
            'cost_price' => 100,
            'selling_price' => 200,
            'quantity' => 1,
            'min_stock_level' => 5,
            'track_stock' => true,
            'is_active' => true,
        ]);

        $this->artisan('inventory:send-low-stock-alerts')->assertSuccessful();

        Mail::assertQueued(LowStockAlertMail::class, fn (LowStockAlertMail $mail) => $mail->hasTo('owner@stockalert.test'));
    }

    public function test_low_stock_command_skips_when_stock_is_healthy(): void
    {
        $tenant = Tenant::create([
            'name' => 'Healthy Co',
            'slug' => 'healthy-co',
            'email' => 'healthy@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $owner = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'owner@healthy.test',
        ]);
        $owner->assignRole('owner');

        Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Healthy Item',
            'unit' => 'piece',
            'cost_price' => 100,
            'selling_price' => 200,
            'quantity' => 20,
            'min_stock_level' => 5,
            'track_stock' => true,
            'is_active' => true,
        ]);

        $this->artisan('inventory:send-low-stock-alerts')->assertSuccessful();

        Mail::assertNothingOutgoing();
    }
}
