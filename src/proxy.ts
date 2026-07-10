import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, isValidSession } from '@/lib/auth';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!(await isValidSession(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/loans/:path*', '/api/settings/:path*'],
};
