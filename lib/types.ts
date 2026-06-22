// lib/types.ts
// TypeScript interfaces matching the D1 schema exactly (snake_case, nullable as | null)

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Language {
  id: string;
  name: string;
  is_builtin: number; // 0 or 1
  created_at: string;
}

export interface Problem {
  id: string;
  language_id: string;
  type: 'mcq' | 'code';
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  starter_code: string | null;
  options: string | null;      // JSON string: string[]
  correct_answer: string | null;
  test_cases: string | null;   // JSON string: TestCase[]
  has_visual_preview: number;  // 0 or 1
  created_at: string;
}

export interface TestCase {
  input: unknown;
  expected: unknown;
  description?: string;
}

export interface CustomLanguageBank {
  id: string;
  language_id: string;
  batch_number: number;
  questions: string; // JSON string: GeneratedQuestion[]
  generated_at: string;
}

export interface GeneratedQuestion {
  type: 'mcq' | 'code';
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  starter_code: string | null;
  options: string[] | null;
  correct_answer: string | null;
  test_cases: TestCase[] | null;
}

export interface UserProgress {
  id: string;
  user_id: string;
  language_id: string;
  solved_count: number;
  attempted_count: number;
  mastery_score: number;
  custom_batch_position: number;
  last_active: string;
}

export interface Submission {
  id: string;
  user_id: string;
  problem_id: string | null;
  language_id: string;
  custom_question_ref: string | null;
  code: string | null;
  is_correct: number; // 0 or 1
  graded_by: 'test_case' | 'gemini' | 'mcq_exact';
  feedback: string | null;
  created_at: string;
}

export interface GradeResult {
  is_correct: boolean;
  feedback: string;
}
