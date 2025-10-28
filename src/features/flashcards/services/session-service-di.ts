import {
  ISessionService,
  IFlashcardService,
  ReviewQuality
} from '../../../shared/interfaces/services.js';
import { StudySessionRecord } from '../domain';

/**
 * Session Service Implementation with Dependency Injection
 */
export class SessionService implements ISessionService {
  readonly name = 'SessionService';
  readonly version = '1.0.0';

  private sessions: Map<string, StudySessionRecord> = new Map();
  private currentSession: StudySessionRecord | null = null;

  constructor(private flashcardService: IFlashcardService) {}

  /**
   * Create a new study session
   */
  createSession(type: 'due' | 'custom' | 'new' | 'review'): {
    id: string;
    startTime: Date;
    sessionType: string;
    cardsStudied: number;
    correctAnswers: number;
    incorrectAnswers: number;
    averageDifficulty: number;
    duration: number;
  } {
    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: StudySessionRecord = {
      id: sessionId,
      startTime: now,
      sessionType: type,
      cardsStudied: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      averageDifficulty: 0,
      duration: 0,
      quitEarly: false
    };

    this.sessions.set(sessionId, session);
    this.currentSession = session;

    return {
      id: sessionId,
      startTime: now,
      sessionType: type,
      cardsStudied: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      averageDifficulty: 0,
      duration: 0
    };
  }

  /**
   * End a study session
   */
  endSession(
    sessionId: string,
    results: {
      totalCards: number;
      correctAnswers: number;
      averageDifficulty: number;
    }
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - session.startTime.getTime();

    // Update session with final results
    session.cardsStudied = results.totalCards;
    session.correctAnswers = results.correctAnswers;
    session.incorrectAnswers = results.totalCards - results.correctAnswers;
    session.averageDifficulty = results.averageDifficulty;
    session.endTime = endTime;
    session.duration = duration;

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }

  /**
   * Get the current active session
   */
  getCurrentSession(): StudySessionRecord | null {
    return this.currentSession;
  }

  /**
   * Record a card review in the session
   */
  recordCardReview(sessionId: string, cardId: string, quality: ReviewQuality): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update session statistics
    session.cardsStudied++;

    if (quality >= 3) {
      session.correctAnswers++;
    } else {
      session.incorrectAnswers++;
    }

    // Update average difficulty (0-4 scale)
    const qualityScore = quality;
    const totalReviews = session.cardsStudied;
    session.averageDifficulty =
      (session.averageDifficulty * (totalReviews - 1) + qualityScore) / totalReviews;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): StudySessionRecord[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSessionById(sessionId: string): StudySessionRecord | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearSessions(): void {
    this.sessions.clear();
    this.currentSession = null;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
