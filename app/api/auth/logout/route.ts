import { NextResponse } from 'next/server';
import { clearSessionCookie, COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const cookie   = clearSessionCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return response;
}
