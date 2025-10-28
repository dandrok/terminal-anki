import { Result, Ok, Err } from '../utils/result-type.js';
import fs from 'fs';
import path from 'path';

/**
 * Pure functions for file system operations
 * Separated from business logic for better testability
 */

/**
 * Check if a file exists
 */
export const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

/**
 * Read file content as string
 */
export const readFileContent = (filePath: string): Result<string, Error> => {
  try {
    if (!fileExists(filePath)) {
      return Err(new Error(`File not found: ${filePath}`));
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return Ok(content);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(`Failed to read file: ${filePath}`));
  }
};

/**
 * Write content to file
 */
export const writeFileContent = (filePath: string, content: string): Result<void, Error> => {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fileExists(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(`Failed to write file: ${filePath}`));
  }
};

/**
 * Copy file from source to destination
 */
export const copyFile = (sourcePath: string, destPath: string): Result<void, Error> => {
  try {
    if (!fileExists(sourcePath)) {
      return Err(new Error(`Source file not found: ${sourcePath}`));
    }

    fs.copyFileSync(sourcePath, destPath);
    return Ok(undefined);
  } catch (error) {
    return Err(
      error instanceof Error
        ? error
        : new Error(`Failed to copy file from ${sourcePath} to ${destPath}`)
    );
  }
};

/**
 * Delete file
 */
export const deleteFile = (filePath: string): Result<void, Error> => {
  try {
    if (!fileExists(filePath)) {
      return Err(new Error(`File not found: ${filePath}`));
    }

    fs.unlinkSync(filePath);
    return Ok(undefined);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(`Failed to delete file: ${filePath}`));
  }
};

/**
 * Get file statistics
 */
export const getFileStats = (filePath: string): Result<{ size: number; mtime: Date }, Error> => {
  try {
    if (!fileExists(filePath)) {
      return Err(new Error(`File not found: ${filePath}`));
    }

    const stats = fs.statSync(filePath);
    return Ok({
      size: stats.size,
      mtime: stats.mtime
    });
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(`Failed to get file stats: ${filePath}`));
  }
};

/**
 * Create directory if it doesn't exist
 */
export const ensureDirectory = (dirPath: string): Result<void, Error> => {
  try {
    if (!fileExists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return Ok(undefined);
  } catch (error) {
    return Err(
      error instanceof Error ? error : new Error(`Failed to create directory: ${dirPath}`)
    );
  }
};
