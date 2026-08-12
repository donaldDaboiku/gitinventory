<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_owner_can_view_and_update_settings(): void
    {
        $user = $this->owner();

        Sanctum::actingAs($user);

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('tenant.name', 'Demo Business')
            ->assertJsonPath('preferences.invoice_prefix', 'INV');

        $this->putJson('/api/settings', [
            'name'        => 'Updated Pharmacy',
            'currency'    => 'NGN',
            'preferences' => [
                'invoice_prefix'          => 'RX',
                'default_min_stock_level' => 10,
            ],
        ])->assertOk()
            ->assertJsonPath('settings.tenant.name', 'Updated Pharmacy')
            ->assertJsonPath('settings.preferences.invoice_prefix', 'RX');
    }

    public function test_owner_can_invite_team_member(): void
    {
        $user = $this->owner();

        Sanctum::actingAs($user);

        $this->postJson('/api/settings/users', [
            'name'                  => 'Sales Person',
            'email'                 => 'sales@demo.test',
            'password'              => 'Password1',
            'password_confirmation' => 'Password1',
            'role'                  => 'sales_staff',
        ])->assertCreated()
            ->assertJsonPath('user.email', 'sales@demo.test');

        $this->assertDatabaseHas('users', [
            'email'     => 'sales@demo.test',
            'tenant_id' => $user->tenant_id,
        ]);
    }

    public function test_manager_cannot_edit_settings(): void
    {
        $tenant = Tenant::create([
            'name'          => 'Demo Business',
            'slug'          => 'demo-settings-manager',
            'email'         => 'mgr@demo.test',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('manager');

        Sanctum::actingAs($user);

        $this->getJson('/api/settings')->assertForbidden();
        $this->putJson('/api/settings', ['name' => 'Hacked'])->assertForbidden();
    }

    public function test_updating_tenant_email_to_another_tenants_email_returns_422(): void
    {
        Tenant::create([
            'name'          => 'Other Business',
            'slug'          => 'other-settings-email',
            'email'         => 'taken@demo.test',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = $this->owner();
        Sanctum::actingAs($user);

        $this->putJson('/api/settings', [
            'email' => 'taken@demo.test',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_owner_can_keep_their_own_tenant_email(): void
    {
        $user = $this->owner();
        Sanctum::actingAs($user);

        $this->putJson('/api/settings', [
            'email' => 'owner@demo.test',
            'name'  => 'Same Email Pharmacy',
        ])->assertOk()
            ->assertJsonPath('settings.tenant.email', 'owner@demo.test')
            ->assertJsonPath('settings.tenant.name', 'Same Email Pharmacy');
    }

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name'          => 'Demo Business',
            'slug'          => 'demo-settings-owner',
            'email'         => 'owner@demo.test',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
