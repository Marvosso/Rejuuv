# EAS build environment (TestFlight / production)

If **`EXPO_PUBLIC_SUPABASE_URL`** and **`EXPO_PUBLIC_SUPABASE_ANON_KEY`** are not present when the iOS/Android binary is built, the app used to **crash on launch** (thrown during `lib/auth.ts` import). That throw is removed; you still **must** set these for a working app (sign-in, API auth).

## Recommended: EAS / Expo dashboard

**Option A — Project secrets** (CLI), using the exact names Expo inlines into the JS bundle:

```bash
cd apps/mobile
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project
```

EAS Build typically exposes these to the build environment when the names match `EXPO_PUBLIC_*`.

**Option B — `eas.json`** (non-secret only in git): add the two keys under `build.production.env` **only** if you are comfortable with the values living in the file (usually **no** for the anon key — prefer secrets).

**Option C — Expo website:** Project → Environment variables → set for the **production** build environment.

Then rebuild: `eas build --platform ios --profile production`.

See: [EAS Environment variables](https://docs.expo.dev/build-reference/variables/).

## Verify before ship

After build, in Expo dashboard → build details → **Environment variables** (or logs), confirm the two `EXPO_PUBLIC_SUPABASE_*` variables are listed for that build profile.

## Local dev

Use **`apps/mobile/.env`** (or `.env.local`) with the same keys; never commit real keys.
