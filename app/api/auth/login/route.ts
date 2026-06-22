import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/d1';
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await queryOne<User>(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()],
    );

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token  = signSession(user.id);
    const cookie = setSessionCookie(token);

    const response = NextResponse.json({ ok: true, userId: user.id });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
