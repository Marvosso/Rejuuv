import { NextResponse } from 'next/server';
import { PRIVACY_NOTICE } from '../../../../lib/privacy-notice';
import { enforceIpRateLimit } from '../../../../lib/rate-limit';

/** Public beta privacy / retention disclosure (no auth; no PII). */
export async function GET(request: Request) {
  const ipLimited = await enforceIpRateLimit(request, 'GET /api/public/privacy');
  if (!ipLimited.ok) {
    return ipLimited.response;
  }
  return NextResponse.json(PRIVACY_NOTICE, { status: 200 });
}