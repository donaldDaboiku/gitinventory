<?php

namespace Tests\Feature;

use App\Mail\WelcomeMail;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class WelcomeMailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        Mail::fake();
    }

    public function test_registration_sends_welcome_email(): void
    {
        $this->postJson('/api/auth/register', [
            'business_name' => 'Mail Test Pharmacy',
            'name' => 'Jane Owner',
            'email' => 'jane@mailtest.test',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ])->assertCreated();

        Mail::assertQueued(WelcomeMail::class, fn (WelcomeMail $mail) => $mail->hasTo('jane@mailtest.test'));
    }
}
