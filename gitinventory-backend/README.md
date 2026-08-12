# GITInventory Backend

Laravel 13 API for multi-tenant inventory, sales, purchasing, reports, PDF exports, and Paystack billing.

**Project docs:** see the [root README](../README.md) and [docs/](../docs/).

## Features

- Sanctum API authentication (register, login, logout, me)
- Tenant-scoped products, categories, branches, customers, suppliers
- Stock in / out / adjust with movement history
- Sales with stock deduction, tenant invoice prefix, default tax rate
- Purchases with receiving and cost updates
- Dashboard KPIs and financial reports (JSON, CSV, PDF)
- Product barcode/SKU auto-generation and POS lookup
- Sale receipts and product label PDFs (DomPDF)
- Settings, team users, roles (Spatie Permission)
- Trial + subscription gate (`CheckSubscription` middleware)
- Paystack billing checkout and webhook
- Welcome and trial-ending emails

## Requirements

- PHP 8.3+
- Composer
- PostgreSQL (recommended) or SQLite (tests)

## Setup

```powershell
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
```

Demo user:

```powershell
php artisan db:seed --class=DemoUserSeeder
```

## Run

```powershell
php artisan serve
```

With queue and scheduler (production):

```powershell
php artisan queue:work
php artisan schedule:work
```

## Tests

```powershell
php artisan test
```

## API routes (summary)

**Public**

- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/billing/webhook`

**Authenticated (subscription not required)**

- `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/billing/plans`, `GET /api/billing/status`
- `POST /api/billing/checkout`, `POST /api/billing/confirm-demo`
- `GET /api/settings`

**Authenticated + active trial/subscription**

- Dashboard, products, stock, sales, purchases, customers, suppliers, branches
- Reports, settings update, team users
- `GET /api/products/lookup`, PDF exports

Full list: `php artisan route:list --path=api`

## Configuration

| File | Purpose |
|------|---------|
| `config/billing.php` | Plan prices, callback URL |
| `config/services.php` | Paystack keys |
| `.env` | Database, mail, `FRONTEND_URL`, `BILLING_CALLBACK_URL` |

## Local guides

- [HERD_SETUP.md](HERD_SETUP.md) — Laravel Herd on macOS
- [../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md) — developer guide
- [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) — Docker and production
