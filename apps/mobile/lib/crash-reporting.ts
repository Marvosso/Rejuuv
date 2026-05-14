/**
 * Client-side crash / error sink for Rejuuv beta.
 *
 * ## Sentry (recommended for TestFlight / production)
 *
 * 1. `cd apps/mobile && npx expo install @sentry/react-native`
 * 2. In `app.json` → `expo.plugins`, add `"@sentry/react-native/expo"` (see Sentry “Expo” guide for org/project options).
 * 3. Set `EXPO_PUBLIC_SENTRY_DSN` in EAS secrets or `.env` (never commit real DSNs to public repos).
 * 4. In this file, after install, add:
 *    `import * as Sentry from '@sentry/react-native';`
 *    and in `initCrashReporting()` call `Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, ... })`.
 * 5. In `logClientError`, call `Sentry.captureException(error, { extra: context })`.
 *
 * Until then, errors are logged to the device console (Metro / Xcode / Logcat) for debugging.
 */
let crashReportingInitDone = false;

/** Idempotent; safe to call from root layout on launch. */
export function initCrashReporting(): void {
  if (crashReportingInitDone) return;
  crashReportingInitDone = true;
  const dsn = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() : '';
  if (__DEV__ && dsn) {
    console.warn(
      '[rejuuv] EXPO_PUBLIC_SENTRY_DSN is set but native Sentry is not wired in crash-reporting.ts yet. Follow the header comment in lib/crash-reporting.ts to enable uploads.'
    );
  }
}

/**
 * Never throws; safe from ErrorBoundary and async handlers.
 * Wire Sentry.captureException here after installing @sentry/react-native.
 */
export function logClientError(error: Error, context?: Record<string, unknown | undefined>): void {
  const payload = {
    ts: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };
  try {
    console.error('[rejuuv-client]', JSON.stringify(payload));
  } catch {
    console.error('[rejuuv-client]', error);
  }
}
