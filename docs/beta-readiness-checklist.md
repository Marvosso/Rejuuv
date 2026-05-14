# Rejuuv beta readiness checklist & release gate

Use this document before **TestFlight / internal beta** and before **wider beta**. Each section has **checks** (must pass or be explicitly waived) and **notes**. The **release gate** at the bottom is the minimum bar to ship a build.

**Related:** `apps/mobile/docs/DEEP_LINKS.md` (auth + Stripe return URLs).

**Owners:** fill in names/dates. **Waivers:** require a short risk note + approver.

---

## 1. Auth / session

| # | Check | Pass |
|---|--------|------|
| 1.1 | Supabase **redirect URLs** include `rejuuv://auth/callback` (and dev URIs if used). See `apps/mobile/docs/DEEP_LINKS.md`. | ☐ |
| 1.2 | **Email confirmation** and **password reset** emails use redirects that open the app (PKCE preferred). | ☐ |
| 1.3 | Cold start: **deep link** with valid tokens/code establishes session before auth guard sends user to login. | ☐ |
| 1.4 | **Refresh**: `AppState` + `startAutoRefresh` / `stopAutoRefresh` behave as expected after backgrounding. | ☐ |
| 1.5 | **401** from API triggers refresh once; repeated 401 does not loop; user is not stuck on a blank screen. | ☐ |
| 1.6 | **Sign out** clears local session and sensitive in-memory state; no stale bearer token on next request. | ☐ |

---

## 2. RLS / security

| # | Check | Pass |
|---|--------|------|
| 2.1 | All Supabase tables used by the app have **RLS enabled**; policies match `auth.uid()` (or service-role-only paths are server-only). | ☐ |
| 2.2 | **API routes** validate `getUserIdFromRequest` (or equivalent); no anonymous access to user-owned rows without intent. | ☐ |
| 2.3 | **Plan / check-in / subscription** mutations assert ownership (e.g. `assertPlanOwnership` patterns). | ☐ |
| 2.4 | **Rate limits** enabled for sensitive routes (e.g. check-ins, assessments); migration `011_api_rate_limits` applied in target env. | ☐ |
| 2.5 | **Secrets** only in env / EAS secrets — not committed (Stripe, Supabase service role, Anthropic, webhook signing). | ☐ |
| 2.6 | **CORS / API** surface: production origins restricted if applicable; no debug endpoints exposed. | ☐ |

---

## 3. AI safety

| # | Check | Pass |
|---|--------|------|
| 3.1 | **Safety / escalation** paths for intake and high-risk copy reviewed (blocked flow, medical disclaimers). | ☐ |
| 3.2 | **Fallback copy** when model or parser fails does not promise diagnosis or replace professional care. | ☐ |
| 3.3 | **Adaptive engine** outcomes (`escalate`, `reassess`, etc.) reviewed for copy shown to users. | ☐ |
| 3.4 | **Telemetry** does not log raw clinical notes at excessive length; payload caps enforced server-side. | ☐ |

---

## 4. Prompt injection & payload safety

| # | Check | Pass |
|---|--------|------|
| 4.1 | **`rejectOversizedLlmPayload`** (or equivalent) on all LLM-bound routes; max size documented. | ☐ |
| 4.2 | **`deepNormalizeUserStrings`** / injection signal logging on intake, check-ins, assessments. | ☐ |
| 4.3 | **Structured output**: JSON repair + schema validation; invalid model output does not crash the client. | ☐ |
| 4.4 | **Vitest** (or CI) runs `prompt-sanitize`, `prompt-injection-guard`, `ai-schemas` tests where present. | ☐ |

---

## 5. Privacy & retention

| # | Check | Pass |
|---|--------|------|
| 5.1 | **Privacy notice** (`/legal/privacy` or static copy) matches what you collect (check-ins, plans, telemetry). | ☐ |
| 5.2 | **Account deletion** flow tested end-to-end; Stripe note accurate (“billing may remain in Stripe”). | ☐ |
| 5.3 | **Retention**: policy documented (how long assessments, check-ins, events); DB TTL or manual process defined if required. | ☐ |
| 5.4 | **Push tokens** removed or invalidated on sign-out / delete where applicable. | ☐ |

---

## 6. Stripe / subscription

| # | Check | Pass |
|---|--------|------|
| 6.1 | **Stripe Dashboard**: products/prices match `STRIPE_PRICE_ID_PRO` / `REJUUV_PRODUCT_ID` in production. | ☐ |
| 6.2 | **Webhook** endpoint live with signing secret; `checkout.session.completed` (and other required events) tested. | ☐ |
| 6.3 | **`STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`** set for mobile return (e.g. `rejuuv://subscription?checkout=...`) if using native checkout return. | ☐ |
| 6.4 | **Test mode → Live** checklist completed; no test keys in production mobile env. | ☐ |
| 6.5 | **Upgrade / cancel / portal** exercised on a sandbox user; idempotency keys (`012_check_ins_client_request_id`) applied if using offline check-ins. | ☐ |

---

## 7. Mobile crash & resilience

| # | Check | Pass |
|---|--------|------|
| 7.1 | **Root `ErrorBoundary`** + targeted **`ScreenErrorBoundary`** on heavy surfaces (charts, billing, AI results). | ☐ |
| 7.2 | **Missing `EXPO_PUBLIC_API_URL`**: app does not crash on launch (warn-only path). | ☐ |
| 7.3 | **Malformed route params** (JSON) handled with fallbacks, not `JSON.parse` throws. | ☐ |
| 7.4 | **Offline check-in outbox** + sync on resume; duplicate prevention via `client_request_id` where deployed. | ☐ |
| 7.5 | **Sentry** (or agreed crash sink) configured for TestFlight if required for beta. | ☐ |

---

## 8. TestFlight

| # | Check | Pass |
|---|--------|------|
| 8.1 | **EAS** `preview` / `production` profile has `EXPO_PUBLIC_API_URL` (see `npm run validate:release`). | ☐ |
| 8.2 | **Version + build number** bumped; **What to Test** notes filled in App Store Connect. | ☐ |
| 8.3 | **Internal testers** invited; at least one install on a **clean device** (no dev client). | ☐ |
| 8.4 | **Push notifications** (if used): entitlement, provisioning, and token registration on production build. | ☐ |
| 8.5 | **Deep links** tested on device: auth callback, subscription return (if configured). | ☐ |

---

## 9. Supabase migrations

| # | Check | Pass |
|---|--------|------|
| 9.1 | All **pending** Supabase migrations applied to **staging**; migration list matches repo `supabase/migrations/`. | ☐ |
| 9.2 | Same migrations applied to **production** in a maintenance window or zero-downtime compatible order. | ☐ |
| 9.3 | **Rollback SQL** prepared for the riskiest migration (or restore-from-backup plan documented). | ☐ |
| 9.4 | **RLS** re-verified after migrations (no policy regressions). | ☐ |

---

## 10. Backend deploy (e.g. Vercel)

| # | Check | Pass |
|---|--------|------|
| 10.1 | **`next build`** succeeds; no TypeScript errors in `apps/backend`. | ☐ |
| 10.2 | **Environment variables** set for production: API URL, Supabase URL/keys, Stripe, Anthropic, rate limit knobs, `STRIPE_*_URL`, etc. | ☐ |
| 10.3 | **Health / smoke**: `GET` a lightweight route or version endpoint post-deploy. | ☐ |
| 10.4 | **Cron / webhooks** URLs point to production host. | ☐ |

---

## 11. Rollback plan

| # | Check | Pass |
|---|--------|------|
| 11.1 | **Vercel (or host)**: prior deployment ID recorded; one-click **rollback** tested in staging. | ☐ |
| 11.2 | **Database**: if migration is destructive, **backup taken** before apply; restore steps documented. | ☐ |
| 11.3 | **Mobile**: previous **TestFlight build** remains available or build number allows quick resubmit of prior binary. | ☐ |
| 11.4 | **Feature flags**: if used, document how to disable risky features without redeploy (or accept redeploy). | ☐ |
| 11.5 | **Stripe**: document how to pause checkout or rotate keys if abuse detected. | ☐ |

---

## 12. Tester communication plan

| # | Check | Pass |
|---|--------|------|
| 12.1 | **Welcome message** sent (email or TestFlight notes): what to test, known limitations, how to report bugs. | ☐ |
| 12.2 | **Single feedback channel** (GitHub Issues, Linear, Slack, or email) and SLA expectation (e.g. “best effort weekly triage”). | ☐ |
| 12.3 | **Privacy reminder**: beta may log crashes; no PHI in free-text bug reports. | ☐ |
| 12.4 | **Build announcement** template for each new TF build: version, highlights, regressions to watch. | ☐ |

---

## Release gate (all must be true or waived)

| Gate | Requirement |
|------|--------------|
| **G1** | `npm run validate:release` passes (EAS env + backend `tsc`). |
| **G2** | Backend `npm run build` (or CI equivalent) green. |
| **G3** | Staging Supabase migrations applied; RLS smoke-tested for core tables. |
| **G4** | Stripe webhook + one successful checkout path in staging or production test mode. |
| **G5** | Mobile beta build installs; login, one intake or check-in path, and subscription screen (or guest path) work against production API. |
| **G6** | Rollback owner and steps documented for this release. |

**Sign-off**

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product / clinical advisor (if applicable) | | |

---

## Suggested npm scripts (repo root)

See root `package.json` for what exists today. Recommended additions:

| Script | Purpose |
|--------|---------|
| `validate:release` | **Already present** — EAS `EXPO_PUBLIC_API_URL`, backend `tsc`; optional `INCLUDE_MOBILE_TYPECHECK=1`. |
| `typecheck:backend` | `cd apps/backend && npx tsc --noEmit` |
| `typecheck:mobile` | `cd apps/mobile && npx tsc --noEmit` (enable in gate when clean) |
| `test:backend` | `cd apps/backend && npm test` |
| `test:adaptive` | `cd apps/backend && npx vitest run lib/adaptive-engine` |
| `lint` | **Already present** at root — ensure ESLint includes `apps/mobile` and `apps/backend` paths you care about. |

Optional CI job: `validate:release && test:backend && test:adaptive`.

---

## Remaining release blockers (typical — verify per release)

These are common **blockers** until explicitly cleared:

1. **Mobile `tsc`** — historically noisy with RN/React 19 typings; gate mobile typecheck when clean or scope to critical paths.
2. **Sentry not wired** — crash visibility limited to device logs until `@sentry/react-native` is configured.
3. **Stripe return URLs** still pointing at **web** defaults — mobile may not return to the app after checkout until env vars are set.
4. **Supabase redirect allow list** missing `rejuuv://auth/callback` — email flows fail silently or bounce wrong.
5. **Migration drift** — staging and production migration versions differ.
6. **Secrets in EAS** — missing `EXPO_PUBLIC_*` or server env causes runtime failures after ship.

Update this list when you close a systemic gap.
