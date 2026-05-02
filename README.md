# Stacktic Admin

Operator console for the Stacktic team. Separate from the customer-facing app
(`site-app`).

## Architecture

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind
  with brand tokens · pnpm. Mirrors `site-app` so cognitive overhead stays low
  when hopping between repos.
- **Auth posture:** Currently no auth — local dev only. Production deploys
  will gate access via Google SSO against the Stacktic Google Workspace.
  Workspace membership *is* the allowlist; no `admin_users` table.
- **Data access:** Reads and writes Postgres directly. Most surfaces are
  read-only today, but the operator console is allowed to correct data when
  needed. Schema migrations still happen only in `site-app` (single source
  of schema truth). Defense-in-depth lives at the auth layer (Workspace
  SSO), not the DB role.
- **Branding:** Same tokens, same brand assets as `site-app`. Manually
  duplicated under `tokens/` and `public/brand/` per the hosting doc's
  "tokens stay duplicated across two consumers" decision. Sync by hand
  if either repo changes them.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3100
```

`site-app` runs on port 3000; `site-admin` runs on port 3100 so both can be
running at once.

## Routes

- `/` — operator home (placeholder)
- `/api/health` — returns 200 if the app is up

More routes land as we build out the operator features.

## Conventions

- **No hex colors in components.** Use brand tokens (`bg-surface`,
  `text-heading`, etc.) — see `handoff/BRAND.md` §Don't.
- **Strict TypeScript.** `noUncheckedIndexedAccess` is on.
- **No edge runtime for domain logic.** All API routes run on Node so they
  can talk to Postgres directly.
