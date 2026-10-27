# AKT Gifting Admin

Separate Next.js admin app for catalog, inventory, banners, and orders.

## Status

Folder structure only — architecture, UI, and features not built yet.

## Run

```bash
npm install
npm run dev
```

Default: http://localhost:3011 (set in `package.json` after confirm).

## Prototype (sample data, no database)

Locally:

```bash
NEXT_PUBLIC_ADMIN_MOCK=1 npm run dev          # macOS / Linux
$env:NEXT_PUBLIC_ADMIN_MOCK="1"; npm run dev  # Windows PowerShell
```

Hosted click-through demo (e.g. a Vercel project made for sharing): set
`NEXT_PUBLIC_ADMIN_MOCK=1` and `ADMIN_PUBLIC_DEMO=1`, leave `MONGODB_URI`
unset, and redeploy. Sign-in is skipped and every screen runs on the seeded
mock data. The demo refuses to switch on while `MONGODB_URI` is set, so never
add these flags to the real admin deployment.
