import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    app: 'Rejuuv API',
    message: 'API is running!',
    timestamp: new Date().toISOString(),
  });
}
