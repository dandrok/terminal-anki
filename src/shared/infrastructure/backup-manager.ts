import { Result, Ok, Err } from '../utils/result-type.js';
import { fileExists, copyFile, deleteFile } from './file-operations.js';
import { generateBackupFilename } from './json-operations.js';

/**
 * Pure functions for backup and restore operations
 * Separated from data storage logic for better modularity
 */

/**
 * Create a backup of the specified file
 */
export const createBackup = (
  sourcePath: string,
  customBackupPath?: string
): Result<string, Error> => {
  if (!fileExists(sourcePath)) {
    return Err(new Error('Source file does not exist'));
  }

  const backupPath = customBackupPath || generateBackupFilename(sourcePath);

  const copyResult = copyFile(sourcePath, backupPath);
  if (!copyResult.success) {
    return copyResult;
  }

  return Ok(backupPath);
};

/**
 * Restore data from backup
 */
export const restoreFromBackup = (backupPath: string, targetPath: string): Result<void, Error> => {
  if (!fileExists(backupPath)) {
    return Err(new Error('Backup file does not exist'));
  }

  return copyFile(backupPath, targetPath);
};

/**
 * Delete backup file
 */
export const deleteBackup = (backupPath: string): Result<void, Error> => {
  return deleteFile(backupPath);
};

/**
 * Check if backup exists
 */
export const backupExists = (backupPath: string): boolean => {
  return fileExists(backupPath);
};

/**
 * Generate backup filename with custom timestamp
 */
export const generateCustomBackupPath = (originalPath: string, timestamp?: Date): string => {
  return generateBackupFilename(originalPath, timestamp || new Date());
};

/**
 * List backup files for a given file
 */
export const listBackupFiles = (_originalPath: string): string[] => {
  // This would require file system listing functionality
  // For now, return empty array - can be enhanced later
  return [];
};

/**
 * Find latest backup for a file
 */
export const findLatestBackup = (originalPath: string): Result<string, Error> => {
  const backups = listBackupFiles(originalPath);

  if (backups.length === 0) {
    return Err(new Error('No backup files found'));
  }

  // Sort by timestamp (assuming timestamp is in filename)
  const latestBackup = backups.sort().pop();

  if (!latestBackup) {
    return Err(new Error('Failed to determine latest backup'));
  }

  return Ok(latestBackup);
};
