# GITInventory — Deployment Guide

Deploy GITInventory with Docker Compose (recommended) or manually on a VPS with PHP, PostgreSQL, Node, and nginx.

---

## Architecture

```
Browser → nginx (frontend container, port 80)
              ↓ /api/*
          Laravel (backend container, port 8000)
              ↓
          PostgreSQL + Redis
```

Background processes:

- **queue** — `php artisan queue:work` (emails, future jobs)
- **scheduler** — `php artisan schedule:work` (trial reminder emails daily)

Health check: `GET /up` on the backend.

---

## Docker Compose (recommended)

### 1. Prepare environment

From the repository root:

```bash
cp .env.production.example .env
```

Edit `.env`:

| Variable | Description |
|----------|-------------|
| `APP_KEY` | Run `php artisan key:generate --show` in backend and paste |
| `APP_URL` | Public API URL, e.g. `https://api.yourdomain.com` |
| `FRONTEND_URL` | Public app URL, e.g. `https://app.yourdomain.com` |
| `VITE_API_BASE_URL` | Same as API URL (baked into frontend build) |
| `BILLING_CALLBACK_URL` | `{FRONTEND_URL}/settings?billing=success` |
| `PAYSTACK_SECRET_KEY` | Paystack live or test secret |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `MAIL_MAILER` | `smtp`, `resend`, etc. |
| `MAIL_*` | Provider credentials |
| `MAIL_FROM_ADDRESS` | e.g. `noreply@yourdomain.com` |

### 2. Build and run

```bash
docker compose up --build -d
```

Services:

| Service | Port | Role |
|---------|------|------|
| `frontend` | 80 | Static React app + `/api` proxy |
| `backend` | 8000 | Laravel API |
| `postgres` | internal | Database |
| `redis` | internal | Queues |
| `queue` | — | Queue worker |
| `scheduler` | — | Cron scheduler |

On first start, the backend runs migrations and seeds **roles/permissions**.

### 3. Seed demo data (optional)

```bash
docker compose exec backend php artisan db:seed --class=DemoUserSeeder
```

### 4. Paystack webhook

In the Paystack dashboard, set the webhook URL to:

```
https://api.yourdomain.com/api/billing/webhook
```

Events: **charge.success**. The app verifies the `x-paystack-signature` header.

### 5. TLS / reverse proxy

In production, put **Caddy**, **nginx**, or a cloud load balancer in front of:

- `frontend` for the SPA
- Ensure `/api` routes to the backend if not using the bundled frontend nginx proxy

Set Sanctum stateful domains if using cookie auth (current app uses **Bearer tokens** from localStorage).

---

## Manual VPS deployment

### Backend

```bash
cd gitinventory-backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
# Configure DB_CONNECTION=pgsql, REDIS, MAIL, PAYSTACK, APP_URL, FRONTEND_URL
php artisan migrate --force
php artisan db:seed --class=RolesAndPermissionsSeeder --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Run with **php-fpm + nginx** or `php artisan serve` only for testing.

**Supervisor** (queue):

```ini
[program:gitinventory-queue]
command=php /var/www/gitinventory-backend/artisan queue:work --sleep=1 --tries=3
autostart=true
autorestart=true
```

**Crontab** (scheduler):

```cron
* * * * * cd /var/www/gitinventory-backend && php artisan schedule:run >> /dev/null 2>&1
```

### Frontend

```bash
cd gitinventory-frontend
npm ci
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

Serve `dist/` with nginx. Proxy `/api` to the Laravel upstream, or host API on a subdomain and set `VITE_API_BASE_URL` accordingly.

---

## Environment reference

### Billing (`config/billing.php`)

| Env | Default | Meaning |
|-----|---------|---------|
| `BILLING_CURRENCY` | NGN | Paystack currency |
| `BILLING_CALLBACK_URL` | — | Redirect after payment |
| `BILLING_STARTER_AMOUNT` | 1500000 | Starter price in **kobo** (₦15,000) |
| `BILLING_BUSINESS_AMOUNT` | 3500000 | Business price in kobo (₦35,000) |

Without `PAYSTACK_SECRET_KEY`, checkout uses **demo mode** (instant activation via `confirm-demo`).

### Mail

Development: `MAIL_MAILER=log` writes to `storage/logs/laravel.log`.

Production: configure SMTP or Resend/Postmark via Laravel mail config.

Emails sent today:

- Welcome (registration)
- Trial ending (3 and 1 days before, via scheduler)

---

## Post-deploy checklist

- [ ] `php artisan test` passed in CI or staging
- [ ] HTTPS on frontend and API
- [ ] Paystack webhook tested with a small test payment
- [ ] Welcome email received on test registration
- [ ] Trial reminder command: `php artisan subscriptions:send-trial-reminders`
- [ ] Database backups scheduled
- [ ] `APP_DEBUG=false` in production
- [ ] Strong `APP_KEY` and DB passwords

---

## Backups

**PostgreSQL** (example):

```bash
docker compose exec postgres pg_dump -U gitinventory gitinventory > backup.sql
```

Restore:

```bash
cat backup.sql | docker compose exec -T postgres psql -U gitinventory gitinventory
```

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| 502 on `/api` | Backend container running; nginx proxy target |
| CORS / 401 | Token in `Authorization: Bearer`; API URL matches build |
| 402 on all routes | Trial expired; use billing endpoints or extend trial in DB |
| Webhook not activating | Paystack signature secret; metadata `tenant_id` and `plan` |
| Mail not sent | `MAIL_*` env, queue worker running if using queued mail |
