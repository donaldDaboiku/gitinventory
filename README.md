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
```

## Production deployment (overview)

1. Copy `.env.production.example` to `.env` at the repo root and fill in secrets.
2. Generate `APP_KEY` (`php artisan key:generate` inside backend).
3. Set `PAYSTACK_*`, mail, and `FRONTEND_URL` / `BILLING_CALLBACK_URL`.
4. Run `docker compose up --build`.

Full steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Recommended next steps

These are sensible follow-ups after the current release:

1. **CI pipeline** — GitHub Actions: `php artisan test`, `npm run build` on every push.
2. **Staging environment** — Deploy a staging stack with Paystack test keys before production.
3. **Email verification & password reset** — Tables exist; add API + UI flows.
4. **Low-stock email digests** — Scheduled job using existing low-stock query.
5. **Audit & compliance** — Export activity log for sensitive actions (Spatie Activity Log is already installed).
6. **Mobile-friendly POS** — Larger tap targets and dedicated sale screen for tablets.
7. **API documentation** — OpenAPI/Swagger or Postman collection for integrators.
8. **Backups** — Automated Postgres backups and restore runbook for production.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#recommended-next-work) for technical backlog items.

## License

Proprietary — adjust as needed for your organization.
