/**
 * @jest-environment node
 */

import { 
  validateAndNormalizePath, 
  logFileOperation
} from '../file-system';
import path from 'path';

describe('file-system extended coverage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateAndNormalizePath edge cases', () => {
    const baseDir = '/app/uploads';

    it('should handle various path separators and normalization', () => {
      // Test paths with mixed separators
      expect(() => validateAndNormalizePath('folder/subfolder/file.wav', baseDir))
        .not.toThrow();
      
      // Test with leading slash 
      expect(() => validateAndNormalizePath('/folder/file.wav', baseDir))
        .toThrow('Path traversal attempt detected');
      
      // Test very nested valid path
      const validPath = 'a/b/c/d/e/f/g/file.wav';
      expect(() => validateAndNormalizePath(validPath, baseDir))
        .not.toThrow();
    });

    it('should properly resolve absolute vs relative paths', () => {
      const result1 = validateAndNormalizePath('test.wav', baseDir);
      expect(result1).toBe(path.resolve(baseDir, 'test.wav'));
      
      const result2 = validateAndNormalizePath('./subfolder/test.wav', baseDir);
      expect(result2).toBe(path.resolve(baseDir, './subfolder/test.wav'));
    });

    it('should handle special characters in filenames', () => {
      const specialChars = ['file name.wav', 'file-name.wav', 'file_name.wav', 'file(1).wav'];
      
      specialChars.forEach(filename => {
        expect(() => validateAndNormalizePath(filename, baseDir))
          .not.toThrow();
      });
    });

    it('should detect sophisticated path traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        'folder/../../etc/passwd',
      ];
      
      maliciousPaths.forEach(maliciousPath => {
        expect(() => validateAndNormalizePath(maliciousPath, baseDir))
          .toThrow('Path traversal attempt detected');
      });
    });
  });

  describe('logFileOperation comprehensive coverage', () => {
    it('should log all operation types with success', async () => {
      const operations = ['delete', 'rename', 'create'] as const;
      
      for (const operation of operations) {
        await logFileOperation({
          operation,
          path: `/test/${operation}`,
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z'
        });
        
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`"operation":"${operation}"`)
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('"level":"info"')
        );
      }
    });

    it('should log all operation types with failure', async () => {
      const operations = ['delete', 'rename', 'create'] as const;
      
      for (const operation of operations) {
        await logFileOperation({
          operation,
          path: `/test/${operation}`,
          success: false,
          error: `${operation} failed`,
          timestamp: '2024-01-01T00:00:00.000Z'
        });
        
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`"operation":"${operation}"`)
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining('"level":"error"')
        );
        expect(console.log).toHaveBeenCalledWith(
          expect.stringContaining(`"error":"${operation} failed"`)
        );
      }
    });

    it('should handle optional materialId field', async () => {
      // Without materialId
      await logFileOperation({
        operation: 'delete',
        path: '/test/path',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });
      
      // With materialId
      await logFileOperation({
        operation: 'delete',
        path: '/test/path',
        materialId: 'test-material-123',
        success: true,
        timestamp: '2024-01-01T00:00:00.000Z'
      });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"materialId":"test-material-123"')
      );
    });

    it('should include all required fields in log output', async () => {
      const logEntry = {
        operation: 'rename' as const,
        path: '/complex/test/path.wav',
        materialId: 'material-xyz-789',
        success: false,
        error: 'Permission denied for rename operation',
        timestamp: '2024-12-25T12:30:45.123Z'
      };
      
      await logFileOperation(logEntry);
      
      const logCall = (console.log as jest.Mock).mock.calls.slice(-1)[0][0];
      const parsedLog = JSON.parse(logCall);
      
      expect(parsedLog).toMatchObject({
        level: 'error',
        message: 'File operation',
        operation: 'rename',
        path: '/complex/test/path.wav',
        materialId: 'material-xyz-789',
        success: false,
        error: 'Permission denied for rename operation',
        timestamp: '2024-12-25T12:30:45.123Z'
      });
    });
  });

  describe('path normalization stress tests', () => {
    const baseDir = '/secure/uploads';

    it('should handle unicode and international characters', () => {
      const unicodePaths = [
        'файл.wav',       // Cyrillic
        'ファイル.wav',     // Japanese
        '文件.wav',        // Chinese
        'αρχείο.wav',     // Greek
      ];
      
      unicodePaths.forEach(unicodePath => {
        expect(() => validateAndNormalizePath(unicodePath, baseDir))
          .not.toThrow();
      });
    });

    it('should handle very long valid paths', () => {
      const longFileName = 'a'.repeat(200) + '.wav';
      const longPath = ['folder1', 'folder2', 'folder3', longFileName].join('/');
      
      expect(() => validateAndNormalizePath(longPath, baseDir))
        .not.toThrow();
    });

    it('should normalize complex but valid relative paths', () => {
      const complexPaths = [
        './folder/./file.wav',
        'folder/subfolder/../file.wav',
        './folder/../folder/file.wav'
      ];
      
      complexPaths.forEach(complexPath => {
        // These should not throw as they resolve within the base directory
        const result = validateAndNormalizePath(complexPath, baseDir);
        expect(result).toContain(baseDir);
      });
    });
  });
});