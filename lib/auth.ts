// lib/auth.ts
// JWT session management and password hashing utilities.
// Used exclusively by server-side API routes — never imported by client components.

import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { queryOne } from './d1';
import type { User } from './types';

const JWT_SECRET  = process.env.JWT_SECRET!;
const COOKIE_NAME = 'absoracode_session';
const SALT_ROUNDS = 10;

// ─── Password ────────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

interface SessionPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export function signSession(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

export function setSessionCookie(token: string): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name:  COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     '/',
    },
  };
}

export function clearSessionCookie() {
  return {
    name:  COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   0,
      path:     '/',
    },
  };
}

// ─── Request helper ──────────────────────────────────────────────────────────

/**
 * Extract the current authenticated user from the request cookie.
 * Returns null if no valid session exists.
 */
export async function getSessionUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  return queryOne<User>('SELECT * FROM users WHERE id = ?', [payload.userId]);
}

export { COOKIE_NAME };
