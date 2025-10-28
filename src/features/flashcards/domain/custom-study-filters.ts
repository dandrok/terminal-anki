export type CardDifficulty = 'new' | 'learning' | 'young' | 'mature';

export interface CustomStudyFilters {
  query?: string;
  tags?: string[];
  difficulty?: CardDifficulty;
  includeDue?: boolean;
  limit?: number;
  randomOrder?: boolean;
}

export interface FlashcardSearchFilters {
  query?: string;
  tags?: string[];
  difficulty?: CardDifficulty; // Added
  includeDue?: boolean; // Added
  minEasiness?: number;
  maxEasiness?: number;
  minInterval?: number;
  maxInterval?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  lastReviewAfter?: Date;
  lastReviewBefore?: Date;
}
