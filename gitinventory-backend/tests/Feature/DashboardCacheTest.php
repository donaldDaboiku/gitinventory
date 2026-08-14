<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\DashboardController;
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
