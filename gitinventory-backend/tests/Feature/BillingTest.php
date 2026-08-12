<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_expired_tenant_can_access_billing_but_not_dashboard(): void
    {
        $user = $this->ownerWithExpiredTrial();
        Sanctum::actingAs($user);

        $this->getJson('/api/billing/status')->assertOk();
        $this->getJson('/api/billing/plans')->assertOk();
        $this->getJson('/api/settings')->assertOk();
        $this->getJson('/api/dashboard')->assertStatus(402);
    }

    public function test_demo_checkout_activates_subscription_without_paystack(): void
    {
        $user = $this->ownerWithExpiredTrial();
        Sanctum::actingAs($user);

        $this->postJson('/api/billing/checkout', ['plan' => 'starter'])
            ->assertOk()
            ->assertJsonPath('demo_mode', true);

        $this->postJson('/api/billing/confirm-demo', ['plan' => 'starter'])
            ->assertOk()
            ->assertJsonPath('billing.has_active_subscription', true);

        $this->getJson('/api/dashboard')->assertOk();
    }

    public function test_webhook_activates_subscription(): void
    {
        config(['services.paystack.secret_key' => 'test-secret']);
        $user = $this->ownerWithExpiredTrial();
        $tenantId = $user->tenant_id;

        $payload = json_encode([
            'event' => 'charge.success',
            'data' => [
                'status' => 'success',
                'reference' => "GITINV-{$tenantId}-abc123",
                'amount' => 1500000,
                'metadata' => [
                    'tenant_id' => $tenantId,
                    'plan' => 'starter',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $signature = hash_hmac('sha512', $payload, 'test-secret');

        $this->call(
            'POST',
            '/api/billing/webhook',
            [],
            [],
            [],
            ['HTTP_X-Paystack-Signature' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $payload,
        )->assertOk();

        $user->tenant->refresh();
        $this->assertTrue($user->tenant->hasActiveSubscription());
        $this->assertSame('starter', $user->tenant->subscription_plan);
    }

    public function test_subscription_service_extends_existing_subscription(): void
    {
        $tenant = Tenant::create([
            'name' => 'Extend Co',
            'slug' => 'extend-co',
            'email' => 'extend@example.com',
            'subscription_plan' => 'starter',
            'subscription_expires_at' => now()->addDays(10),
        ]);

        app(SubscriptionService::class)->activate($tenant, 'business');

        $tenant->refresh();
        $this->assertSame('business', $tenant->subscription_plan);
        $this->assertTrue($tenant->subscription_expires_at->greaterThan(now()->addDays(35)));
    }

    private function ownerWithExpiredTrial(): User
    {
        $tenant = Tenant::create([
            'name' => 'Expired Co',
            'slug' => 'expired-co',
            'email' => 'expired@example.com',
            'trial_ends_at' => now()->subDay(),
            'subscription_plan' => 'trial',
        ]);

        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('owner');

        return $user;
    }
}
