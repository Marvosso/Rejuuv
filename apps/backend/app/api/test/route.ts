import { NextResponse } from 'next/server';
import { enforceIpRateLimit } from '../../../lib/rate-limit';

export async function GET(request: Request) {
  const ipLimited = await enforceIpRateLimit(request, 'GET /api/test');
  if (!ipLimited.ok) {
    return ipLimited.response;
  }
  return NextResponse.json({
    app: 'Rejuuv API',
    message: 'API is running!',
    timestamp: new Date().toISOString(),
  });
}
