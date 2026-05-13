<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define all permissions
        $permissions = [
            // Products
            'products.view', 'products.create', 'products.edit', 'products.delete',

            // Stock
            'stock.view', 'stock.in', 'stock.out', 'stock.adjust', 'stock.transfer',

            // Sales
            'sales.view', 'sales.create', 'sales.cancel', 'sales.refund',

            // Purchases
            'purchases.view', 'purchases.create', 'purchases.approve',

            // Customers
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',

            // Suppliers
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',

            // Reports
            'reports.view', 'reports.export',

            // Settings
            'settings.view', 'settings.edit',

            // Users
            'users.view', 'users.create', 'users.edit', 'users.delete',

            // Branches
            'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // --- Roles ---

        // Owner: full access
        $owner = Role::firstOrCreate(['name' => 'owner']);
        $owner->syncPermissions(Permission::all());

        // Manager: most access, no settings
        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions([
            'products.view', 'products.create', 'products.edit',
            'stock.view', 'stock.in', 'stock.out', 'stock.adjust', 'stock.transfer',
            'sales.view', 'sales.create', 'sales.cancel',
            'purchases.view', 'purchases.create', 'purchases.approve',
            'customers.view', 'customers.create', 'customers.edit',
            'suppliers.view', 'suppliers.create', 'suppliers.edit',
            'reports.view', 'reports.export',
            'users.view', 'branches.view',
        ]);

        // Sales Staff: sales and POS only
        $salesStaff = Role::firstOrCreate(['name' => 'sales_staff']);
        $salesStaff->syncPermissions([
            'products.view',
            'stock.view', 'stock.out',
            'sales.view', 'sales.create',
            'customers.view', 'customers.create',
            'reports.view',
        ]);

        // Inventory Officer: stock focused
        $inventoryOfficer = Role::firstOrCreate(['name' => 'inventory_officer']);
        $inventoryOfficer->syncPermissions([
            'products.view', 'products.create', 'products.edit',
            'stock.view', 'stock.in', 'stock.out', 'stock.adjust', 'stock.transfer',
            'purchases.view', 'purchases.create',
            'suppliers.view', 'suppliers.create',
            'reports.view',
        ]);

        // Accountant: reports and finances
        $accountant = Role::firstOrCreate(['name' => 'accountant']);
        $accountant->syncPermissions([
            'products.view',
            'stock.view',
            'sales.view',
            'purchases.view',
            'customers.view',
            'suppliers.view',
            'reports.view', 'reports.export',
        ]);

        $this->command->info('Roles and permissions seeded successfully.');
    }
}
