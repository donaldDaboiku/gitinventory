# GITInventory Frontend

React + TypeScript frontend for the Laravel API backend.

## Setup

```powershell
npm install
copy .env.example .env
npm run dev
```

The dev server proxies `/api` requests to:

```ini
VITE_API_BASE_URL=http://gitinventory-backend.test
```

If Herd uses a different site URL, update `.env` and restart `npm run dev`.

## Checks

```powershell
npm run lint
npm run build
```
