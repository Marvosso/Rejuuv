# Vercel deployment (Rejuuv backend only)

Deploy **only** the Next.js backend (`apps/backend`) to Vercel. The Expo app (`apps/mobile`) must not be built by Vercel.

## Required Vercel project settings

Configure the project in Vercel Dashboard → Settings → General:

| Setting | Value |
|--------|--------|
| **Root Directory** | `apps/backend` |
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` (default; overridden by `apps/backend/vercel.json` if present) |
| **Output Directory** | (leave default; Next.js uses `.next`) |
| **Install Command** | (leave default; `apps/backend/vercel.json` sets install to run from monorepo root) |

The repo’s `apps/backend/vercel.json` sets:

- **Install Command**: `cd ../.. && npm ci` so dependencies are installed from the monorepo root and the backend has access to workspace dependencies.

With **Root Directory** = `apps/backend`, Vercel only runs the build in that folder, so `apps/mobile` is never built and the “Missing script: build” error is avoided.

## Summary

1. **Root Directory**: `apps/backend` — so only the backend app is built and deployed.
2. **Install**: From repo root (`cd ../.. && npm ci`) so the monorepo installs correctly.
3. **Build**: `npm run build` runs in `apps/backend` and executes `next build`.
