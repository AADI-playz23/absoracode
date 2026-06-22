import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query, execute } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import type { Language } from '@/lib/types';

// GET /api/languages — returns all languages (optional ?builtin=1 filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const builtinOnly      = searchParams.get('builtin') === '1';

    const sql = builtinOnly
      ? 'SELECT * FROM languages WHERE is_builtin = 1 ORDER BY name'
      : 'SELECT * FROM languages ORDER BY is_builtin DESC, name';

    const languages = await query<Language>(sql);
    return NextResponse.json({ languages });
  } catch (err) {
    console.error('[languages GET]', err);
    return NextResponse.json({ error: 'Failed to fetch languages' }, { status: 500 });
  }
}

// POST /api/languages — upsert a custom language (auth required)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Language name is required' }, { status: 400 });
    }

    const normalized = name.trim();

    // Check if already exists
    const existing = await query<Language>(
      'SELECT * FROM languages WHERE name = ?',
      [normalized],
    );

    if (existing.length > 0) {
      return NextResponse.json({ language: existing[0] });
    }

    const id = uuid();
    await execute(
      'INSERT INTO languages (id, name, is_builtin) VALUES (?, ?, 0)',
      [id, normalized],
    );

    const language: Language = {
      id,
      name: normalized,
      is_builtin: 0,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ language }, { status: 201 });
  } catch (err) {
    console.error('[languages POST]', err);
    return NextResponse.json({ error: 'Failed to create language' }, { status: 500 });
  }
}
