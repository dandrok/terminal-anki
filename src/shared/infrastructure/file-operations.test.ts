import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import {
  fileExists,
  readFileContent,
  writeFileContent,
  copyFile,
  deleteFile,
  getFileStats,
  ensureDirectory,
} from './file-operations';

describe('file-operations', () => {
  const testDir = path.join(tmpdir(), 'file-ops-test');
  const testFile = path.join(testDir, 'test.txt');
  const testContent = 'Hello, World!';

  beforeEach(async () => {
    // Clean up any existing test directory
    try {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }

    // Create test directory
    await fsPromises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }
  });

  describe('fileExists', () => {
    it('should return true for existing files', () => {
      expect(fileExists(testFile)).toBe(false);

      // Create file
      fs.writeFileSync(testFile, testContent);
      expect(fileExists(testFile)).toBe(true);
    });

    it('should return false for non-existing files', () => {
      expect(fileExists('/non/existent/file.txt')).toBe(false);
    });
  });

  describe('readFileContent', () => {
    it('should read file content successfully', async () => {
      await fsPromises.writeFile(testFile, testContent);

      const result = readFileContent(testFile);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(testContent);
      }
    });

    it('should return error for non-existing file', () => {
      const result = readFileContent('/non/existent/file.txt');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('File not found');
      }
    });
  });

  describe('writeFileContent', () => {
    it('should write file content successfully', () => {
      const result = writeFileContent(testFile, testContent);
      expect(result.success).toBe(true);

      // Verify file was written
      expect(fs.readFileSync(testFile, 'utf-8')).toBe(testContent);
    });

    it('should create directory if it does not exist', () => {
      const nestedFile = path.join(testDir, 'nested', 'deep', 'test.txt');
      const result = writeFileContent(nestedFile, testContent);
      expect(result.success).toBe(true);

      // Verify file was written
      expect(fs.readFileSync(nestedFile, 'utf-8')).toBe(testContent);
    });
  });

  describe('copyFile', () => {
    const destFile = path.join(testDir, 'dest.txt');

    beforeEach(async () => {
      await fs.writeFile(testFile, testContent);
    });

    it('should copy file successfully', () => {
      const result = copyFile(testFile, destFile);
      expect(result.success).toBe(true);

      // Verify file was copied
      expect(fs.readFileSync(destFile, 'utf-8')).toBe(testContent);
    });

    it('should return error for non-existing source file', () => {
      const result = copyFile('/non/existent/file.txt', destFile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Source file not found');
      }
    });
  });

  describe('deleteFile', () => {
    beforeEach(async () => {
      await fs.writeFile(testFile, testContent);
    });

    it('should delete file successfully', () => {
      expect(fileExists(testFile)).toBe(true);

      const result = deleteFile(testFile);
      expect(result.success).toBe(true);
      expect(fileExists(testFile)).toBe(false);
    });

    it('should return error for non-existing file', () => {
      const result = deleteFile('/non/existent/file.txt');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('File not found');
      }
    });
  });

  describe('getFileStats', () => {
    beforeEach(async () => {
      await fs.writeFile(testFile, testContent);
    });

    it('should get file stats successfully', () => {
      const result = getFileStats(testFile);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.size).toBeGreaterThan(0);
        expect(result.data.mtime).toBeInstanceOf(Date);
      }
    });

    it('should return error for non-existing file', () => {
      const result = getFileStats('/non/existent/file.txt');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('File not found');
      }
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', () => {
      const newDir = path.join(testDir, 'new', 'nested');

      const result = ensureDirectory(newDir);
      expect(result.success).toBe(true);

      // Verify directory was created
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should not error if directory already exists', () => {
      const result = ensureDirectory(testDir);
      expect(result.success).toBe(true);
    });
  });
});