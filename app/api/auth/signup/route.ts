import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query, execute } from '@/lib/d1';
import { hashPassword, signSession, setSessionCookie } from '@/lib/auth';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid input types' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query<User>('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const id           = uuid();
    const passwordHash = await hashPassword(password);

    await execute(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
      [id, email.toLowerCase().trim(), passwordHash],
    );

    const token  = signSession(id);
    const cookie = setSessionCookie(token);

    const response = NextResponse.json({ ok: true, userId: id }, { status: 201 });
    response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
