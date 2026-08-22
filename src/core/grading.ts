import type { ReviewQuality } from '../types/index.js';

export interface GradeBinding {
  /** The key that applies this grade. */
  key: string;
  quality: ReviewQuality;
  label: string;
  /** Semantic palette slot used to colour the option. */
  tone: 'error' | 'warning' | 'success' | 'primary' | 'secondary';
}

/**
 * Anki's grading keys.
 *
 * The quality values deliberately match what v1 wrote to disk. Remapping "Good"
 * from 3 to 4 would silently lengthen every existing user's intervals on
 * upgrade — a scheduling change with no error message and no way to notice.
 *
 * Note that Hard is quality 1, which is *below* PASSING_QUALITY, so it resets
 * the repetition count exactly like Again. That is v1 behaviour, preserved on
 * purpose; changing it is a product decision, not a refactor.
 */
export const GRADE_BINDINGS: readonly GradeBinding[] = [
  { key: '1', quality: 0, label: 'Again', tone: 'error' },
  { key: '2', quality: 1, label: 'Hard', tone: 'warning' },
  { key: '3', quality: 3, label: 'Good', tone: 'success' },
  { key: '4', quality: 4, label: 'Easy', tone: 'primary' },
  { key: '5', quality: 5, label: 'Perfect', tone: 'secondary' }
];

/** Applied when the learner confirms without picking a grade. */
export const DEFAULT_GRADE_KEY = '3';

export function gradeForKey(key: string): GradeBinding | undefined {
  return GRADE_BINDINGS.find(binding => binding.key === key);
}

export const DEFAULT_GRADE: GradeBinding = gradeForKey(DEFAULT_GRADE_KEY) ?? GRADE_BINDINGS[2];
