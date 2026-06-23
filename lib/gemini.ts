// lib/gemini.ts
// Gemini API integration — server-side only.
// Used for: (1) generating question batches for custom languages,
//            (2) grading user code for custom-language problems.

import type { GeneratedQuestion, GradeResult } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL          = 'gemini-3.5-flash';
const API_URL        = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     0.7,
        topP:            0.95,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text;
}

function extractJson<T>(text: string): T | null {
  // Try direct parse first
  try { return JSON.parse(text) as T; } catch { /* fall through */ }
  // Try extracting from code fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) as T; } catch { /* fall through */ }
  }
  // Try finding first [...] or {...}
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) as T; } catch { /* fall through */ }
  }
  return null;
}

function validateQuestion(q: unknown): q is GeneratedQuestion {
  if (!q || typeof q !== 'object') return false;
  const obj = q as Record<string, unknown>;
  if (!['mcq', 'code'].includes(obj.type as string)) return false;
  if (!['easy', 'medium', 'hard'].includes(obj.difficulty as string)) return false;
  if (typeof obj.prompt !== 'string' || !obj.prompt.trim()) return false;
  return true;
}

/**
 * Generate a batch of 10 questions for the given language.
 * Validates the response shape; retries once on failure.
 */
export async function generateBatch(
  languageName: string,
  batchNumber: number,
  context?: string,
): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an expert programming tutor creating beginner-friendly exercises.
Generate exactly 10 programming questions for the language: "${languageName}".
This is batch #${batchNumber} — vary difficulty and question types.
${context ? `\nHere is documentation, rules, or syntax context for this custom language:\n"""\n${context}\n"""\nMake sure the generated questions conform to these specifications.\n` : ''}

Return ONLY a valid JSON array with exactly 10 objects. No explanation, no markdown, just the JSON array.

Each object must have exactly these fields:
{
  "type": "mcq" | "code",
  "difficulty": "easy" | "medium" | "hard",
  "prompt": "The question text (clear and beginner-friendly)",
  "starter_code": "starter code string or null",
  "options": ["A", "B", "C", "D"] or null (only for mcq),
  "correct_answer": "exact correct answer string or null",
  "test_cases": [{"input": ..., "expected": ..., "description": "..."}] or null (for code questions)
}

Rules:
- At least 5 must be mcq, at least 3 must be code
- Mix of easy (4), medium (4), hard (2)
- For mcq: options array must have exactly 4 strings, correct_answer must match one option exactly
- For code: starter_code is the function skeleton, test_cases has 2-3 test cases
- Keep questions appropriate for ABSOLUTE BEGINNERS
`.trim();

  async function attempt(): Promise<GeneratedQuestion[] | null> {
    const text = await callGemini(prompt);
    const parsed = extractJson<unknown[]>(text);
    if (!Array.isArray(parsed) || parsed.length < 10) return null;
    const questions = parsed.slice(0, 10);
    if (!questions.every(validateQuestion)) return null;
    return questions as GeneratedQuestion[];
  }

  const first = await attempt();
  if (first) return first;

  // Retry once
  const second = await attempt();
  if (second) return second;

  throw new Error(`Failed to generate valid batch for "${languageName}" after 2 attempts`);
}

/**
 * Grade a user's code submission for a custom-language problem using Gemini.
 */
export async function gradeWithGemini(
  question: { prompt: string; correct_answer?: string | null; test_cases?: unknown },
  userCode: string,
): Promise<GradeResult> {
  const prompt = `
You are a programming tutor grading a beginner's code submission.

Question:
${question.prompt}

${question.correct_answer ? `Expected answer: ${question.correct_answer}\n` : ''}
${question.test_cases ? `Test cases: ${JSON.stringify(question.test_cases)}\n` : ''}

User's submission:
\`\`\`
${userCode}
\`\`\`

Evaluate the submission. Return ONLY a JSON object with exactly these two fields:
{
  "is_correct": true or false,
  "feedback": "Short, encouraging feedback (1-3 sentences). If wrong, give a clear hint."
}
`.trim();

  const text = await callGemini(prompt);
  const parsed = extractJson<{ is_correct: boolean; feedback: string }>(text);

  if (parsed && typeof parsed.is_correct === 'boolean' && typeof parsed.feedback === 'string') {
    return { is_correct: parsed.is_correct, feedback: parsed.feedback };
  }

  // Fallback if parsing fails
  return {
    is_correct: false,
    feedback:   'Could not evaluate your submission automatically. Please try again.',
  };
}
