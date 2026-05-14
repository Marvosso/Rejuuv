import { getUserSubscriptionStatus } from './subscription';
import { apiFailure, API_ERROR_CODES } from './api-errors';

/** Copy tuned for trust: no pressure, no urgency language. */
export const CALM_PRO_COPY =
  'Deeper personalization is available when you choose it — nothing here is urgent.';

/**
 * Whether the user currently has paid (or trialing) access per `subscriptions` table.
 */
export async function userHasActivePro(userId: string): Promise<boolean> {
  const { isActive } = await getUserSubscriptionStatus(userId);
  return isActive;
}

/**
 * Standard JSON for routes that must hard-block without AI fallback.
 * Prefer soft gates (e.g. starter plan) where emotional trust matters more.
 */
export function proRequiredResponse() {
  return apiFailure(API_ERROR_CODES.PRO_REQUIRED, CALM_PRO_COPY, 403, true);
}
