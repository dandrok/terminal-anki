import { ValidatedDataStore } from '../schemas/session.schema.js';

/**
 * Pure functions for data integrity validation
 * Separated from JSON parsing for better separation of concerns
 */

/**
 * Data integrity issues
 */
export interface DataIntegrityIssue {
  type: 'missing_field' | 'invalid_type' | 'invalid_value' | 'duplicate_id';
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Data integrity validation result
 */
export interface DataIntegrityResult {
  isValid: boolean;
  issues: DataIntegrityIssue[];
  warnings: DataIntegrityIssue[];
  errors: DataIntegrityIssue[];
}

/**
 * Validate flashcard data integrity
 */
export const validateFlashcardIntegrity = (card: any): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = [];

  // Check required fields
  if (!card.id || typeof card.id !== 'string') {
    issues.push({
      type: 'missing_field',
      field: 'id',
      message: 'Missing or invalid card ID',
      severity: 'error'
    });
  }

  if (!card.front || typeof card.front !== 'string') {
    issues.push({
      type: 'missing_field',
      field: 'front',
      message: 'Missing or invalid front text',
      severity: 'error'
    });
  }

  if (!card.back || typeof card.back !== 'string') {
    issues.push({
      type: 'missing_field',
      field: 'back',
      message: 'Missing or invalid back text',
      severity: 'error'
    });
  }

  // Check numeric fields
  if (typeof card.easiness !== 'number' || card.easiness < 1.3 || card.easiness > 3.0) {
    issues.push({
      type: 'invalid_value',
      field: 'easiness',
      message: 'Easiness factor out of valid range (1.3-3.0)',
      severity: 'warning'
    });
  }

  if (typeof card.interval !== 'number' || card.interval < 1) {
    issues.push({
      type: 'invalid_value',
      field: 'interval',
      message: 'Invalid interval value',
      severity: 'warning'
    });
  }

  if (typeof card.repetitions !== 'number' || card.repetitions < 0) {
    issues.push({
      type: 'invalid_value',
      field: 'repetitions',
      message: 'Invalid repetitions count',
      severity: 'warning'
    });
  }

  // Check date fields
  if (!(card.nextReview instanceof Date) || isNaN(card.nextReview.getTime())) {
    issues.push({
      type: 'invalid_type',
      field: 'nextReview',
      message: 'Invalid nextReview date',
      severity: 'error'
    });
  }

  if (card.lastReview && !(card.lastReview instanceof Date)) {
    issues.push({
      type: 'invalid_type',
      field: 'lastReview',
      message: 'Invalid lastReview date',
      severity: 'warning'
    });
  }

  if (!(card.createdAt instanceof Date) || isNaN(card.createdAt.getTime())) {
    issues.push({
      type: 'invalid_type',
      field: 'createdAt',
      message: 'Invalid createdAt date',
      severity: 'error'
    });
  }

  // Check tags array
  if (!Array.isArray(card.tags)) {
    issues.push({
      type: 'invalid_type',
      field: 'tags',
      message: 'Tags must be an array',
      severity: 'warning'
    });
  }

  return issues;
};

/**
 * Validate session history integrity
 */
export const validateSessionIntegrity = (session: any): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = [];

  if (!session.id || typeof session.id !== 'string') {
    issues.push({
      type: 'missing_field',
      field: 'id',
      message: 'Missing or invalid session ID',
      severity: 'error'
    });
  }

  if (!(session.startTime instanceof Date) || isNaN(session.startTime.getTime())) {
    issues.push({
      type: 'invalid_type',
      field: 'startTime',
      message: 'Invalid startTime date',
      severity: 'error'
    });
  }

  if (session.endTime && !(session.endTime instanceof Date)) {
    issues.push({
      type: 'invalid_type',
      field: 'endTime',
      message: 'Invalid endTime date',
      severity: 'warning'
    });
  }

  if (typeof session.cardsStudied !== 'number' || session.cardsStudied < 0) {
    issues.push({
      type: 'invalid_value',
      field: 'cardsStudied',
      message: 'Invalid cardsStudied count',
      severity: 'warning'
    });
  }

  return issues;
};

/**
 * Validate learning streak integrity
 */
export const validateStreakIntegrity = (streak: any): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = [];

  if (typeof streak.currentStreak !== 'number' || streak.currentStreak < 0) {
    issues.push({
      type: 'invalid_value',
      field: 'currentStreak',
      message: 'Invalid current streak value',
      severity: 'warning'
    });
  }

  if (typeof streak.longestStreak !== 'number' || streak.longestStreak < 0) {
    issues.push({
      type: 'invalid_value',
      field: 'longestStreak',
      message: 'Invalid longest streak value',
      severity: 'warning'
    });
  }

  if (streak.lastStudyDate && !(streak.lastStudyDate instanceof Date)) {
    issues.push({
      type: 'invalid_type',
      field: 'lastStudyDate',
      message: 'Invalid lastStudyDate',
      severity: 'warning'
    });
  }

  if (!Array.isArray(streak.studyDates)) {
    issues.push({
      type: 'invalid_type',
      field: 'studyDates',
      message: 'Study dates must be an array',
      severity: 'warning'
    });
  }

  return issues;
};

/**
 * Check for duplicate card IDs
 */
export const findDuplicateCardIds = (cards: any[]): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = [];
  const cardIds = cards.map(card => card.id).filter(Boolean);
  const duplicateIds = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);

  duplicateIds.forEach(id => {
    issues.push({
      type: 'duplicate_id',
      field: 'id',
      message: `Duplicate card ID: ${id}`,
      severity: 'error'
    });
  });

  return issues;
};

/**
 * Comprehensive data integrity validation
 */
export const validateDataIntegrity = (data: ValidatedDataStore): DataIntegrityResult => {
  const allIssues: DataIntegrityIssue[] = [];

  // Validate each card
  data.cards.forEach((card, index) => {
    const cardIssues = validateFlashcardIntegrity(card);
    cardIssues.forEach(issue => {
      allIssues.push({
        ...issue,
        message: `Card ${index}: ${issue.message}`
      });
    });
  });

  // Validate sessions
  data.sessionHistory.forEach((session, index) => {
    const sessionIssues = validateSessionIntegrity(session);
    sessionIssues.forEach(issue => {
      allIssues.push({
        ...issue,
        message: `Session ${index}: ${issue.message}`
      });
    });
  });

  // Validate streak
  const streakIssues = validateStreakIntegrity(data.learningStreak);
  streakIssues.forEach(issue => {
    allIssues.push({
      ...issue,
      message: `Learning streak: ${issue.message}`
    });
  });

  // Check for duplicate IDs
  const duplicateIssues = findDuplicateCardIds(data.cards);
  allIssues.push(...duplicateIssues);

  // Categorize issues
  const errors = allIssues.filter(issue => issue.severity === 'error');
  const warnings = allIssues.filter(issue => issue.severity === 'warning');

  return {
    isValid: errors.length === 0,
    issues: allIssues,
    warnings,
    errors
  };
};
