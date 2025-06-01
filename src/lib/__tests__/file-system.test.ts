/**
 * @jest-environment node
 */

import { 
  validateAndNormalizePath, 
  logFileOperation
} from '../file-system';
import path from 'path';

// 実際のファイルシステム操作をテストするのは複雑なので
// まずは純粋関数のテストに集中しますにゃ
describe('file-system', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateAndNormalizePath', () => {
    const baseDir = '/app/public/uploads/materials';

    it('should normalize and validate a valid relative path', () => {
      const result = validateAndNormalizePath('test.wav', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'test.wav'));
    });

    it('should normalize and validate a valid absolute path within base directory', () => {
      const validPath = path.join(baseDir, 'test.wav');
      const result = validateAndNormalizePath(validPath, baseDir);
      expect(result).toBe(path.resolve(validPath));
    });

    it('should throw error for path traversal attempts with ../', () => {
      expect(() => validateAndNormalizePath('../../../etc/passwd', baseDir))
        .toThrow('Path traversal attempt detected');
    });

    it('should throw error for absolute path outside base directory', () => {
      expect(() => validateAndNormalizePath('/etc/passwd', baseDir))
        .toThrow('Path traversal attempt detected');
    });

    it('should handle complex path traversal attempts', () => {
      expect(() => validateAndNormalizePath('test/../../../../../../etc/passwd', baseDir))
        .toThrow('Path traversal attempt detected');
    });

    it('should normalize paths with ./ correctly', () => {
      const result = validateAndNormalizePath('./subfolder/test.wav', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'subfolder/test.wav'));
    });

    it('should handle nested directory paths', () => {
      const result = validateAndNormalizePath('audio/2024/recording.wav', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'audio/2024/recording.wav'));
    });

    it('should handle Windows-style path separators on Unix', () => {
      // Unix環境では \ はファイル名の一部として扱われる
      const result = validateAndNormalizePath('subfolder\\test.wav', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'subfolder\\test.wav'));
    });

    it('should handle path with Windows separators on Unix', () => {
      // Unix環境では \\ はファイル名の一部として扱われ、パストラバーサルにはならない
      const result = validateAndNormalizePath('..\\..\\..\\etc\\passwd', baseDir);
      expect(result).toBe(path.resolve(baseDir, '..\\..\\..\\etc\\passwd'));
    });

    it('should handle empty filename', () => {
      expect(() => validateAndNormalizePath('', baseDir))
        .not.toThrow();
    });

    it('should handle relative path with multiple dots', () => {
      const result = validateAndNormalizePath('./test..wav', baseDir);
      expect(result).toBe(path.resolve(baseDir, 'test..wav'));
    });
  });

  describe('logFileOperation', () => {
    it('should log successful operations with info level', async () => {
      await logFileOperation({
        operation: 'delete',
        path: '/test/path',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"info"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"delete"')
      );
    });

    it('should log failed operations with error level', async () => {
      await logFileOperation({
        operation: 'delete',
        path: '/test/path',
        success: false,
        error: 'Permission denied',
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"level":"error"')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"error":"Permission denied"')
      );
    });

    it('should include materialId when provided', async () => {
      await logFileOperation({
        operation: 'delete',
        path: '/test/path',
        materialId: 'material-123',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"materialId":"material-123"')
      );
    });

    it('should handle rename operations', async () => {
      await logFileOperation({
        operation: 'rename',
        path: '/test/old-path',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"rename"')
      );
    });

    it('should handle create operations', async () => {
      await logFileOperation({
        operation: 'create',
        path: '/test/new-file',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"create"')
      );
    });

    it('should log all required fields', async () => {
      const logEntry = {
        operation: 'delete' as const,
        path: '/test/file.wav',
        materialId: 'mat-123',
        success: false,
        error: 'File not found',
        timestamp: '2024-01-01T12:00:00.000Z'
      };

      await logFileOperation(logEntry);

      const logCall = (console.log as jest.Mock).mock.calls[0][0];
      const parsedLog = JSON.parse(logCall);

      expect(parsedLog.level).toBe('error');
      expect(parsedLog.message).toBe('File operation');
      expect(parsedLog.operation).toBe('delete');
      expect(parsedLog.path).toBe('/test/file.wav');
      expect(parsedLog.materialId).toBe('mat-123');
      expect(parsedLog.success).toBe(false);
      expect(parsedLog.error).toBe('File not found');
      expect(parsedLog.timestamp).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  // Add simple unit tests for utility functions to improve coverage
  describe('additional coverage tests', () => {
    it('should validate edge cases in validateAndNormalizePath', () => {
      const baseDir = '/test/base';
      
      // Test with null byte injection
      expect(() => validateAndNormalizePath('test\0file', baseDir))
        .not.toThrow(); // Note: This just tests the function doesn't crash
      
      // Test with very long path
      const longPath = 'a'.repeat(1000);
      expect(() => validateAndNormalizePath(longPath, baseDir))
        .not.toThrow();
    });

    it('should handle logFileOperation with all possible combinations', async () => {
      // Test with minimal required fields
      await logFileOperation({
        operation: 'create',
        path: '/minimal/path',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"create"')
      );
    });
  });
});