# Staging environment

Use the Docker stack with staging overrides and Paystack **test** keys before production.

## Quick start (local staging)

```powershell
cd GITInventory
copy .env.staging.example .env.staging
.\scripts\gen-app-key.ps1 -EnvFile .env.staging
# Edit .env.staging: DB_PASSWORD, optional PAYSTACK test keys, mail

docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up --build -d
```

| Service | URL |
|---------|-----|
| App | http://localhost:8080 |
| API (direct) | http://localhost:8001 |
| Health | http://localhost:8080/up |

Optional demo user:

```powershell
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging exec backend php artisan db:seed --class=DemoUserSeeder
```

Then mark the demo email verified if needed, or use **Create account** and verify via `MAIL_MAILER=log` (`docker compose … exec backend tail -f storage/logs/laravel.log`).

## Goals

- Same images as production (`docker-compose.yml` + `docker-compose.staging.yml`)
- Paystack **test** keys only (or empty keys → demo billing)
- Separate `.env.staging` secrets (never reuse production `APP_KEY` / DB password)
- Host ports `8080` / `8001` by default so they do not clash with local PHP on `8000`

## Remote staging hosts

Set in `.env.staging`:

- `APP_URL` / `FRONTEND_URL` / `BILLING_CALLBACK_URL` to staging hostnames
- Put TLS (Caddy/nginx/cloud LB) in front of the frontend port
- Paystack webhook: `https://staging-api…/api/billing/webhook`

## Smoke tests

- [ ] Register + welcome/verification emails
- [ ] Login + password reset
- [ ] Product CSV import
- [ ] POS / barcode sale + receipt PDF
- [ ] Demo billing **or** Paystack test charge
- [ ] `php artisan subscriptions:send-trial-reminders`
- [ ] `php artisan inventory:send-low-stock-alerts`
- [ ] Activity CSV export (Settings → Audit)

## Promote to production

1. Smoke tests green on staging.
2. `copy .env.production.example .env` → strong `DB_PASSWORD`, live Paystack keys, real SMTP.
3. `.\scripts\gen-app-key.ps1` (new key, not the staging one).
4. `docker compose --env-file .env up --build -d`
5. Configure live webhook + HTTPS + nightly `pg_dump` (see [DEPLOYMENT.md](DEPLOYMENT.md)).

Keep staging running for the next release.
