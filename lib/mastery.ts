// lib/mastery.ts
// Calculates a weighted mastery score for a user's submissions in a language.
//
// Formula: sum(difficulty_weight * is_correct) / total_attempted
// Weights: easy = 1, medium = 2, hard = 3
// Result is clamped to [0, 1] — multiply by 100 for percentage display.

import type { Submission } from './types';

const DIFFICULTY_WEIGHTS: Record<string, number> = {
  easy:   1,
  medium: 2,
  hard:   3,
};

/**
 * Calculate mastery score from an array of submissions.
 * Each submission must have `is_correct` (0|1).
 * Difficulty is looked up from the problems table externally; if not provided,
 * defaults to weight=1 (treated as easy).
 */
export function calculateMastery(
  submissions: Array<Submission & { difficulty?: string }>,
): number {
  if (submissions.length === 0) return 0;

  const total = submissions.length;
  const weightedSum = submissions.reduce((acc, sub) => {
    const weight = DIFFICULTY_WEIGHTS[sub.difficulty ?? 'easy'] ?? 1;
    return acc + weight * (sub.is_correct ? 1 : 0);
  }, 0);

  const maxPossible = submissions.reduce((acc, sub) => {
    const weight = DIFFICULTY_WEIGHTS[sub.difficulty ?? 'easy'] ?? 1;
    return acc + weight;
  }, 0);

  if (maxPossible === 0) return 0;
  return Math.min(1, weightedSum / maxPossible);
}

/**
 * Simpler recalculation when difficulty breakdown isn't available —
 * uses the raw solved_count / attempted_count ratio.
 */
export function calculateMasteryFromCounts(
  solvedCount: number,
  attemptedCount: number,
): number {
  if (attemptedCount === 0) return 0;
  return Math.min(1, solvedCount / attemptedCount);
}
