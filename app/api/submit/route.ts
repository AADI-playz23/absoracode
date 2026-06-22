import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query, queryOne, execute } from '@/lib/d1';
import { getSessionUser } from '@/lib/auth';
import { gradeWithGemini } from '@/lib/gemini';
import { calculateMasteryFromCounts } from '@/lib/mastery';
import type { Problem, UserProgress, Submission, CustomLanguageBank, GeneratedQuestion } from '@/lib/types';

// ─── JS test-case grader ──────────────────────────────────────────────────────
function gradeJavaScript(
  userCode: string,
  testCases: Array<{ input: unknown[]; expected: unknown; description?: string }>,
): { is_correct: boolean; feedback: string } {
  try {
    const results: string[] = [];
    let allPassed = true;

    for (const tc of testCases) {
      try {
        // eslint-disable-next-line no-new-func
        const fn   = new Function(`${userCode}; return arguments[0]`);
        // Extract the function name from user code
        const match = userCode.match(/function\s+(\w+)/);
        if (!match) throw new Error('No function found');
        const fnName = match[1];

        // eslint-disable-next-line no-new-func
        const runner = new Function(...Object.keys({}), `${userCode}; return ${fnName}(...arguments)`);
        const inputs = Array.isArray(tc.input) ? tc.input : [tc.input];
        const result = runner(...inputs);
        const passed = JSON.stringify(result) === JSON.stringify(tc.expected);

        if (!passed) {
          allPassed = false;
          results.push(
            `❌ ${tc.description ?? 'Test'}: got ${JSON.stringify(result)}, expected ${JSON.stringify(tc.expected)}`,
          );
        } else {
          results.push(`✅ ${tc.description ?? 'Test'}: passed`);
        }
      } catch (e) {
        allPassed = false;
        results.push(`❌ ${tc.description ?? 'Test'}: runtime error — ${(e as Error).message}`);
      }
    }

    return {
      is_correct: allPassed,
      feedback:   results.join('\n'),
    };
  } catch (e) {
    return {
      is_correct: false,
      feedback:   `Syntax error: ${(e as Error).message}`,
    };
  }
}

// ─── HTML/CSS visual grader (content-based) ──────────────────────────────────
function gradeHtml(
  userCode: string,
  testCases: Array<{ input: unknown; expected: string; description?: string }>,
): { is_correct: boolean; feedback: string } {
  const results: string[] = [];
  let allPassed = true;

  for (const tc of testCases) {
    const expected = tc.expected ?? '';
    if (expected.startsWith('contains:')) {
      const needle = expected.slice('contains:'.length);
      const passed = userCode.toLowerCase().includes(needle.toLowerCase());
      if (!passed) {
        allPassed = false;
        results.push(`❌ ${tc.description ?? 'Test'}: your code should contain "${needle}"`);
      } else {
        results.push(`✅ ${tc.description ?? 'Test'}: passed`);
      }
    } else {
      const passed = userCode.trim() === expected.trim();
      if (!passed) allPassed = false;
      results.push(passed ? `✅ ${tc.description ?? 'Test'}: passed` : `❌ ${tc.description ?? 'Test'}: output mismatch`);
    }
  }

  return { is_correct: allPassed, feedback: results.join('\n') };
}

// POST /api/submit
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      languageId,
      problemId,
      customQuestionRef,
      answer,
      isCustomLanguage = false,
    } = body as {
      languageId: string;
      problemId?: string;
      customQuestionRef?: string;
      answer: string;
      isCustomLanguage?: boolean;
    };

    if (!languageId || !answer) {
      return NextResponse.json({ error: 'languageId and answer are required' }, { status: 400 });
    }

    // ── Fetch the problem ──────────────────────────────────────────────────
    let problem: Problem | null       = null;
    let customQuestion: GeneratedQuestion | null = null;

    if (!isCustomLanguage && problemId) {
      problem = await queryOne<Problem>('SELECT * FROM problems WHERE id = ?', [problemId]);
      if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    } else if (isCustomLanguage && customQuestionRef) {
      // Parse batch index from ref: "batchNumber:questionIndex"
      const [batchNumStr, qIdxStr] = customQuestionRef.split(':');
      const batchNum = parseInt(batchNumStr, 10);
      const qIdx     = parseInt(qIdxStr, 10);

      const bank = await queryOne<CustomLanguageBank>(
        'SELECT * FROM custom_language_banks WHERE language_id = ? AND batch_number = ?',
        [languageId, batchNum],
      );
      if (!bank) return NextResponse.json({ error: 'Question bank not found' }, { status: 404 });
      const questions: GeneratedQuestion[] = JSON.parse(bank.questions);
      customQuestion = questions[qIdx] ?? null;
      if (!customQuestion) return NextResponse.json({ error: 'Question not found in batch' }, { status: 404 });
    } else {
      return NextResponse.json({ error: 'problemId or customQuestionRef required' }, { status: 400 });
    }

    // ── Grade ──────────────────────────────────────────────────────────────
    let gradeResult: { is_correct: boolean; feedback: string };
    let gradedBy: Submission['graded_by'];

    if (isCustomLanguage && customQuestion) {
      // Custom language: always use Gemini
      gradeResult = await gradeWithGemini(customQuestion, answer);
      gradedBy    = 'gemini';
    } else if (problem!.type === 'mcq') {
      const correct   = problem!.correct_answer ?? '';
      const isCorrect = answer.trim() === correct.trim();
      gradeResult = {
        is_correct: isCorrect,
        feedback:   isCorrect
          ? '✅ Correct! Well done.'
          : `❌ Incorrect. The correct answer is: ${correct}`,
      };
      gradedBy = 'mcq_exact';
    } else {
      // Code problem for built-in language
      const testCases = problem!.test_cases ? JSON.parse(problem!.test_cases) : [];

      if (problem!.language_id === 'lang-javascript') {
        gradeResult = gradeJavaScript(answer, testCases);
        gradedBy    = 'test_case';
      } else if (problem!.language_id === 'lang-html-css') {
        gradeResult = gradeHtml(answer, testCases);
        gradedBy    = 'test_case';
      } else {
        // Python and others: use Gemini
        gradeResult = await gradeWithGemini(
          { prompt: problem!.prompt, test_cases: testCases },
          answer,
        );
        gradedBy = 'gemini';
      }
    }

    // ── Record submission ──────────────────────────────────────────────────
    const submissionId = uuid();
    await execute(
      `INSERT INTO submissions (id, user_id, problem_id, language_id, custom_question_ref, code, is_correct, graded_by, feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        submissionId,
        user.id,
        problemId ?? null,
        languageId,
        customQuestionRef ?? null,
        answer,
        gradeResult.is_correct ? 1 : 0,
        gradedBy,
        gradeResult.feedback,
      ],
    );

    // ── Upsert user_progress ───────────────────────────────────────────────
    const progress = await queryOne<UserProgress>(
      'SELECT * FROM user_progress WHERE user_id = ? AND language_id = ?',
      [user.id, languageId],
    );

    const newAttempted = (progress?.attempted_count ?? 0) + 1;
    const newSolved    = (progress?.solved_count    ?? 0) + (gradeResult.is_correct ? 1 : 0);
    const newMastery   = calculateMasteryFromCounts(newSolved, newAttempted);

    if (!progress) {
      await execute(
        `INSERT INTO user_progress (id, user_id, language_id, solved_count, attempted_count, mastery_score, custom_batch_position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), user.id, languageId, newSolved, newAttempted, newMastery, 0],
      );
    } else {
      await execute(
        `UPDATE user_progress
         SET solved_count = ?, attempted_count = ?, mastery_score = ?, last_active = datetime('now')
         WHERE user_id = ? AND language_id = ?`,
        [newSolved, newAttempted, newMastery, user.id, languageId],
      );
    }

    // ── Determine next question ────────────────────────────────────────────
    let nextQuestion: unknown = null;

    if (!isCustomLanguage && problemId) {
      // Built-in: fetch next unseen problem ordered by difficulty
      const solvedIds = await query<{ problem_id: string }>(
        'SELECT DISTINCT problem_id FROM submissions WHERE user_id = ? AND language_id = ? AND problem_id IS NOT NULL',
        [user.id, languageId],
      );
      const seenIds  = solvedIds.map((r) => r.problem_id);
      const excluded = seenIds.length > 0 ? seenIds.map(() => '?').join(',') : "''";;
      const params   = seenIds.length > 0
        ? [languageId, ...seenIds]
        : [languageId, ''];
      const nextProblems = await query<Problem>(
        `SELECT * FROM problems WHERE language_id = ? AND id NOT IN (${excluded})
         ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END LIMIT 1`,
        params,
      );
      nextQuestion = nextProblems[0] ?? null;
    } else if (isCustomLanguage) {
      // Custom: advance position
      const currentProgress = await queryOne<UserProgress>(
        'SELECT * FROM user_progress WHERE user_id = ? AND language_id = ?',
        [user.id, languageId],
      );
      const currentPos  = (currentProgress?.custom_batch_position ?? 0) + 1;
      const batchSize   = 10;
      const batchNum    = Math.floor(currentPos / batchSize) + 1;
      const posInBatch  = currentPos % batchSize;

      await execute(
        'UPDATE user_progress SET custom_batch_position = ? WHERE user_id = ? AND language_id = ?',
        [currentPos, user.id, languageId],
      );

      // Fire-and-forget: pre-generate next batch when within 2 of batch end
      if (posInBatch >= batchSize - 2) {
        const nextBatch = batchNum + 1;
        fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/generate-batch`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
          body:    JSON.stringify({ languageId, batchNumber: nextBatch }),
        }).catch(() => { /* fire and forget */ });
      }

      const bank = await queryOne<CustomLanguageBank>(
        'SELECT * FROM custom_language_banks WHERE language_id = ? AND batch_number = ?',
        [languageId, batchNum],
      );

      if (bank) {
        const questions: GeneratedQuestion[] = JSON.parse(bank.questions);
        const q = questions[posInBatch];
        if (q) {
          nextQuestion = {
            ...q,
            customQuestionRef: `${batchNum}:${posInBatch}`,
            isCustomLanguage:  true,
          };
        }
      }
    }

    return NextResponse.json({
      result: {
        is_correct: gradeResult.is_correct,
        feedback:   gradeResult.feedback,
      },
      next_question: nextQuestion,
    });
  } catch (err) {
    console.error('[submit]', err);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
