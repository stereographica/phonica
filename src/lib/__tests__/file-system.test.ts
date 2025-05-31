/**
 * @jest-environment node
 */

jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  rename: jest.fn(),
  readdir: jest.fn(),
  access: jest.fn(),
}));

import { 
  deleteFile, 
  validateAndNormalizePath, 
  markFileForDeletion,
  unmarkFileForDeletion,
  cleanupOrphanedFiles,
  logFileOperation,
  FileSystemError
} from '../file-system';
import fs from 'fs/promises';
import path from 'path';

// Explicit type assertion for mocked functions
const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
const mockRename = fs.rename as jest.MockedFunction<typeof fs.rename>;
const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;

describe('file-system', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockUnlink.mockResolvedValue(undefined);

      await expect(deleteFile('/path/to/file.wav', { skipValidation: true }))
        .resolves.not.toThrow();

      expect(mockUnlink).toHaveBeenCalledWith('/path/to/file.wav');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"success":true')
      );
    });

    it('should validate path when allowedBaseDir is provided', async () => {
      const baseDir = '/app/public/uploads/materials';
      const filePath = 'test.wav';
      mockUnlink.mockResolvedValue(undefined);

      await deleteFile(filePath, { allowedBaseDir: baseDir });

      expect(mockUnlink).toHaveBeenCalledWith(path.resolve(baseDir, filePath));
    });

    it('should handle ENOENT error gracefully', async () => {
      const error: FileSystemError = new Error('File not found');
      error.code = 'ENOENT';
      mockUnlink.mockRejectedValue(error);

      await expect(deleteFile('/path/to/missing.wav', { skipValidation: true }))
        .resolves.not.toThrow();

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('File already deleted or not found')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"success":false')
      );
    });

    it('should throw error for non-ENOENT errors', async () => {
      const error = new Error('Permission denied');
      mockUnlink.mockRejectedValue(error);

      await expect(deleteFile('/path/to/file.wav', { skipValidation: true }))
        .rejects.toThrow('Permission denied');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"success":false')
      );
    });

    it('should include materialId in logs when provided', async () => {
      mockUnlink.mockResolvedValue(undefined);

      await deleteFile('/path/to/file.wav', { 
        skipValidation: true, 
        materialId: 'material-123' 
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"materialId":"material-123"')
      );
    });

    it('should throw error for path traversal when validation is enabled', async () => {
      const baseDir = '/app/public/uploads/materials';
      
      await expect(deleteFile('../../../etc/passwd', { allowedBaseDir: baseDir }))
        .rejects.toThrow('Path traversal attempt detected');
      
      expect(mockUnlink).not.toHaveBeenCalled();
    });
  });

  describe('markFileForDeletion', () => {
    it('should rename file with deletion timestamp', async () => {
      const originalPath = '/path/to/file.wav';
      const mockTime = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTime);
      mockRename.mockResolvedValue(undefined);

      const result = await markFileForDeletion(originalPath);

      expect(result).toBe(`${originalPath}.deleted_${mockTime}`);
      expect(mockRename).toHaveBeenCalledWith(
        originalPath,
        `${originalPath}.deleted_${mockTime}`
      );
    });

    it('should throw error if rename fails', async () => {
      const error = new Error('Permission denied');
      mockRename.mockRejectedValue(error);

      await expect(markFileForDeletion('/path/to/file.wav'))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('unmarkFileForDeletion', () => {
    it('should restore original filename', async () => {
      const markedPath = '/path/to/file.wav.deleted_1234567890';
      mockRename.mockResolvedValue(undefined);

      const result = await unmarkFileForDeletion(markedPath);

      expect(result).toBe('/path/to/file.wav');
      expect(mockRename).toHaveBeenCalledWith(
        markedPath,
        '/path/to/file.wav'
      );
    });

    it('should handle files with .deleted_ in original name', async () => {
      const markedPath = '/path/to/file.deleted_test.wav.deleted_1234567890';
      mockRename.mockResolvedValue(undefined);

      const result = await unmarkFileForDeletion(markedPath);

      expect(result).toBe('/path/to/file.deleted_test.wav');
    });
  });

  describe('cleanupOrphanedFiles', () => {
    const uploadsDir = '/app/public/uploads/materials';

    it('should delete orphaned files older than maxAge', async () => {
      const currentTime = Date.now();
      const oldFile = 'test.wav.deleted_' + (currentTime - 25 * 60 * 60 * 1000); // 25 hours old
      const recentFile = 'recent.wav.deleted_' + (currentTime - 1 * 60 * 60 * 1000); // 1 hour old
      
      mockReaddir.mockResolvedValue([oldFile, recentFile, 'normal.wav'] as string[]);
      mockUnlink.mockResolvedValue(undefined);

      const result = await cleanupOrphanedFiles(uploadsDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(path.join(uploadsDir, oldFile));
      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockUnlink).toHaveBeenCalledWith(path.join(uploadsDir, oldFile));
    });

    it('should respect custom maxAge option', async () => {
      const currentTime = Date.now();
      const file = 'test.wav.deleted_' + (currentTime - 2 * 60 * 60 * 1000); // 2 hours old
      
      mockReaddir.mockResolvedValue([file] as string[]);
      mockUnlink.mockResolvedValue(undefined);

      const result = await cleanupOrphanedFiles(uploadsDir, { 
        maxAge: 1 * 60 * 60 * 1000 // 1 hour
      });

      expect(result).toHaveLength(1);
      expect(mockUnlink).toHaveBeenCalledWith(path.join(uploadsDir, file));
    });

    it('should support dry run mode', async () => {
      const currentTime = Date.now();
      const oldFile = 'test.wav.deleted_' + (currentTime - 25 * 60 * 60 * 1000);
      
      mockReaddir.mockResolvedValue([oldFile] as string[]);

      const result = await cleanupOrphanedFiles(uploadsDir, { dryRun: true });

      expect(result).toHaveLength(0);
      expect(mockUnlink).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DRY RUN] Would delete:')
      );
    });

    it('should continue on individual file deletion errors', async () => {
      const currentTime = Date.now();
      const file1 = 'test1.wav.deleted_' + (currentTime - 25 * 60 * 60 * 1000);
      const file2 = 'test2.wav.deleted_' + (currentTime - 25 * 60 * 60 * 1000);
      
      mockReaddir.mockResolvedValue([file1, file2] as string[]);
      mockUnlink
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(undefined);

      const result = await cleanupOrphanedFiles(uploadsDir);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(path.join(uploadsDir, file2));
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup'),
        expect.any(Error)
      );
    });

    it('should handle readdir errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const result = await cleanupOrphanedFiles(uploadsDir);

      expect(result).toHaveLength(0);
      expect(console.error).toHaveBeenCalledWith(
        'Error during orphaned files cleanup:',
        expect.any(Error)
      );
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
  });
});