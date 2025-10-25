import { Flashcard, ReviewQuality } from './types';

export class FlashcardManager {
  private cards: Flashcard[] = [];
  private dataFile = 'flashcards.json';

  constructor() {
    this.loadCards();
  }

  private loadCards(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        this.cards = data.map((card: any) => ({
          ...card,
          nextReview: new Date(card.nextReview),
          lastReview: card.lastReview ? new Date(card.lastReview) : null,
          createdAt: new Date(card.createdAt)
        }));
      } else {
        this.createSampleCards();
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      this.createSampleCards();
    }
  }

  private createSampleCards(): void {
    const sampleCards = [
      { front: 'Python', back: 'A high-level programming language' },
      { front: 'Algorithm', back: 'A step-by-step procedure for solving a problem' },
      { front: 'Database', back: 'An organized collection of structured information' },
      { front: 'API', back: 'Application Programming Interface' },
      { front: 'Git', back: 'A distributed version control system' }
    ];

    this.cards = sampleCards.map((card, index) => ({
      id: (index + 1).toString(),
      front: card.front,
      back: card.back,
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      createdAt: new Date()
    }));

    this.saveCards();
  }

  saveCards(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.dataFile, JSON.stringify(this.cards, null, 2));
    } catch (error) {
      console.error('Error saving cards:', error);
    }
  }

  getAllCards(): Flashcard[] {
    return [...this.cards];
  }

  getDueCards(): Flashcard[] {
    const now = new Date();
    return this.cards.filter(card => card.nextReview <= now);
  }

  addCard(front: string, back: string): Flashcard {
    const newCard: Flashcard = {
      id: (this.cards.length + 1).toString(),
      front,
      back,
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: new Date(),
      lastReview: null,
      createdAt: new Date()
    };

    this.cards.push(newCard);
    this.saveCards();
    return newCard;
  }

  deleteCard(id: string): boolean {
    const index = this.cards.findIndex(card => card.id === id);
    if (index !== -1) {
      this.cards.splice(index, 1);
      this.saveCards();
      return true;
    }
    return false;
  }

  searchCards(query: string): Flashcard[] {
    const lowerQuery = query.toLowerCase();
    return this.cards.filter(card =>
      card.front.toLowerCase().includes(lowerQuery) ||
      card.back.toLowerCase().includes(lowerQuery)
    );
  }

  updateSpacedRepetition(card: Flashcard, quality: ReviewQuality): void {
    const now = new Date();
    card.lastReview = now;
    card.repetitions += 1;

    // SM-2 Algorithm implementation
    if (quality >= 3) {
      if (card.repetitions === 1) {
        card.interval = 1;
      } else if (card.repetitions === 2) {
        card.interval = 6;
      } else {
        card.interval = Math.ceil(card.interval * card.easiness);
      }

      card.nextReview = new Date(now.getTime() + card.interval * 24 * 60 * 60 * 1000);
    } else {
      card.repetitions = 0;
      card.interval = 1;
      card.nextReview = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    }

    // Update easiness factor
    card.easiness = Math.max(1.3,
      card.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    this.saveCards();
  }

  getStats() {
    const totalCards = this.cards.length;
    const dueCards = this.getDueCards().length;
    const totalReviews = this.cards.reduce((sum, card) => sum + card.repetitions, 0);
    const averageEasiness = this.cards.reduce((sum, card) => sum + card.easiness, 0) / totalCards;

    const distribution = {
      new: 0,
      learning: 0,
      young: 0,
      mature: 0
    };

    this.cards.forEach(card => {
      if (card.interval <= 1) {
        distribution.new++;
      } else if (card.interval <= 7) {
        distribution.learning++;
      } else if (card.interval <= 30) {
        distribution.young++;
      } else {
        distribution.mature++;
      }
    });

    return {
      totalCards,
      dueCards,
      totalReviews,
      averageEasiness,
      distribution
    };
  }
}