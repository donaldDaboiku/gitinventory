<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SpaAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_login_creates_a_session_and_returns_a_token(): void
    {
        $user = $this->owner();

        $this->withHeader('Referer', 'http://localhost')
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'Password1',
            ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);

        $this->assertAuthenticatedAs($user);
    }

    public function test_bearer_token_authenticates_without_a_session(): void
    {
        $user = $this->owner();

        $token = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'Password1',
        ])->assertOk()
            ->json('token');

        $this->assertGuest();
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $this->postJson('/api/auth/logout', [], ['Authorization' => 'Bearer '.$token])
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->app['auth']->forgetGuards();

        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])
            ->assertUnauthorized();
    }

    public function test_logout_invalidates_the_session(): void
    {
        $user = $this->owner();

        $this->withHeader('Referer', 'http://localhost')
            ->postJson('/api/auth/login', [
                'email' => $user->email,
                'password' => 'Password1',
            ])
            ->assertOk();

        $this->withHeader('Referer', 'http://localhost')
            ->postJson('/api/auth/logout')
            ->assertOk();
    }

    private function owner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Session Co',
            'slug' => 'session-co',
            'email' => 'owner@session.test',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'owner@session.test',
            'password' => Hash::make('Password1'),
            'email_verified_at' => now(),
        ]);
        $user->assignRole('owner');

        return $user;
    }
}
