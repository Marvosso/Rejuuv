# Rejuuv mobile — deep links & return URLs

The Expo app uses the custom scheme **`rejuuv`** (see `app.json` → `expo.scheme`). File-based routes under `app/` map to paths such as `rejuuv://auth/callback` and `rejuuv://subscription`.

## Supabase (Auth dashboard)

### Redirect URLs (Authentication → URL configuration)

Add every URL the app may receive after email flows:

| Purpose | Example value |
|--------|----------------|
| Email confirmation / magic link / recovery | `rejuuv://auth/callback` |
| Expo dev client (optional) | `exp://127.0.0.1:8081/--/auth/callback` |

Use **Linking.createURL('/auth/callback')** in dev/prod so EAS builds resolve to `rejuuv://auth/callback` (or the correct dev URI).

### Site URL

Set **Site URL** to your primary web origin (e.g. production marketing or API site). Mobile does not rely on it for session restore; sessions use **AsyncStorage** via the Supabase JS client.

### Email templates

- **Confirm signup** and **Reset password** links should point at URLs that ultimately open the app with either:
  - **PKCE**: `?code=...` (preferred; survives more OS handling), or  
  - **Implicit-style fragment**: `#access_token=...&refresh_token=...` (supported in `lib/auth-deep-link.ts`; **some Android versions may strip the hash from `getInitialURL`** — prefer PKCE / hosted flow that returns `code` on the query string).

### Mobile client (`lib/auth.ts`)

- **`detectSessionInUrl: false`** — the app **does not** rely on automatic URL parsing inside the Supabase client. Instead, **`handleAuthDeepLink`** runs on cold start (`Linking.getInitialURL`) and on warm links (`Linking.addEventListener('url')`) in `AuthProvider`, and the **`/auth/callback`** screen uses `useURL()` + `getInitialURL()` as a fallback.

### Expired or reused links

If `exchangeCodeForSession` or `setSession` fails, the user sees a calm **Alert** (`auth-context`) or copy on **`/auth/callback`**, then is routed to **`/auth/login`**.

## Stripe (Dashboard + backend env)

Checkout is opened with **`WebBrowser.openBrowserAsync`** from the subscription screen. Stripe redirects the user to **`success_url`** / **`cancel_url`** after payment or abandonment.

Defaults in `apps/backend/app/api/subscriptions/checkout/route.ts` point at the **web** app (`NEXT_PUBLIC_APP_URL` + `/subscription/success` or `/subscription/cancel`). **Those pages are not the native app** unless you host a tiny page that redirects to `rejuuv://…`.

### Recommended production env (Vercel / backend)

Set:

```text
STRIPE_SUCCESS_URL=rejuuv://subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=rejuuv://subscription?checkout=cancel
```

The mobile **`/subscription`** screen reads `checkout` and **`session_id`**, refetches subscription data, shows a short confirmation, then **`router.replace('/subscription')`** to clear query params.

`{CHECKOUT_SESSION_ID}` is substituted by Stripe.

### Stripe Dashboard

- **Customer portal** (if used elsewhere): return URLs must also be allow-listed for your domain or custom scheme per Stripe’s rules for your integration type.

## Apple / Google (optional)

- **iOS Universal Links**: add `associatedDomains` in `app.json` / Xcode only if you use `https://` links that should open the app without scheme — not required for `rejuuv://` alone.
- **Android App Links**: intent filters for `https` — same note.

## Cold start vs AuthGuard

`AuthProvider` processes **`getInitialURL()`** before the first **`getUser()`** so a valid Supabase link can establish a session **before** `AuthGuard` would send an unauthenticated user to login.

## Test checklist

1. **Sign up** with email confirmation on → tap link → lands on **`rejuuv://auth/callback`** → home with session.
2. **Forgot password** from login → email link → same callback path → session or login with new password.
3. **Stripe success** with `STRIPE_SUCCESS_URL` set to `rejuuv://subscription?checkout=success&…` → app opens subscription tab → status refreshes; dismiss alert; no stuck query params.
4. **Stripe cancel** with `checkout=cancel` → calm message; no charge copy.
5. **Cold start**: force-quit app → open auth link from mail → session restored without flashing login.
6. **Expired link**: reuse old reset link → error alert / callback screen message → login.
7. **Logged out + Stripe return**: rare; user may hit `/subscription` unauthenticated → `AuthGuard` sends to login (query may be lost); document for support.
