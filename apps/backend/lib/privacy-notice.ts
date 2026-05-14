/**
 * Static beta disclosure for API consumers (no DB reads). Not legal advice —
 * replace with counsel-approved copy for GA.
 *
 * Internal engineering map: docs/internal/PRIVACY_DATA_MAP.md
 */
export const PRIVACY_NOTICE = {
  version: 'beta-0.2',
  summary:
    'Rejuuv processes account identifiers, movement check-ins, and assessment text you submit to provide recovery guidance. We do not sell your data.',
  data_categories: [
    'Account profile (email, name) in Supabase Auth and public.users',
    'Intake and assessment blobs (symptom-related text and AI outputs)',
    'Recovery plans and check-ins (including optional notes and AI adjustments)',
    'Product telemetry (scrubbed properties; no raw clinical notes by policy)',
    'Push notification tokens',
    'Subscription mirror rows (Stripe ids and status); payments live in Stripe',
  ],
  retention:
    'Operational health and app data are retained while your account exists. Account deletion (authenticated POST /api/me/delete-account with { "confirm": true }) removes your Rejuuv application rows and auth user. Stripe retains billing records under their policies unless you separately change or delete your Stripe customer.',
  telemetry:
    'Telemetry stores event names and small JSON properties. Server-side scrubbing drops clinical keys and long free-text before insert.',
  stripe_note:
    'Deleting your Rejuuv account does not automatically delete your Stripe customer or invoice history. Contact support if you need billing help.',
  contact: 'Use in-app support or your beta coordinator for access or deletion questions.',
} as const;
