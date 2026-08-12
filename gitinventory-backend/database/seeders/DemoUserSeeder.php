<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        if (User::where('email', 'demo@gitinventory.test')->exists()) {
            $this->command?->info('Demo user already exists — skipped.');

            return;
        }

        $tenant = Tenant::create([
            'name'          => 'Demo Pharmacy',
            'slug'          => 'demo-pharmacy',
            'email'         => 'demo@gitinventory.test',
            'currency'      => 'NGN',
            'timezone'      => 'Africa/Lagos',
            'trial_ends_at' => now()->addYear(),
            'subscription_plan' => 'trial',
        ]);

        Branch::create([
            'tenant_id' => $tenant->id,
            'name'      => 'Main Branch',
            'code'      => 'MAIN',
            'is_main'   => true,
        ]);

        $user = User::create([
            'tenant_id'         => $tenant->id,
            'name'              => 'Demo Owner',
            'email'             => 'demo@gitinventory.test',
            'password'          => Hash::make('Password1'),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('owner');

        $this->command?->info('Demo user created: demo@gitinventory.test / Password1');
    }
}
