# GITInventory Backend

Laravel API backend for a multi-tenant inventory and sales management system.

## Current Scope

- Tenant registration with a default main branch and owner user.
- Sanctum token login/logout and current-user endpoint.
- Products, categories, branches, customers, and suppliers.
- Stock in, stock out, manual adjustment, and movement history.
- Sales with stock deduction and payment status calculation.
- Purchases with stock receiving and cost-price updates.
- Dashboard metrics for products, low stock, revenue, profit, receivables, and top products.

## Requirements

- PHP 8.3 or newer
- Composer
- PostgreSQL
- Node.js and npm

This machine currently has Composer available, but `php` is not available in the terminal PATH. Laravel commands will fail until PHP is installed or added to PATH.

## Setup

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
npm install
```

The local `.env` is currently configured for PostgreSQL:

```ini
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gitinventory
DB_USERNAME=postgres
```

Update `DB_PASSWORD` locally as needed.

## Run Locally

```bash
php artisan serve
npm run dev
```

Useful checks:

```bash
php artisan route:list
php artisan test
```

## API Overview

Public:

- `POST /api/auth/register`
- `POST /api/auth/login`

Authenticated with Sanctum bearer token:

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `apiResource /api/products`
- `apiResource /api/categories`
- `apiResource /api/customers`
- `apiResource /api/suppliers`
- `apiResource /api/branches`
- `GET /api/stock/movements`
- `POST /api/stock/in`
- `POST /api/stock/out`
- `POST /api/stock/adjust`
- `GET|POST|GET by id /api/sales`
- `GET|POST|GET by id /api/purchases`

## Development Notes

- Most business tables are tenant scoped with `tenant_id`.
- Feature tests in `tests/Feature/TenantIsolationTest.php` cover cross-tenant isolation for product search, product creation, sales, and purchases.
- Seed roles and permissions before testing registration flows that assign the `owner` role:

```bash
php artisan db:seed --class=RolesAndPermissionsSeeder
```

## Recommended Next Work

1. Install or expose PHP in PATH, then run `php artisan test`.
2. Fix any runtime/test failures after the local PHP/PostgreSQL setup is confirmed.
3. Add frontend screens for login/register, dashboard, products, stock, sales, purchases, customers, suppliers, and branches.
4. Add API docs or a Postman/Insomnia collection for manual testing.
