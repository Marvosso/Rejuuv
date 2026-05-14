import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '../../../../lib/auth';
import { supabase } from '../../../../lib/db';
import { jsonError } from '../../../../lib/api-errors';
import { enforceRateLimit } from '../../../../lib/rate-limit';
import { log } from '../../../../lib/logger';
import {
  deletePublicUserRow,
  deleteSupplementaryUserScopedRows,
} from '../../../../lib/account-deletion';

/**
 * Permanently deletes the authenticated user's application data (public.users cascades)
 * and removes the Supabase Auth user. Requires explicit JSON body `{ "confirm": true }`.
 *
 * Stripe is not modified here — billing/legal records remain with Stripe.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonError('Unauthorized', 401);
    }

    const limited = await enforceRateLimit(userId, 'delete-account');
    if (!limited.ok) {
      return limited.response;
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== true) {
      return jsonError(
        'Send JSON body { "confirm": true } to permanently delete your account and associated app data.',
        400,
        'CONFIRM_REQUIRED'
      );
    }

    const supplementary = await deleteSupplementaryUserScopedRows(userId);
    if (!supplementary.ok) {
      log.warn('delete-account', 'supplementary row cleanup incomplete', {
        message: supplementary.errorMessage,
      });
    }

    const { error: pubErr } = await deletePublicUserRow(userId);
    if (pubErr) {
      log.error('delete-account', 'public users delete failed', { message: pubErr.message });
      return jsonError(
        'Could not complete account deletion. Please try again or contact support.',
        500
      );
    }

    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
      log.error('delete-account', 'auth.admin.deleteUser failed', { message: authErr.message });
      return jsonError(
        'Your app data was removed, but removing sign-in failed. Please contact support.',
        502
      );
    }

    return NextResponse.json(
      {
        ok: true,
        deleted_application_data: true,
        removed_auth_user: true,
        stripe_untouched:
          'Billing history and customer record remain in Stripe unless you manage them separately.',
      },
      { status: 200 }
    );
  } catch (e) {
    log.error('delete-account', 'unexpected error', {
      message: e instanceof Error ? e.message : String(e),
    });
    return jsonError('Something went wrong.', 500);
  }
}
