/**
 * @jest-environment node
 */

import { 
  logFileOperation,
  validateAndNormalizePath
} from '../file-system';
import path from 'path';

describe('file-system.ts coverage tests', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logFileOperation', () => {
    it('should log successful operations', async () => {
      await logFileOperation({
        operation: 'delete',
        path: '/test/file.txt',
        materialId: 'mat-123',
        success: true,
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"materialId":"mat-123"')
      );
    });

    it('should log failed operations', async () => {
      await logFileOperation({
        operation: 'delete',
        path: '/test/file.txt',
        success: false,
        error: 'Permission denied',
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Permission denied"')
      );
    });

    it('should handle operations without materialId', async () => {
      await logFileOperation({
        operation: 'create',
        path: '/test/new-file.txt',
        success: true,
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"create"')
      );
    });

    it('should handle operations with error but no error message', async () => {
      await logFileOperation({
        operation: 'rename',
        path: '/test/file.txt',
        success: false,
        timestamp: '2025-06-01T00:00:00.000Z'
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"success":false')
      );
    });
  });

  describe('validateAndNormalizePath - additional coverage', () => {
    const baseDir = '/test/base';

    it('should validate and normalize relative paths', () => {
      const result = validateAndNormalizePath('file.txt', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'file.txt'));
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateAndNormalizePath('../../../etc/passwd', baseDir))
        .toThrow('Path traversal attempt detected');
    });

    it('should handle absolute paths within base directory', () => {
      const validPath = path.join(baseDir, 'subdir', 'file.txt');
      const result = validateAndNormalizePath(validPath, baseDir);
      expect(result).toBe(path.resolve(validPath));
    });

    it('should handle relative paths with current directory notation', () => {
      const result = validateAndNormalizePath('./subdir/file.txt', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'subdir/file.txt'));
    });

    it('should reject path traversal with symbolic links', () => {
      expect(() => validateAndNormalizePath('safe/../../../etc/passwd', baseDir))
        .toThrow('Path traversal attempt detected');
    });

    it('should handle empty paths', () => {
      const result = validateAndNormalizePath('', baseDir);
      expect(result).toBe(path.resolve(baseDir));
    });

    it('should handle paths with multiple slashes', () => {
      const result = validateAndNormalizePath('subdir//file.txt', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'subdir/file.txt'));
    });

    it('should handle nested directories', () => {
      const result = validateAndNormalizePath('level1/level2/level3/file.txt', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'level1/level2/level3/file.txt'));
    });

    it('should handle absolute path that starts with base directory', () => {
      const validAbsolutePath = path.join(baseDir, 'valid.txt');
      const result = validateAndNormalizePath(validAbsolutePath, baseDir);
      expect(result).toBe(path.resolve(validAbsolutePath));
    });

    it('should reject absolute path outside base directory', () => {
      expect(() => validateAndNormalizePath('/etc/passwd', baseDir))
        .toThrow('Path traversal attempt detected');
    });

    it('should handle path normalization edge cases', () => {
      const result = validateAndNormalizePath('./test/../valid/file.txt', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'valid/file.txt'));
    });
  });
});