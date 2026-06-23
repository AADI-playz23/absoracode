import { query, execute } from './d1';
import type { Problem } from './types';

const QUESTIONS_BASE_URL =
  process.env.QUESTIONS_BASE_URL ||
  'https://raw.githubusercontent.com/AADI-playz23/absoracode/main/questions/';

const ID_TO_FILE: Record<string, string> = {
  'lang-html-css':   'html-css.json',
  'lang-javascript': 'javascript.json',
  'lang-python':     'python.json',
  'lang-cpp':        'cpp.json',
  'lang-java':       'java.json',
  'lang-rust':       'rust.json',
  'lang-golang':     'golang.json',
  'lang-jumbolang':  'jumbolang.json',
};

interface RawQuestion {
  id: string;
  type: 'mcq' | 'code';
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  starter_code?: string | null;
  options?: string[] | string | null;
  correct_answer?: string | null;
  test_cases?: unknown;
}

/**
 * Checks if D1 database has questions for a given language.
 * If not, fetches the JSON file from the GitHub repository and bulk-seeds the problems.
 */
export async function ensureQuestionsSeeded(languageId: string): Promise<void> {
  const file = ID_TO_FILE[languageId];
  if (!file) return; // Not a pre-made track

  // Check count of problems for this language
  const countRes = await query<{ count: number }>(
    'SELECT COUNT(*) as count FROM problems WHERE language_id = ?',
    [languageId]
  );
  if (countRes[0] && countRes[0].count > 0) {
    return; // Already seeded
  }

  console.log(`[seeding] Fetching questions for ${languageId} from ${file}...`);
  const url = `${QUESTIONS_BASE_URL}${file}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    }

    const data: RawQuestion[] = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(`Invalid JSON format: expected array, got ${typeof data}`);
    }

    console.log(`[seeding] Found ${data.length} questions. Seeding into D1...`);

    // Insert questions sequentially to prevent overloading Cloudflare D1 HTTP endpoint
    for (const q of data) {
      const id = q.id || `${languageId}-${Math.random().toString(36).substr(2, 9)}`;
      const optionsStr = q.options ? (typeof q.options === 'string' ? q.options : JSON.stringify(q.options)) : null;
      const testCasesStr = q.test_cases ? (typeof q.test_cases === 'string' ? q.test_cases : JSON.stringify(q.test_cases)) : null;

      await execute(
        `INSERT OR IGNORE INTO problems (
          id, language_id, type, difficulty, prompt, starter_code, options, correct_answer, test_cases, has_visual_preview
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          id,
          languageId,
          q.type,
          q.difficulty,
          q.prompt,
          q.starter_code ?? null,
          optionsStr,
          q.correct_answer ?? null,
          testCasesStr,
        ]
      );
    }

    console.log(`[seeding] Successfully seeded ${data.length} questions for ${languageId}`);
  } catch (error) {
    console.error(`[seeding error] Failed to seed questions for ${languageId}:`, error);
    throw error;
  }
}
