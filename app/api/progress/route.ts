import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import type { UserProgress, Language } from '@/lib/types';

// GET /api/progress — returns user_progress joined with language for the current user
// Optional: ?languageId=xxx to get a single language's progress
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const languageId       = searchParams.get('languageId');

    if (languageId) {
      const rows = await query<UserProgress & { language_name: string; is_builtin: number }>(
        `SELECT up.*, l.name as language_name, l.is_builtin
         FROM user_progress up
         JOIN languages l ON l.id = up.language_id
         WHERE up.user_id = ? AND up.language_id = ?`,
        [user.id, languageId],
      );
      return NextResponse.json({ progress: rows[0] ?? null });
    }

    const rows = await query<UserProgress & { language_name: string; is_builtin: number }>(
      `SELECT up.*, l.name as language_name, l.is_builtin
       FROM user_progress up
       JOIN languages l ON l.id = up.language_id
       WHERE up.user_id = ?
       ORDER BY up.last_active DESC`,
      [user.id],
    );

    return NextResponse.json({ progress: rows });
  } catch (err) {
    console.error('[progress GET]', err);
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
  }
}
