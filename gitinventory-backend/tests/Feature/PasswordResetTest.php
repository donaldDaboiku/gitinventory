<?php

namespace Tests\Feature;

use App\Mail\PasswordResetMail;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        Mail::fake();
    }

    public function test_forgot_password_sends_reset_email(): void
    {
        $user = $this->ownerUser();

        $this->postJson('/api/auth/forgot-password', [
            'email' => $user->email,
        ])->assertOk();

        Mail::assertSent(PasswordResetMail::class, fn (PasswordResetMail $mail) => $mail->hasTo($user->email));
    }

    public function test_reset_password_updates_credentials(): void
    {
        $user = $this->ownerUser();
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'NewPassword1',
            'password_confirmation' => 'NewPassword1',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPassword1', $user->fresh()->password));
    }

    private function ownerUser(): User
    {
        $tenant = Tenant::create([
            'name' => 'Reset Co',
            'slug' => 'reset-co',
            'email' => 'reset@example.com',
            'trial_ends_at' => now()->addDays(14),
        ]);

        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'email' => 'owner@reset.test',
        ]);
        $user->assignRole('owner');

        return $user;
    }
}
