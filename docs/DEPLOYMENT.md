# GITInventory — Deployment Guide

Deploy GITInventory with Docker Compose (recommended) or manually on a VPS with PHP, PostgreSQL, Node, and nginx.

For a dry-run first, use [STAGING.md](STAGING.md).

---

## Architecture

```
Browser → Caddy (:443)               # docker-compose.tls.yml
              ↓ HTTP
          frontend nginx (:80)
              ↓ /api/*  and  /up
          Laravel backend (:8000)
              ↓
          PostgreSQL + Redis
              ↑
          queue worker + scheduler
```

Without the TLS overlay, the browser talks to frontend nginx on `FRONTEND_PORT` (80 by default).

Background processes:

- **queue** — `php artisan queue:work` (mail and jobs)
- **scheduler** — trial reminders (08:00) + low-stock alerts (07:30)

Health: `GET /up` (also proxied from the frontend container).

---

## Production (Docker)

### 1. Environment

```powershell
cd GITInventory
copy .env.production.example .env
.\scripts\gen-app-key.ps1
```

Edit `.env` — at minimum set:

| Variable | Description |
|----------|-------------|
| `APP_KEY` | From `gen-app-key.ps1` |
| `DB_PASSWORD` | Strong password |
| `APP_URL` | Public API URL (or LB URL) |
| `FRONTEND_URL` | Public SPA URL |
| `BILLING_CALLBACK_URL` | `{FRONTEND_URL}/settings?billing=success` |
| `VITE_API_BASE_URL` | Leave **empty** when using the bundled nginx `/api` proxy |
| `SESSION_SECURE_COOKIE` | `true` when the public app uses HTTPS |
| `SANCTUM_STATEFUL_DOMAINS` | Public SPA host, e.g. `app.yourdomain.com` |
| `PAYSTACK_*` | **Live** keys |
| `MAIL_*` | Production SMTP / provider |

### 2. Build and run

```powershell
docker compose --env-file .env up --build -d
```

| Service | Default port | Role |
|---------|--------------|------|
| `frontend` | 80 | SPA + `/api` proxy |
| `backend` | 8000 | Laravel API |
| `postgres` | internal | DB |
| `redis` | internal | Queue / cache / session |
| `queue` | — | Worker |
| `scheduler` | — | Schedule |

On first start the backend migrates and seeds roles/permissions.

### 3. Optional demo user

```powershell
docker compose --env-file .env exec backend php artisan db:seed --class=DemoUserSeeder
```

### 4. Paystack webhook

```
https://api.yourdomain.com/api/billing/webhook
```

(or your frontend origin `/api/billing/webhook` if the API is only exposed via the SPA proxy)

Verify `x-paystack-signature`. Event: **charge.success**.

### 5. TLS (Caddy)

Caddy terminates HTTPS and reverse-proxies the frontend container (which already proxies `/api` to Laravel). Open ports **80** and **443**. Let's Encrypt needs a public DNS name pointing at the host.

In `.env` set:

```ini
FRONTEND_PORT=8080
DOMAIN=app.yourdomain.com
ACME_EMAIL=admin@yourdomain.com
APP_URL=https://app.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
BILLING_CALLBACK_URL=https://app.yourdomain.com/settings?billing=success
```

`FRONTEND_PORT=8080` keeps SPA nginx off host port 80 so Caddy can bind 80/443. Compose **appends** ports; you cannot unpublish `80:80` from the overlay.

```powershell
docker compose -f docker-compose.yml -f docker-compose.tls.yml --env-file .env up --build -d
```

Local dry-run (Caddy internal CA — browsers will warn):

```powershell
$env:CADDYFILE="./deploy/Caddyfile.internal"
$env:DOMAIN="localhost"
docker compose -f docker-compose.yml -f docker-compose.tls.yml --env-file .env.staging up -d
```

Paystack webhook then becomes `https://app.yourdomain.com/api/billing/webhook` (same origin as the SPA). A cloud load balancer in front of `FRONTEND_PORT` still works if you skip this overlay. Backend already trusts `X-Forwarded-*` proxies.

---

## Staging

```powershell
copy .env.staging.example .env.staging
.\scripts\gen-app-key.ps1 -EnvFile .env.staging
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up --build -d
```

App: http://localhost:8080 — details in [STAGING.md](STAGING.md).

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

Prefer **php-fpm + nginx** in long-lived production; Compose currently uses `artisan serve` inside the backend container for a single-box deploy.

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
# Same-origin /api proxy: omit VITE_API_BASE_URL or leave empty
npm run build
```

Serve `dist/` with nginx; proxy `/api` to Laravel.

---

## Environment reference

### Billing (`config/billing.php`)

| Env | Default | Meaning |
|-----|---------|---------|
| `BILLING_CURRENCY` | NGN | Paystack currency |
| `BILLING_CALLBACK_URL` | — | Redirect after payment |
| `BILLING_STARTER_AMOUNT` | 1500000 | Starter price in **kobo** |
| `BILLING_BUSINESS_AMOUNT` | 3500000 | Business price in kobo |

Empty `PAYSTACK_SECRET_KEY` → **demo mode** checkout.

### Mail

- Dev / early staging: `MAIL_MAILER=log`
- Production: SMTP or Resend/Postmark

Emails (queued — run `php artisan queue:work` or the Docker `queue` service): welcome, verify, password reset, trial ending, low-stock digest.

---

## Post-deploy checklist

- [ ] CI / `php artisan test` green
- [ ] HTTPS on the public app URL
- [ ] Paystack webhook (test on staging, live on production)
- [ ] Welcome + verification email
- [ ] Trial reminder + low-stock commands once
- [ ] Nightly Postgres backup
- [ ] `APP_DEBUG=false`
- [ ] Strong `APP_KEY` and `DB_PASSWORD`

---

## Backups

```bash
docker compose --env-file .env exec -T postgres pg_dump -U gitinventory gitinventory | gzip > backup-$(date +%F).sql.gz
```

Restore:

```bash
gunzip -c backup-YYYY-MM-DD.sql.gz | docker compose --env-file .env exec -T postgres psql -U gitinventory gitinventory
```

### Host cron (daily)

```bash
0 2 * * * cd /var/www/GITInventory && docker compose --env-file .env exec -T postgres pg_dump -U gitinventory gitinventory | gzip > /var/backups/gitinventory-$(date +\%F).sql.gz
```

Keep ≥7 daily copies; restore-drill on staging quarterly.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| Compose refuses to start | `APP_KEY` / `DB_PASSWORD` set in env file |
| 502 on `/api` | `backend` healthy; `docker compose logs backend` |
| 401 or 419 | SPA origin is in `SANCTUM_STATEFUL_DOMAINS`; session cookie and `/sanctum/csrf-cookie` proxy are available |
| 402 | Trial expired — billing or extend trial |
| Webhook silent | Signature secret; `tenant_id` + `plan` metadata |
| Mail missing | `MAIL_*`, `queue` container running |
