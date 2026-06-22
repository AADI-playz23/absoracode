import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query, execute } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { generateBatch } from '@/lib/gemini';
import type { CustomLanguageBank, Language } from '@/lib/types';

// POST /api/generate-batch
// Body: { languageId: string, batchNumber: number }
// Idempotent: if the batch already exists, returns existing data.
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { languageId, batchNumber } = await request.json();

    if (!languageId || typeof batchNumber !== 'number') {
      return NextResponse.json({ error: 'languageId and batchNumber are required' }, { status: 400 });
    }

    // Check idempotency — if batch already exists, return it
    const existing = await query<CustomLanguageBank>(
      'SELECT * FROM custom_language_banks WHERE language_id = ? AND batch_number = ?',
      [languageId, batchNumber],
    );

    if (existing.length > 0) {
      return NextResponse.json({ bank: existing[0], cached: true });
    }

    // Fetch language name for the prompt
    const langs = await query<Language>('SELECT name FROM languages WHERE id = ?', [languageId]);
    if (langs.length === 0) {
      return NextResponse.json({ error: 'Language not found' }, { status: 404 });
    }

    const questions = await generateBatch(langs[0].name, batchNumber);

    const id = uuid();
    await execute(
      'INSERT INTO custom_language_banks (id, language_id, batch_number, questions) VALUES (?, ?, ?, ?)',
      [id, languageId, batchNumber, JSON.stringify(questions)],
    );

    const bank: CustomLanguageBank = {
      id,
      language_id:  languageId,
      batch_number: batchNumber,
      questions:    JSON.stringify(questions),
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json({ bank, cached: false });
  } catch (err) {
    console.error('[generate-batch]', err);
    return NextResponse.json({ error: 'Failed to generate batch' }, { status: 500 });
  }
}
