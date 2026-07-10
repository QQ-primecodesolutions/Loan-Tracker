import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, isValidSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authenticated = await isValidSession(token);
  return NextResponse.json({ authenticated });
}
