import { Result, Ok, Err } from '../../../shared/utils/result-type.js';
import { IDataRepository, IValidationService } from '../../../shared/interfaces/services.js';
import {
  loadData as baseLoadData,
  saveData as baseSaveData,
  backupData as baseBackupData,
  restoreFromLocalBackup as baseRestoreFromBackup
} from '../persistence/data-storage-refactored.js';

/**
 * Data Repository Implementation with Dependency Injection
 * Wraps the data storage functionality in a service interface
 */
export class DataRepository implements IDataRepository {
  readonly name = 'DataRepository';
  readonly version = '1.0.0';

  constructor(private validationService?: IValidationService) {}

  /**
   * Load all data from storage
   */
  async loadData(): Promise<{
    cards: any[];
    sessionHistory: any[];
    learningStreak: any;
    achievements: any[];
  }> {
    const result = baseLoadData();

    if (!result.success) {
      throw new Error(`Failed to load data: ${result.error.message}`);
    }

    const data = result.data;

    // Validate loaded data if validation service is available
    if (this.validationService) {
      this.validateLoadedData(data);
    }

    return data;
  }

  /**
   * Save all data to storage
   */
  async saveData(data: {
    cards: any[];
    sessionHistory: any[];
    learningStreak: any;
    achievements: any[];
  }): Promise<void> {
    // Validate data before saving if validation service is available
    if (this.validationService) {
      this.validateDataForSaving(data);
    }

    const result = baseSaveData(data);

    if (!result.success) {
      throw new Error(`Failed to save data: ${result.error.message}`);
    }
  }

  /**
   * Create a backup of the current data
   */
  async backupData(backupPath?: string): Promise<string> {
    const result = baseBackupData(backupPath);

    if (!result.success) {
      throw new Error(`Failed to create backup: ${result.error.message}`);
    }

    return result.data;
  }

  /**
   * Restore data from a backup file
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    const result = baseRestoreFromBackup(backupPath);

    if (!result.success) {
      throw new Error(`Failed to restore backup: ${result.error.message}`);
    }

    // Validate restored data if validation service is available
    if (this.validationService) {
      const data = await this.loadData();
      this.validateLoadedData(data);
    }
  }

  /**
   * Validate loaded data integrity
   */
  private validateLoadedData(data: {
    cards: any[];
    sessionHistory: any[];
    learningStreak: any;
    achievements: any[];
  }): void {
    // Validate cards array
    if (!Array.isArray(data.cards)) {
      throw new Error('Invalid data: cards must be an array');
    }

    // Validate individual cards
    for (let i = 0; i < data.cards.length; i++) {
      const card = data.cards[i];
      const validation = this.validationService!.validateFlashcard(card);
      if (!validation.isValid) {
        throw new Error(`Invalid card at index ${i}: ${validation.errors.join(', ')}`);
      }
    }

    // Validate session history array
    if (!Array.isArray(data.sessionHistory)) {
      throw new Error('Invalid data: sessionHistory must be an array');
    }

    // Validate individual sessions
    for (let i = 0; i < data.sessionHistory.length; i++) {
      const session = data.sessionHistory[i];
      const validation = this.validationService!.validateStudySessionRecord(session);
      if (!validation.isValid) {
        throw new Error(`Invalid session at index ${i}: ${validation.errors.join(', ')}`);
      }
    }

    // Validate learning streak
    const streakValidation = this.validationService!.validateLearningStreak(data.learningStreak);
    if (!streakValidation.isValid) {
      throw new Error(`Invalid learning streak: ${streakValidation.errors.join(', ')}`);
    }

    // Validate achievements array
    if (!Array.isArray(data.achievements)) {
      throw new Error('Invalid data: achievements must be an array');
    }

    // Validate individual achievements
    for (let i = 0; i < data.achievements.length; i++) {
      const achievement = data.achievements[i];
      const validation = this.validationService!.validateAchievement(achievement);
      if (!validation.isValid) {
        throw new Error(`Invalid achievement at index ${i}: ${validation.errors.join(', ')}`);
      }
    }
  }

  /**
   * Validate data before saving
   */
  private validateDataForSaving(data: {
    cards: any[];
    sessionHistory: any[];
    learningStreak: any;
    achievements: any[];
  }): void {
    // Use the same validation as loaded data
    this.validateLoadedData(data);
  }
}
