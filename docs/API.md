# GITInventory API

Base URL: `{APP_URL}/api`  
Auth: `Authorization: Bearer {token}` (Sanctum)

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | Creates tenant + owner; sends welcome + verify email |
| POST | `/auth/login` | Returns token + user |
| POST | `/auth/logout` | Auth required |
| GET | `/auth/me` | Auth required |
| POST | `/auth/forgot-password` | Always 200 (does not reveal existence) |
| POST | `/auth/reset-password` | `{ email, token, password, password_confirmation }` |
| GET | `/auth/email/verify/{id}/{hash}` | Signed URL; redirects to frontend |
| POST | `/auth/email/resend` | Auth required |

## Business routes

Require **verified email** + **active trial/subscription** unless noted.

| Area | Paths |
|------|-------|
| Dashboard | `GET /dashboard` |
| Products | `GET/POST /products`, `GET/PUT/DELETE /products/{id}`, `GET /products/lookup?code=`, `GET /products/codes/preview`, `GET /products/import/template`, `POST /products/import` (multipart `file`), `GET /products/{id}/label` |
| Stock | `GET /stock/movements`, `POST /stock/in\|out\|adjust` |
| Sales | `GET/POST /sales`, `GET /sales/{id}`, `GET /sales/{id}/pdf` |
| Purchases | `GET/POST /purchases`, `GET /purchases/{id}` |
| Customers / suppliers / branches / categories | Standard `apiResource` |
| Reports | `GET /reports/financial`, `/export`, `/export/pdf` |
| Settings | `GET /settings` (works when subscription expired), `PUT /settings`, `GET /settings/activity/export`, team `users` CRUD |
| Billing | `GET /billing/plans\|status`, `POST /billing/checkout\|confirm-demo` (auth only; no subscription gate), `POST /billing/webhook` (public) |

## Error codes

| HTTP | `code` | Meaning |
|------|--------|---------|
| 402 | `subscription_expired` | Trial/subscription ended |
| 403 | `email_not_verified` | Verify email first |
| 422 | — | Validation errors (`errors` object) |

## Product CSV import

Required columns: `name`, `unit`, `cost_price`, `selling_price`, `quantity`  
Optional: `sku`, `barcode`, `min_stock_level`, `tax_rate`, `category`  
Limit: 200 rows. Units: `piece`, `kg`, `litre`, `box`, `pack`, `dozen`, `carton`.

Download template: `GET /products/import/template`

## Postman quick start

1. Create environment variables `baseUrl` and `token`.
2. Login → set `token` from response.
3. Call protected routes with Bearer token.

A machine-readable OpenAPI file can be generated later from these routes; this document is the source of truth for integrators today.
