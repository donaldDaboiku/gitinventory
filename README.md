# GITInventory

Multi-tenant inventory, sales, and purchasing for small businesses. One workspace per business (tenant), with role-based access, stock tracking, financial reports, PDF receipts, barcode POS scanning, and Paystack billing.

## Repository layout

| Folder | Stack | Purpose |
|--------|--------|---------|
| `gitinventory-backend/` | Laravel 13, Sanctum, Spatie Permission | REST API, PDF generation, billing webhooks, email |
| `gitinventory-frontend/` | React 19, TypeScript, Vite | Single-page app (dashboard, catalog, POS, settings) |
| `docs/` | Markdown | User manual, deployment, development guides |
| `docker-compose.yml` | Docker | Production-style local or server stack |

## Features (summary)

- **Inventory** — products, categories, SKU/barcode auto-generation, low-stock alerts
- **Stock** — stock in, stock out, adjustments, movement history
- **Sales** — invoices, payments, barcode scan at POS, receipt PDF
- **Purchases** — supplier orders, receiving, cost updates
- **CRM** — customers and suppliers with credit limits
- **Reports** — financial summary, daily breakdown, CSV and PDF export
- **Settings** — business profile, inventory defaults, team invites, subscription plans
- **Billing** — 14-day trial, Paystack checkout (or demo mode without keys)
- **Auth** — forgot/reset password, email verification before workspace access
- **Alerts** — daily low-stock email digests to tenant owners
- **Audit** — CSV export of recent activity (Settings → Audit)
- **Import** — bulk product CSV upload (Products → Bulk import)
- **POS** — full-screen tablet sale mode (Sales → Open POS)
- **Help** — in-app quick guide under Settings → Help
- **Security** — tenant isolation, per-route permissions, subscription gate after trial

## Quick start (local development)

### Prerequisites

- PHP 8.3+, Composer
- Node.js 20+
- SQLite (tests) or PostgreSQL (recommended for dev/prod)

### Backend

```powershell
cd gitinventory-backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

API base URL: `http://127.0.0.1:8000`

### Frontend

```powershell
cd gitinventory-frontend
npm install
copy .env.example .env
npm run dev
```

App URL: `http://localhost:5173` (proxies `/api` to the backend)

### Demo login

After seeding:

```powershell
cd gitinventory-backend
php artisan db:seed --class=DemoUserSeeder
```

| Field | Value |
|-------|--------|
| Email | `demo@gitinventory.test` |
| Password | `Password1` |

Or register a new account from the app (**Create account** → 14-day trial starts automatically).

## Documentation

| Document | Audience | Contents |
|----------|----------|----------|
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md) | End users & admins | How to use every screen, roles, billing, barcode POS |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | DevOps / hosting | Docker Compose, env vars, Paystack, mail, scheduler |
| [docs/STAGING.md](docs/STAGING.md) | DevOps | Staging checklist before production |
| [docs/API.md](docs/API.md) | Integrators | REST endpoint reference |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Developers | Local setup, tests, project structure, API notes |
| [gitinventory-backend/HERD_SETUP.md](gitinventory-backend/HERD_SETUP.md) | macOS Herd users | Laravel Herd + PostgreSQL setup |

## User roles

| Role | Typical use |
|------|-------------|
| **owner** | Full access including settings, billing, team |
| **manager** | Operations and reports; no settings/billing |
| **sales_staff** | Sales, customers, view products |
| **inventory_officer** | Products, stock, purchases |
| **accountant** | Read-only operations + report export |

Details and permission lists are in [docs/USER_MANUAL.md](docs/USER_MANUAL.md#roles-and-access).

## Tests

```powershell
cd gitinventory-backend
php artisan test
```

```powershell
cd gitinventory-frontend
npm run build
npm run lint
```

GitHub Actions runs PHPUnit and the frontend build on every push/PR (see `.github/workflows/ci.yml`).

## Production deployment (overview)

**Staging first** (recommended):

```powershell
copy .env.staging.example .env.staging
.\scripts\gen-app-key.ps1 -EnvFile .env.staging
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up --build -d
```

App: http://localhost:8080 — see [docs/STAGING.md](docs/STAGING.md).

**Production:**

1. Copy `.env.production.example` to `.env` and set `DB_PASSWORD`, mail, live Paystack keys, URLs.
2. Run `.\scripts\gen-app-key.ps1`.
3. `docker compose --env-file .env up --build -d`.

Full steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Recommended next steps

These are sensible follow-ups after the current release:

1. **Run staging smoke tests** — [docs/STAGING.md](docs/STAGING.md) checklist, then promote.
2. **TLS + live Paystack webhook** on the production host.
3. **Nightly Postgres backups** — [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#backups).
4. **OpenAPI codegen** — from [docs/API.md](docs/API.md) / routes.
5. **Queued mail + Sanctum cookie SPA auth** — if you want faster APIs and httpOnly sessions.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#recommended-next-work) for technical backlog items.

## License

Proprietary — adjust as needed for your organization.
