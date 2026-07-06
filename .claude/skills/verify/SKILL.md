---
name: verify
description: How to build, launch, and drive type-so-fast to verify changes end-to-end.
---

# Verifying type-so-fast

Next.js app backed by AccelByte Gaming Services. Namespace comes from `ACCELBYTE_NAMESPACE` in `.env.local` — read it before running any `ags` CLI command that needs `--namespace`. All AGS calls go through `/api/*` route handlers that hold the access token; the client sends `Authorization: Bearer <accessToken>` + `X-User-Id` headers (see `lib/api.ts`).

## Launch

```bash
npm run dev -- --port 3123   # ready when GET / returns 200 (~10s)
```

## Get a real session (no browser needed)

Device-ID login creates/reuses an AGS user, so API flows can be driven with curl/python:

```bash
curl -s -X POST http://localhost:3123/api/auth -H 'Content-Type: application/json' \
  -d '{"deviceId":"verify-<something>"}'   # → {"userId":..., "accessToken":...}
```

Use a throwaway `deviceId` per test run — each new ID mints a fresh AGS user in the dev namespace, so stat/achievement state starts clean.

## Drive the flows

- CloudSave-backed routes (`/api/records`, `/api/history`, `/api/streak`, `/api/settings`, `/api/progression`): GET → PUT → GET read-back with the auth headers above.
- `/api/stats` POST body is `GameResultStats` (`lib/ags/statistics.ts`); stat-tied achievements unlock server-side when stats land, so a follow-up POST `/api/achievements` (with `previousCodes`) returns them in the newly-unlocked diff.
- AGS-side read-backs via the `ags` CLI: `ags social user-stat-values list --namespace $ACCELBYTE_NAMESPACE --user-id <id> --stat-codes <one-code>` (one code per call — comma lists are rejected), `ags achievement achievements list --limit 100`.

## Gotchas

- The typing UI itself (reducer, WPM math) has no headless driver here; SSR HTML from `GET /` at least confirms components render (client components are server-rendered).
- `ags` CLI auth auto-refreshes from the stored refresh token; check `ags auth status --format json` if calls 401.
