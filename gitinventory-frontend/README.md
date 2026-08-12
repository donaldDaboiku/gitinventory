# GITInventory Frontend

React 19 + TypeScript + Vite single-page app for the GITInventory API.

**Project docs:** [root README](../README.md) · [User manual](../docs/USER_MANUAL.md) · [Development guide](../docs/DEVELOPMENT.md)

## Setup

```powershell
npm install
copy .env.example .env
npm run dev
```

`.env`:

```ini
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The dev server proxies `/api` to that URL.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Structure

- `src/App.tsx` — layout and page switching
- `src/hooks/useInventoryApp.ts` — auth, API, data loading, billing
- `src/components/views/` — page views (dashboard, products, sales, …)
- `src/components/forms/SaleDrawerForm.tsx` — barcode POS scanning
- `src/components/billing/` — trial banner, subscription expired wall
- `src/components/SettingsView.tsx` — business, inventory, team, plan tabs

## Production build

```powershell
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

Serve `dist/` with nginx, or use the [Dockerfile](Dockerfile) in the root `docker-compose.yml`.

## Demo login

After backend seed: `demo@gitinventory.test` / `Password1`
