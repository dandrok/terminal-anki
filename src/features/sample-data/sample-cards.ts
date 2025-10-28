import { Flashcard } from '../../shared/types/flashcard.types.js';
import { createCardId, createTagName } from '../../shared/types/flashcard.types.js';

/**
 * Sample flashcard data for new users
 * Provides a diverse set of educational cards across different topics
 */

export const SAMPLE_FLASHCARDS: Omit<Flashcard, 'id' | 'createdAt'>[] = [
  {
    front: 'Python',
    back: 'A high-level, interpreted programming language known for its readability and versatility',
    tags: ['programming', 'python', 'basics'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null
  },
  {
    front: 'Algorithm',
    back: 'A step-by-step procedure or formula for solving a problem or completing a task',
    tags: ['computer-science', 'algorithms', 'programming'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null
  },
  {
    front: 'Database',
    back: 'An organized collection of structured information, typically stored electronically in a computer system',
    tags: ['database', 'storage', 'computer-science'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null
  },
  {
    front: 'API (Application Programming Interface)',
    back: 'A set of protocols, routines, and tools for building software applications that specify how software components should interact',
    tags: ['programming', 'web', 'development'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null
  },
  {
    front: 'Git',
    back: 'A distributed version control system for tracking changes in source code during software development',
    tags: ['tools', 'version-control', 'development'],
    easiness: 2.5,
    interval: 1,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null
  }
];

/**
 * Create sample flashcards with proper IDs and creation timestamps
 */
export const createSampleFlashcards = (): Flashcard[] => {
  const now = new Date();

  return SAMPLE_FLASHCARDS.map((card, index) => ({
    ...card,
    id: createCardId(`sample-${index + 1}`),
    createdAt: new Date(now.getTime() - index * 1000), // Slightly different creation times
    tags: card.tags.map(tag => createTagName(tag))
  }));
};

/**
 * Get flashcards by specific category/topic
 */
export const getSampleCardsByCategory = (category: string): Flashcard[] => {
  const allCards = createSampleFlashcards();
  return allCards.filter(card =>
    card.tags.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
  );
};

/**
 * Get a random subset of sample cards
 */
export const getRandomSampleCards = (count: number): Flashcard[] => {
  const allCards = createSampleFlashcards();
  const shuffled = [...allCards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, allCards.length));
};

/**
 * Get sample cards for specific difficulty levels
 */
export const getSampleCardsByDifficulty = (
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): Flashcard[] => {
  const allCards = createSampleFlashcards();

  // Define which sample cards are suitable for each difficulty level
  const beginnerCards = ['Python', 'Algorithm'];
  const intermediateCards = ['Database', 'API (Application Programming Interface)'];
  const advancedCards = ['Git'];

  let selectedCardTitles: string[] = [];

  switch (difficulty) {
    case 'beginner':
      selectedCardTitles = beginnerCards;
      break;
    case 'intermediate':
      selectedCardTitles = intermediateCards;
      break;
    case 'advanced':
      selectedCardTitles = advancedCards;
      break;
  }

  return allCards.filter(card => selectedCardTitles.includes(card.front));
};

/**
 * Categories available in sample data
 */
export const SAMPLE_CATEGORIES = [
  'programming',
  'computer-science',
  'database',
  'web',
  'tools',
  'version-control',
  'development'
] as const;

/**
 * Statistics about sample data
 */
export const getSampleDataStats = () => {
  const cards = createSampleFlashcards();
  const tagCounts: Record<string, number> = {};

  cards.forEach(card => {
    card.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return {
    totalCards: cards.length,
    uniqueTags: Object.keys(tagCounts).length,
    tagDistribution: tagCounts,
    categories: SAMPLE_CATEGORIES,
    averageFrontLength: cards.reduce((sum, card) => sum + card.front.length, 0) / cards.length,
    averageBackLength: cards.reduce((sum, card) => sum + card.back.length, 0) / cards.length
  };
};

/**
 * Validate sample data integrity
 */
export const validateSampleData = (): boolean => {
  try {
    const cards = createSampleFlashcards();

    // Check that we have the expected number of cards
    if (cards.length !== SAMPLE_FLASHCARDS.length) {
      return false;
    }

    // Check that all cards have required fields
    for (const card of cards) {
      if (!card.id || !card.front || !card.back || !Array.isArray(card.tags)) {
        return false;
      }

      if (!(card.nextReview instanceof Date) || card.nextReview.toString() === 'Invalid Date') {
        return false;
      }

      if (typeof card.easiness !== 'number' || card.easiness < 1.3 || card.easiness > 3.0) {
        return false;
      }

      if (typeof card.interval !== 'number' || card.interval < 0) {
        return false;
      }

      if (typeof card.repetitions !== 'number' || card.repetitions < 0) {
        return false;
      }
    }

    // Check for duplicate IDs
    const ids = cards.map(card => card.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Create sample data for testing purposes
 */
export const createTestCards = (count: number): Flashcard[] => {
  const cards: Flashcard[] = [];
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    cards.push({
      id: createCardId(`test-card-${i}`),
      front: `Test Question ${i}`,
      back: `Test Answer ${i}`,
      tags: [`test-tag-${(i % 3) + 1}`, 'test'],
      easiness: 2.5 + (Math.random() - 0.5), // Random easiness between 2.0 and 3.0
      interval: Math.floor(Math.random() * 30) + 1, // Random interval 1-30
      repetitions: Math.floor(Math.random() * 10), // Random repetitions 0-9
      nextReview: new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random next review within 7 days
      lastReview:
        Math.random() > 0.3
          ? new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          : null, // 70% chance of having a last review
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random creation within 30 days ago
    });
  }

  return cards;
};

/**
 * Export sample data in different formats
 */
export const exportSampleDataAsJSON = (): string => {
  const cards = createSampleFlashcards();
  return JSON.stringify(cards, null, 2);
};

export const exportSampleDataAsCSV = (): string => {
  const cards = createSampleFlashcards();
  const headers = [
    'ID',
    'Front',
    'Back',
    'Tags',
    'Easiness',
    'Interval',
    'Repetitions',
    'Next Review',
    'Last Review',
    'Created At'
  ];
  const rows = cards.map(card => [
    card.id,
    `"${card.front.replace(/"/g, '""')}"`, // Escape quotes in CSV
    `"${card.back.replace(/"/g, '""')}"`,
    `"${card.tags.join(', ')}"`,
    card.easiness.toString(),
    card.interval.toString(),
    card.repetitions.toString(),
    card.nextReview.toISOString(),
    card.lastReview?.toISOString() || '',
    card.createdAt.toISOString()
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};
