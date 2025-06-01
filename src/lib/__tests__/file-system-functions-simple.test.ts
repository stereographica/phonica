import { 
  validateAndNormalizePath,
  logFileOperation,
  FileOperationLog
} from '../file-system';
import path from 'path';

// Mock console.log for logFileOperation
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

beforeEach(() => {
  mockConsoleLog.mockClear();
});

afterAll(() => {
  mockConsoleLog.mockRestore();
});

describe('File System Utility Functions', () => {
  describe('validateAndNormalizePath', () => {
    const baseDir = '/uploads';

    it('normalizes valid relative paths', () => {
      const result = validateAndNormalizePath('audio.wav', baseDir);
      expect(result).toBe(path.resolve('/uploads/audio.wav'));
    });

    it('handles absolute paths within base directory', () => {
      const result = validateAndNormalizePath('/uploads/subfolder/audio.mp3', baseDir);
      expect(result).toBe(path.resolve('/uploads/subfolder/audio.mp3'));
    });

    it('throws error for path traversal attempts', () => {
      expect(() => {
        validateAndNormalizePath('../../../etc/passwd', baseDir);
      }).toThrow('Path traversal attempt detected');
      
      expect(() => {
        validateAndNormalizePath('/uploads/../../../etc/passwd', baseDir);
      }).toThrow('Path traversal attempt detected');
    });

    it('throws error for paths outside base directory', () => {
      expect(() => {
        validateAndNormalizePath('/etc/passwd', baseDir);
      }).toThrow('Path traversal attempt detected');
    });

    it('handles subdirectories correctly', () => {
      const result = validateAndNormalizePath('subfolder/audio.wav', baseDir);
      expect(result).toBe(path.resolve('/uploads/subfolder/audio.wav'));
    });
  });

  describe('logFileOperation', () => {
    it('logs successful file operations', async () => {
      const log: FileOperationLog = {
        operation: 'create',
        path: '/uploads/test.wav',
        materialId: 'mat123',
        success: true,
        timestamp: '2023-01-01T00:00:00Z'
      };

      await logFileOperation(log);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify({
          level: 'info',
          message: 'File operation',
          ...log
        })
      );
    });

    it('logs failed file operations', async () => {
      const log: FileOperationLog = {
        operation: 'delete',
        path: '/uploads/test.wav',
        success: false,
        error: 'File not found',
        timestamp: '2023-01-01T00:00:00Z'
      };

      await logFileOperation(log);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify({
          level: 'error',
          message: 'File operation',
          ...log
        })
      );
    });

    it('logs operations without optional fields', async () => {
      const log: FileOperationLog = {
        operation: 'rename',
        path: '/uploads/old.wav',
        success: true,
        timestamp: '2023-01-01T00:00:00Z'
      };

      await logFileOperation(log);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        JSON.stringify({
          level: 'info',
          message: 'File operation',
          operation: 'rename',
          path: '/uploads/old.wav',
          success: true,
          timestamp: '2023-01-01T00:00:00Z'
        })
      );
    });
  });
});