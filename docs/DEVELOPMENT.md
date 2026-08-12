# GITInventory — Development Guide

For contributors and maintainers working on the codebase locally.

---

## Prerequisites

- PHP 8.3+
- Composer
- Node.js 20+
- PostgreSQL (dev/prod) or SQLite (PHPUnit default)

---

## Initial setup

### Backend

```powershell
cd gitinventory-backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
```

Seeders:

| Seeder | Purpose |
|--------|---------|
| `RolesAndPermissionsSeeder` | Roles and permissions (required for register) |
| `DemoUserSeeder` | `demo@gitinventory.test` / `Password1` |
| `DatabaseSeeder` | Runs default seeders |

### Frontend

```powershell
cd gitinventory-frontend
npm install
copy .env.example .env
```

`.env`:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Run

Terminal 1:

```powershell
cd gitinventory-backend
php artisan serve
```

Terminal 2:

```powershell
cd gitinventory-frontend
npm run dev
```

**macOS Herd:** see [../gitinventory-backend/HERD_SETUP.md](../gitinventory-backend/HERD_SETUP.md).

---

## Project structure

### Backend (`gitinventory-backend/`)

```
app/
  Http/Controllers/Api/   # REST controllers
  Http/Middleware/        # CheckSubscription
  Mail/                   # WelcomeMail, TrialEndingMail
  Models/                 # Tenant-scoped Eloquent models
  Services/               # InvoiceNumber, Paystack, ProductIdentifier, etc.
config/
  billing.php             # Plan prices and callback URL
routes/
  api.php                 # All API routes
  console.php             # Scheduled trial reminders
resources/views/
  pdf/                    # DomPDF templates
  emails/                 # Markdown mail views
tests/Feature/            # PHPUnit feature tests
```

### Frontend (`gitinventory-frontend/`)

```
src/
  App.tsx                 # Shell and page routing
  hooks/useInventoryApp.ts  # State, API, auth, data loading
  components/
    views/                # Dashboard, Products, Sales, …
    forms/                # Drawer forms, SaleDrawerForm (barcode)
    billing/              # Trial banner, subscription wall
    layout/               # Sidebar, Topbar, Drawer
  lib/                    # api, download, format, form, list
  types/                  # Shared TypeScript types
  config/navigation.ts    # Pages, permissions, labels
```

---

## API conventions

- Base path: `/api`
- Auth: `Authorization: Bearer {sanctum_token}`
- Errors: JSON `{ message, errors? }`
- **402** — subscription expired (billing routes still work)
- **401** — invalid/expired token

### Route groups

1. **Public** — `auth/register`, `auth/login`, `billing/webhook`
2. **Auth only** — `auth/me`, `auth/logout`, `billing/*`, `GET settings`
3. **Auth + subscription** — all business routes

### Tenant isolation

Route model binding scopes records to `auth()->user()->tenant_id` in `AppServiceProvider`.

---

## Testing

```powershell
cd gitinventory-backend
php artisan test
```

Notable test files:

| File | Covers |
|------|--------|
| `TenantIsolationTest` | Cross-tenant access blocked |
| `PermissionEnforcementTest` | Role permissions |
| `BillingTest` | Subscription gate, Paystack webhook, demo checkout |
| `Phase4Test` | Barcode lookup, PDF exports, invoice prefix |
| `WelcomeMailTest` | Registration email |

Frontend:

```powershell
cd gitinventory-frontend
npm run build
npm run lint
```

---

## Key environment variables

### Backend `.env`

```ini
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173
BILLING_CALLBACK_URL=http://localhost:5173/settings?billing=success

DB_CONNECTION=sqlite
# or pgsql for local Postgres

MAIL_MAILER=log
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
```

### Billing demo mode

Leave `PAYSTACK_SECRET_KEY` empty. Checkout returns `demo_mode: true`; frontend calls `POST /api/billing/confirm-demo`.

---

## Recommended next work

### Product / UX

- Dedicated tablet POS layout
- Password reset and email verification flows
- Low-stock email digest (backend query exists)
- Bulk product import (CSV)

### Engineering

- GitHub Actions CI (PHPUnit + `npm run build`)
- OpenAPI spec generated from routes
- Queue welcome mail for faster registration response
- Redis cache for dashboard metrics
- E2E tests (Playwright) for login and sale flow

### Operations

- Staging environment with Paystack test mode
- Postgres backup automation
- Error tracking (Sentry) and uptime monitoring
- Rate limiting tuning per tenant

---

## Useful commands

```powershell
php artisan route:list --path=api
php artisan subscriptions:send-trial-reminders
php artisan queue:work
php artisan schedule:work
php artisan pail
```
