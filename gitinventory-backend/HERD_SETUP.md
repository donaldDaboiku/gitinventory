# GITInventory Backend — Laravel Herd Setup Guide

## What was reviewed & what was added

### Your original project had:
- ✅ Laravel 13 + PHP 8.3
- ✅ Sanctum installed (`laravel/sanctum ^4.3`)
- ✅ Spatie Laravel Permission (`^7.4`)
- ✅ Spatie Activity Log (`^5.0`)
- ✅ Ramsey UUID
- ✅ PostgreSQL configured in `.env`
- ✅ Basic users + permission migrations
- ⚠️ No API routes defined
- ⚠️ No controllers beyond the base Controller
- ⚠️ No models beyond User
- ⚠️ No multi-tenancy (tenant_id) structure
- ⚠️ SQLite database file was still present (should use PostgreSQL)

### What was added:
- ✅ 9 Models: Tenant, Branch, Category, Product, StockMovement, Customer, Supplier, Sale, SaleItem, Purchase, PurchaseItem
- ✅ 3 New migrations (tenants, user fields, all inventory tables)
- ✅ Full API routes (`routes/api.php`)
- ✅ Auth controllers: Register, Login, Logout
- ✅ Product CRUD with search, filtering, low stock detection
- ✅ Stock controller: stock-in, stock-out, adjustment, audit trail
- ✅ Sales controller with full transaction logic + stock deduction
- ✅ Purchase controller with stock-in on receive
- ✅ Dashboard controller with KPIs and chart data
- ✅ Roles & Permissions seeder (owner, manager, sales_staff, inventory_officer, accountant)
- ✅ Herd `.env` config

---

## Step 1 — Install Laravel Herd

Download from: https://herd.laravel.com

After installing Herd:
- Herd handles PHP 8.3, Nginx, and database services for you
- Your sites go in `~/Herd/` by default
- Access as `http://sitename.test`

---

## Step 2 — Move your project into Herd

```bash
# Move the project into Herd's sites folder
mv /path/to/gitinventory-backend ~/Herd/gitinventory-backend

# OR create a symlink if you want to keep it elsewhere
# Herd > Open Herd > Sites > Add path
```

Your app will then be available at: `http://gitinventory-backend.test`

---

## Step 3 — Set up PostgreSQL

### Option A: Herd Pro (recommended)
Herd Pro includes PostgreSQL built-in. Enable it from the Herd menu.

### Option B: Install PostgreSQL manually (free)
```bash
# macOS with Homebrew
brew install postgresql@16
brew services start postgresql@16

# Create your database
psql postgres
CREATE DATABASE gitinventory;
\q
```

### Option C: DBngin (GUI tool, free)
Download from: https://dbngin.com — easiest option for local dev.

---

## Step 4 — Configure .env

Copy the Herd-ready env file:
```bash
cp .env.herd .env
```

Update these values to match your local PostgreSQL setup:
```env
APP_URL=http://gitinventory-backend.test

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gitinventory
DB_USERNAME=your_pg_username  # usually your macOS username
DB_PASSWORD=                  # blank if no password set
```

---

## Step 5 — Install dependencies & run migrations

```bash
cd ~/Herd/gitinventory-backend

# Install PHP packages
composer install

# Generate app key (only if new .env)
php artisan key:generate

# Run all migrations
php artisan migrate

# Seed roles and permissions
php artisan db:seed

# Create storage link
php artisan storage:link
```

---

## Step 6 — Verify the API is working

```bash
# Test the health endpoint
curl http://gitinventory-backend.test/up

# Register a business
curl -X POST http://gitinventory-backend.test/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "ABC Pharmacy",
    "name": "John Adeyemi",
    "email": "john@abcpharmacy.com",
    "password": "Password1",
    "password_confirmation": "Password1"
  }'

# Login
curl -X POST http://gitinventory-backend.test/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@abcpharmacy.com", "password": "Password1"}'
```

---

## Step 7 — Recommended Herd workflow

```bash
# In one terminal — watch logs (Pail is installed)
php artisan pail

# In another terminal — run queue worker
php artisan queue:listen --tries=1

# Or use the built-in composer dev script
composer dev
```

---

## API Reference (Phase 1)

### Authentication
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| POST   | /api/auth/register     | Register business + owner|
| POST   | /api/auth/login        | Login                    |
| POST   | /api/auth/logout       | Logout (token required)  |
| GET    | /api/auth/me           | Current user profile     |

### Products
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/products          | List (search, filter)    |
| POST   | /api/products          | Create product           |
| GET    | /api/products/{id}     | View product             |
| PUT    | /api/products/{id}     | Update product           |
| DELETE | /api/products/{id}     | Delete product           |

### Stock
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| POST   | /api/stock/in          | Add stock                |
| POST   | /api/stock/out         | Remove stock             |
| POST   | /api/stock/adjust      | Manual adjustment        |
| GET    | /api/stock/movements   | Audit trail              |

### Sales
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/sales             | List sales               |
| POST   | /api/sales             | Create sale (POS)        |
| GET    | /api/sales/{id}        | View sale detail         |

### Purchases
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/purchases         | List purchases           |
| POST   | /api/purchases         | Receive stock purchase   |
| GET    | /api/purchases/{id}    | View purchase detail     |

### Other resources (CRUD)
- `/api/categories`
- `/api/customers`
- `/api/suppliers`
- `/api/branches`
- `/api/dashboard`

---

## Roles & Permissions

| Role               | Access level                                |
|--------------------|---------------------------------------------|
| owner              | Full access                                 |
| manager            | All except settings, user management        |
| sales_staff        | POS, sales, view products                   |
| inventory_officer  | Products, stock, purchases, suppliers       |
| accountant         | View-only: sales, purchases, reports        |

---

## Next steps (Phase 2)

1. Add `SANCTUM_STATEFUL_DOMAINS` to `.env` when connecting a React frontend
2. Add Paystack payment integration (`composer require unicodeveloper/laravel-paystack`)
3. Add report endpoints (daily sales, profit, stock valuation)
4. Add email notifications for low stock
5. Switch `QUEUE_CONNECTION=redis` when adding Redis (Herd Pro)
6. Build React frontend connecting to this API

---

## Important notes

- **Never expose the `.env` file** — it contains `APP_KEY`
- **Sanctum** is already configured for API token auth — the frontend should send `Authorization: Bearer {token}`
- **All queries are tenant-scoped** — `tenant_id` check is on every controller
- **DB transactions** are used in Sale and Purchase creation to prevent partial writes
- **Stock movements** are always logged — full audit trail is built in
