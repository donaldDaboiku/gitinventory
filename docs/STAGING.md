# Staging environment

Use a staging stack before production so Paystack webhooks, mail, and Docker config can be verified safely.

## Goals

- Same compose layout as production (`docker-compose.yml`)
- Paystack **test** keys only
- Separate database and domains (e.g. `staging-api.example.com`, `staging.example.com`)
- `APP_DEBUG=false` still recommended; use logs + `php artisan pail` instead

## Setup checklist

1. Copy `.env.production.example` to a staging `.env` (do not reuse production secrets).
2. Set:
   - `APP_URL` / `FRONTEND_URL` / `BILLING_CALLBACK_URL` to staging hosts
   - `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` to **test** keys
   - `MAIL_*` to a catch-all inbox or log driver for early smoke tests
3. `docker compose up --build`
4. Run migrations/seeders inside the backend container.
5. Configure Paystack webhook URL to `https://staging-api…/api/billing/webhook`.
6. Register a test business → confirm verify email (or mark verified in DB for QA) → create sale → export report.

## Smoke tests

- [ ] Register + welcome/verification emails
- [ ] Login + password reset
- [ ] Product CSV import
- [ ] POS / barcode sale + receipt PDF
- [ ] Demo billing checkout (empty Paystack keys) **or** Paystack test charge
- [ ] Low-stock / trial reminder commands once via `php artisan …`

## Promote to production

Only after staging smoke tests pass: rotate to live Paystack keys, production mail, backups, and DNS. Keep staging available for later releases.
