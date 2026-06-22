import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import type { Problem } from '@/lib/types';

// GET /api/problem-next?languageId=xxx&index=0
// Returns the next unseen problem for the user in the given language.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const languageId       = searchParams.get('languageId');

    if (!languageId) {
      return NextResponse.json({ error: 'languageId is required' }, { status: 400 });
    }

    // Get all problem IDs the user has already submitted for this language
    const submitted = await query<{ problem_id: string }>(
      'SELECT DISTINCT problem_id FROM submissions WHERE user_id = ? AND language_id = ? AND problem_id IS NOT NULL',
      [user.id, languageId],
    );
    const seenIds = submitted.map((r) => r.problem_id).filter(Boolean);

    let nextProblem: Problem | null = null;

    if (seenIds.length === 0) {
      // No submissions yet — get the first easy problem
      const rows = await query<Problem>(
        `SELECT * FROM problems WHERE language_id = ?
         ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, id
         LIMIT 1`,
        [languageId],
      );
      nextProblem = rows[0] ?? null;
    } else {
      // Get next unseen problem
      const placeholders = seenIds.map(() => '?').join(',');
      const rows = await query<Problem>(
        `SELECT * FROM problems WHERE language_id = ? AND id NOT IN (${placeholders})
         ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, id
         LIMIT 1`,
        [languageId, ...seenIds],
      );
      nextProblem = rows[0] ?? null;
    }

    return NextResponse.json({ problem: nextProblem });
  } catch (err) {
    console.error('[problem-next]', err);
    return NextResponse.json({ error: 'Failed to fetch problem' }, { status: 500 });
  }
}
