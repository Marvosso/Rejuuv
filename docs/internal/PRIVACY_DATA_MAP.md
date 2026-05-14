# Rejuuv — internal privacy & data map (beta)

**Audience:** engineering + founders. **Not** legal advice. Counsel should review before GA, especially health data and retention in your jurisdictions.

---

## 1. Data inventory

| Domain | What is collected | Why | Where stored | Health-adjacent? | App deletion (`DELETE public.users`) |
|--------|-------------------|-----|--------------|------------------|----------------------------------------|
| **Profile / account** | `public.users`: id (matches `auth.users`), email, full_name, `stripe_customer_id`, `subscription_tier`, timestamps | Auth, Stripe linkage, tier gating | Supabase Postgres + Supabase Auth | Email/name: PII, not clinical | Row removed; Auth user removed in same flow |
| **Assessments** | `assessments`: body_area, `intake_data` (JSON text), `analysis_result` (JSON text), `safety_flagged` | Intake + AI analysis + safety path | Supabase | **Yes** — symptom narratives and analysis | CASCADE from `users` |
| **Recovery plans** | `recovery_plans`: body_area, `assessment_data`, `plan_data`, phase, status, optional `assessment_id` | Generated plan + continuity | Supabase | **Yes** — plan content reflects symptoms | CASCADE from `users` |
| **Check-ins** | `check_ins`: pain_level, pain_change, difficulty, `completed_activities`, `notes`, `adjustments` (AI JSON) | Progress + AI coaching | Supabase | **Yes** | CASCADE from `users` |
| **AI / adaptation events** | `adaptation_events`: event_type, detail, links to plan/check-in | Continuity / phase logic audit | Supabase | **Maybe** — detail is JSON/text, avoid raw notes in new events | CASCADE from `users` |
| **Safety events** | `safety_alerts`: body_area, message, recommended_action (schema exists; API usage may be limited) | Safety UX | Supabase | **Yes** if populated | CASCADE from `users` |
| **Telemetry** | `telemetry_events`: event_name, `properties` (JSONB), source | Product analytics; scrubbed server-side | Supabase | **Low** if scrub rules hold — no raw clinical blobs by policy | CASCADE from `users` |
| **Push** | `push_tokens`: Expo token | Notifications | Supabase | Low (token is sensitive device channel) | CASCADE from `users` |
| **Subscriptions (app mirror)** | `subscriptions`: Stripe ids, status, period fields | App reads / webhook sync | Supabase | Billing metadata, not symptoms | CASCADE from `users` — **Stripe remains source of record** |
| **Stripe / billing (external)** | Customer, invoices, payment methods, subscription objects | Payments + tax | **Stripe** (not Supabase) | PII + financial | **Not deleted** by Rejuuv account deletion; founder must define policy (e.g. anonymize customer, export for tax) |
| **Webhook dedupe** | `processed_stripe_events`: Stripe event ids | Idempotency | Supabase | No user FK — not attributable to one user after account gone | Rows **retained** |
| **Rate limits** | `api_rate_limit_counters`: per-user per-route per minute bucket | Abuse prevention | Supabase | No clinical content | **Not** FK-linked — **deleted explicitly** in account deletion helper before `users` delete |

---

## 2. Retention (beta expectations)

| Class | Beta expectation |
|-------|------------------|
| Clinical / intake / plans / check-ins | Retained **until account deletion** (or manual DB ops in beta). |
| Telemetry | Retained **until account deletion** (CASCADE); properties must stay non-clinical per engineering policy. |
| Auth | Removed when `auth.admin.deleteUser` succeeds after app row delete. |
| Stripe | **Independent retention** per Stripe/account settings and law; Rejuuv does **not** remove Stripe customers in the default deletion path. |
| `processed_stripe_events` | Long-lived dedupe; no user id. |

**Future (post-beta):** configurable retention windows, export before delete, anonymize vs hard delete, regional DPA.

---

## 3. Deletion behavior (implemented / intended)

1. Authenticated `POST /api/me/delete-account` with `{ "confirm": true }`.
2. Backend removes **`api_rate_limit_counters`** for the user (no FK cascade).
3. Backend **`DELETE FROM public.users WHERE id = user`** → CASCADE removes: assessments, recovery_plans, check_ins, adaptation_events, safety_alerts, push_tokens, telemetry_events, subscriptions (local mirror), etc., per current FKs.
4. **`supabase.auth.admin.deleteUser(userId)`** removes Auth user.
5. **Stripe:** no automatic `Customer.delete` in code — invoices and legal holds stay with Stripe; founders should align with counsel.

---

## 4. Gaps for founder / legal review

- **Stripe:** whether to anonymize/delete customers, data processing agreement, and tax record retention.
- **Health data:** whether Rejuuv is a “medical” or “wellness” service in each market; DPIA / HIPAA / GDPR applicability.
- **Minors / regional:** age gating and localized privacy copy.
- **`processed_stripe_events`:** acceptable to retain forever with no user link, or TTL policy.
- **Backups:** Supabase/Stripe backup retention and restore procedures.
- **AI vendors:** Anthropic data use policies and subprocessor list for privacy policy.

---

## 5. Related code / docs

- API disclosure: `GET /api/public/privacy` → `apps/backend/lib/privacy-notice.ts`
- Account deletion: `apps/backend/app/api/me/delete-account/route.ts`, `apps/backend/lib/account-deletion.ts`
- Telemetry scrub: `apps/backend/lib/telemetry/telemetry-properties.ts`
