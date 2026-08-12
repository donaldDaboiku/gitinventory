# GITInventory — User Manual

This guide explains how to use the GITInventory web application day to day. It assumes you have already been given a login or have registered a new business account.

---

## Table of contents

1. [Getting started](#getting-started)
2. [Navigation](#navigation)
3. [Dashboard](#dashboard)
4. [Products & categories](#products--categories)
5. [Stock](#stock)
6. [Sales (including barcode POS)](#sales-including-barcode-pos)
7. [Purchases](#purchases)
8. [Customers, suppliers & branches](#customers-suppliers--branches)
9. [Reports](#reports)
10. [Settings & team](#settings--team)
11. [Subscription & billing](#subscription--billing)
12. [Roles and access](#roles-and-access)
13. [Tips & troubleshooting](#tips--troubleshooting)

---

## Getting started

### Sign in

1. Open the app URL provided by your administrator (e.g. `http://localhost:5173` in development).
2. Enter your **email** and **password**.
3. Click **Sign in**.

### Forgot password

1. On the sign-in screen, click **Forgot password?**
2. Enter your **email** and click **Send reset link**.
3. Open the link in the email (it opens the app with a **Set new password** form).
4. Enter and confirm your new password, then sign in.

If you do not receive an email, check spam or ask your administrator to confirm mail is configured on the server.

### Create a new business (trial)

1. On the login screen, click **Create account**.
2. Fill in **business name**, **your name**, **email**, **phone** (optional), and **password**.
3. Click **Start trial**.

A **14-day free trial** begins immediately. You receive a welcome email and a **verification email** (when mail is configured). Confirm your email before using inventory, sales, and reports. A default **Main Branch** is created for your business.

### Sign out

Use **Sign out** at the bottom of the left sidebar.

---

## Navigation

The left sidebar lists the pages you are allowed to see (based on your role).

| Page | Purpose |
|------|---------|
| **Dashboard** | Today’s KPIs, charts, low stock count |
| **Reports** | Financial summary and exports |
| **Products** | Product catalog and categories |
| **Stock** | Stock movements and low-stock alerts |
| **Sales** | Sales list and new sales / POS |
| **Purchases** | Purchase orders and receiving |
| **Customers** | Customer directory |
| **Suppliers** | Supplier directory |
| **Branches** | Store locations |
| **Settings** | Business profile, inventory defaults, team, plan |

The top bar shows the current page title, **Refresh**, and **New …** (when you can create records on that page).

---

## Dashboard

The dashboard gives a quick health check:

- **Today / month revenue** and sale counts
- **Low stock** count (products at or below minimum level)
- **Receivables** (unpaid customer balances)
- **Last 7 days** revenue chart
- **Top products** this month
- **Expiring soon** products (within 30 days)

Click **Refresh** if numbers look stale.

---

## Products & categories

### Add a product

1. Go to **Products** → **New product**.
2. Enter **name**, **category**, **branch**, **unit**, **cost price**, **selling price**, and opening **quantity** (for new items only).
3. **SKU** and **barcode** can be left blank — the system auto-generates them on save.
4. Click **Save product**.

### SKU and barcode

- **SKU** — internal code (e.g. `SKU-00001`) for search and reports.
- **Barcode** — scannable code (13-digit internal format) used at the sales POS.

You can type or scan an existing packaged product barcode when creating/editing a product, or click **Regenerate SKU & barcode** for suggestions.

### Search and categories

- Use the **search box** to find products by name, SKU, or barcode (updates automatically).
- Add categories in the **Categories** panel with **Add category**.

### Edit / delete

Use **Edit** or **Delete** on each row. Stock quantity for existing products is changed from the **Stock** page, not the product form.

### Print labels

- **Label** — opens a printable label with name, price, and barcode (browser print).
- **Label PDF** — downloads a PDF label from the server.

---

## Stock

### Stock modes

Before recording movement, choose:

- **Stock in** — receive goods (optional unit cost).
- **Stock out** — remove stock (e.g. damage, samples).
- **Adjust** — set exact on-hand quantity.

Click **Record stock**, pick **product**, enter quantity (or **new quantity** for adjust), add a **note**, and save.

### Low stock alerts

Products at or below their **minimum stock level** appear in a yellow alert panel at the top of the Stock page.

### History

The movement table shows product, type, quantity, before/after levels, and notes. Use **Load more** for older entries.

---

## Sales (including barcode POS)

### Create a sale manually

1. **Sales** → **New sale**.
2. Set **date**, **branch**, **customer** (optional), **payment method**, **amount paid**, and **discount** if any.
3. Under **Items**, pick products, quantities, and prices.
4. Click **Save sale**.

Stock is reduced automatically when the sale is saved.

### Barcode POS (scan to add lines)

1. In the **New sale** drawer, use **Scan barcode** at the top.
2. Scan with a USB barcode scanner (acts as keyboard + Enter) or type a barcode/SKU and press **Add item**.
3. A line is added with the product and **selling price** filled in.
4. Adjust quantity if needed, then complete payment fields and save.

If the code is not found, check that the product exists and is **active**.

### View sale details & receipt

1. On the **Sales** list, click a row to open details.
2. Click **Download receipt** for a PDF invoice.

### Filters

Filter by **date range** and **payment status** (paid / partial / pending).

---

## Purchases

### Record a purchase

1. **Purchases** → **New purchase**.
2. Enter **date**, **branch**, **supplier**, **reference**, **amount paid**.
3. Add line items: product, quantity ordered, quantity received, unit cost.
4. Save.

Received quantity increases stock and can update cost price.

### View details

Click a purchase row for line-item details.

---

## Customers, suppliers & branches

These directories work the same way:

1. Open the page → **New …** to add.
2. **Edit** / **Delete** on each row (if your role allows).

**Customers** support **credit limit** for future credit sales. **Branches** represent physical locations; products can be assigned to a branch.

---

## Reports

1. Go to **Reports**.
2. Choose **From** and **To** dates.
3. Click **Generate**.

You will see revenue, gross profit, COGS, purchases, receivables, payables, stock valuation, and a **daily breakdown**.

### Export

- **Export CSV** — spreadsheet-friendly download.
- **Export PDF** — formatted report (requires `reports.export` permission).

---

## Settings & team

Available to users with **Settings** access (typically **owner**).

### Business tab

Company name, contact details, **currency**, **timezone**, and address.

### Inventory tab

| Setting | Effect |
|---------|--------|
| Default min stock | Used for new products |
| Default tax rate % | Applied on sales when product has no tax rate |
| Invoice prefix | Sale invoice numbers (e.g. `INV-00001`) |
| Allow negative stock | If off, sales block when quantity is insufficient |

### Team tab

Owners can **invite** users with a role and temporary password. Edit name, phone, role, or active status on existing members.

### Plan tab

View trial and subscription status. **Owners** can upgrade — see [Subscription & billing](#subscription--billing).

---

## Subscription & billing

### Trial

- New accounts get **14 days** free.
- A **trial banner** shows days remaining while on trial.
- Reminder emails are sent **3 days** and **1 day** before trial ends (when mail is configured).

### After trial

When the trial ends without a paid plan:

- Most pages return a subscription message.
- You are directed to **Settings → Plan** to upgrade.
- **Sign out** remains available.

### Upgrade (owner)

1. **Settings** → **Plan** (or use the trial banner **Manage plan**).
2. Choose **Starter** or **Business**.
3. Complete payment via **Paystack** (production), or in development without Paystack keys the app activates a **demo subscription** immediately.

Paid access extends **subscription_expires_at** by 30 days (configurable on the server).

---

## Roles and access

| Permission area | owner | manager | sales_staff | inventory_officer | accountant |
|-----------------|-------|---------|-------------|-----------------|------------|
| Settings / billing | Yes | No | No | No | No |
| Team management | Yes | View only | No | No | No |
| Products (full) | Yes | Yes | View | Yes | View |
| Stock in/out/adjust | Yes | Yes | Out only | Yes | View |
| Sales | Yes | Yes | Yes | No | View |
| Purchases | Yes | Yes | No | Yes | View |
| Customers / suppliers | Yes | Yes | Customers | Suppliers | View |
| Reports + export | Yes | Yes | View | View | Yes + export |
| Branches | Yes | View | No | No | No |

If a menu item is missing, your role does not include that permission — contact your workspace **owner**.

---

## Tips & troubleshooting

### “Session expired”

Sign in again. Tokens expire after extended inactivity.

### “Subscription expired”

Ask the **owner** to upgrade under **Settings → Plan**, or sign out and use another workspace.

### Barcode scan does nothing

- Focus the **Scan barcode** field.
- Confirm the product **barcode** or **SKU** matches exactly.
- USB scanners usually send Enter after the code — the form submits on Enter.

### Export or PDF fails

Check your connection and permissions. Report PDF/CSV requires **reports.export**.

### Numbers don’t match expectations

- Sales **revenue** uses **completed** sales in the selected date range.
- **Stock valuation** uses quantity × cost price for active products.
- Use **Refresh** after another user makes changes.

### Getting help

- **In the app:** **Settings → Help** — short guides for products, POS, stock, reports, team, and billing.
- **Server or billing issues:** contact your system administrator with your **business name**, **email**, and a screenshot of the error message.

---

*GITInventory — inventory, sales, and receiving from one live desk.*
