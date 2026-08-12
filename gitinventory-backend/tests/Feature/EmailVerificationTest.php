<?php

namespace Tests\Feature;

use App\Mail\VerifyEmailMail;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        Mail::fake();
    }

    public function test_registration_sends_verification_email(): void
    {
        $this->postJson('/api/auth/register', [
            'business_name' => 'Verify Co',
            'name' => 'Owner',
            'email' => 'owner@verify.test',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ])->assertCreated()
            ->assertJsonPath('user.email_verified_at', null);

        Mail::assertSent(VerifyEmailMail::class, fn (VerifyEmailMail $mail) => $mail->hasTo('owner@verify.test'));
    }

    public function test_unverified_user_cannot_access_dashboard(): void
    {
        $user = $this->unverifiedOwner();
        Sanctum::actingAs($user);

        $this->getJson('/api/dashboard')
            ->assertForbidden()
            ->assertJsonPath('code', 'email_not_verified');
    }

    public function test_signed_verification_link_marks_email_verified(): void
    {
        $user = $this->unverifiedOwner();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)],
        );

        $this->get($url)->assertRedirect();

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_resend_verification_email(): void
    {
        $user = $this->unverifiedOwner();
        Sanctum::actingAs($user);

        $this->postJson('/api/auth/email/resend')
            ->assertOk();

        Mail::assertSent(VerifyEmailMail::class);
    }

    private function unverifiedOwner(): User
    {
        $tenant = Tenant::create([
            'name' => 'Unverified Co',
            'slug' => 'unverified-co',
            'email' => 'unverified@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->unverified()->create([
            'tenant_id' => $tenant->id,
            'email' => 'owner@unverified.test',
        ]);
        $user->assignRole('owner');

        return $user;
    }
}
