/**
 * @jest-environment node
 */

describe('file-system', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  describe('validateAndNormalizePath', () => {
    it('should normalize and validate a valid relative path', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        const result = validateAndNormalizePath('test.wav', baseDir);
        expect(result).toBe(path.resolve(baseDir, 'test.wav'));
      });
    });

    it('should normalize and validate a valid absolute path within base directory', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        const validPath = path.join(baseDir, 'test.wav');
        const result = validateAndNormalizePath(validPath, baseDir);
        expect(result).toBe(path.resolve(validPath));
      });
    });

    it('should throw error for path traversal attempts with ../', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');

        const baseDir = '/app/public/uploads/materials';
        expect(() => validateAndNormalizePath('../../../etc/passwd', baseDir)).toThrow(
          'Path traversal attempt detected',
        );
      });
    });

    it('should throw error for absolute path outside base directory', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');

        const baseDir = '/app/public/uploads/materials';
        expect(() => validateAndNormalizePath('/etc/passwd', baseDir)).toThrow(
          'Path traversal attempt detected',
        );
      });
    });

    it('should handle complex path traversal attempts', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');

        const baseDir = '/app/public/uploads/materials';
        expect(() =>
          validateAndNormalizePath('test/../../../../../../etc/passwd', baseDir),
        ).toThrow('Path traversal attempt detected');
      });
    });

    it('should normalize paths with ./ correctly', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        const result = validateAndNormalizePath('./subfolder/test.wav', baseDir);
        expect(result).toBe(path.resolve(baseDir, 'subfolder/test.wav'));
      });
    });

    it('should handle nested directory paths', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        const result = validateAndNormalizePath('audio/2024/recording.wav', baseDir);
        expect(result).toBe(path.resolve(baseDir, 'audio/2024/recording.wav'));
      });
    });

    it('should handle Windows-style path separators on Unix', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        // Unix環境では \ はファイル名の一部として扱われる
        const result = validateAndNormalizePath('subfolder\\test.wav', baseDir);
        expect(result).toBe(path.resolve(baseDir, 'subfolder\\test.wav'));
      });
    });

    it('should handle path with Windows separators on Unix', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        // Unix環境では \\ はファイル名の一部として扱われ、パストラバーサルにはならない
        const result = validateAndNormalizePath('..\\..\\..\\etc\\passwd', baseDir);
        expect(result).toBe(path.resolve(baseDir, '..\\..\\..\\etc\\passwd'));
      });
    });

    it('should handle empty filename', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');

        const baseDir = '/app/public/uploads/materials';
        expect(() => validateAndNormalizePath('', baseDir)).not.toThrow();
      });
    });

    it('should handle relative path with multiple dots', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/public/uploads/materials';
        const result = validateAndNormalizePath('./test..wav', baseDir);
        expect(result).toBe(path.resolve(baseDir, 'test..wav'));
      });
    });
  });

  describe('logFileOperation', () => {
    it('should log successful operations with info level', async () => {
      await jest.isolateModules(async () => {
        // Mock console within isolateModules to prevent cross-test contamination
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        await logFileOperation({
          operation: 'delete',
          path: '/test/path',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"info"'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"operation":"delete"'));

        consoleSpy.mockRestore();
      });
    });

    it('should log failed operations with error level', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        await logFileOperation({
          operation: 'delete',
          path: '/test/path',
          success: false,
          error: 'Permission denied',
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"error"'));
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Permission denied"'),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should include materialId when provided', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        await logFileOperation({
          operation: 'delete',
          path: '/test/path',
          materialId: 'material-123',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"materialId":"material-123"'),
        );

        consoleSpy.mockRestore();
      });
    });

    it('should handle rename operations', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        await logFileOperation({
          operation: 'rename',
          path: '/test/old-path',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"operation":"rename"'));

        consoleSpy.mockRestore();
      });
    });

    it('should handle create operations', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        await logFileOperation({
          operation: 'create',
          path: '/test/new-file',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"operation":"create"'));

        consoleSpy.mockRestore();
      });
    });

    it('should log all required fields', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        const logEntry = {
          operation: 'delete' as const,
          path: '/test/file.wav',
          materialId: 'mat-123',
          success: false,
          error: 'File not found',
          timestamp: '2024-01-01T12:00:00.000Z',
        };

        await logFileOperation(logEntry);

        const logCall = consoleSpy.mock.calls[0][0];
        const parsedLog = JSON.parse(logCall);

        expect(parsedLog.level).toBe('error');
        expect(parsedLog.message).toBe('File operation');
        expect(parsedLog.operation).toBe('delete');
        expect(parsedLog.path).toBe('/test/file.wav');
        expect(parsedLog.materialId).toBe('mat-123');
        expect(parsedLog.success).toBe(false);
        expect(parsedLog.error).toBe('File not found');
        expect(parsedLog.timestamp).toBe('2024-01-01T12:00:00.000Z');

        consoleSpy.mockRestore();
      });
    });
  });

  // Additional coverage tests for edge cases
  describe('additional coverage tests', () => {
    it('should validate edge cases in validateAndNormalizePath', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');

        const baseDir = '/test/base';

        // Test with null byte injection
        expect(() => validateAndNormalizePath('test\0file', baseDir)).not.toThrow(); // Note: This just tests the function doesn't crash

        // Test with very long path
        const longPath = 'a'.repeat(1000);
        expect(() => validateAndNormalizePath(longPath, baseDir)).not.toThrow();
      });
    });

    it('should handle logFileOperation with all possible combinations', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        // Test with minimal required fields
        await logFileOperation({
          operation: 'create',
          path: '/minimal/path',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"operation":"create"'));

        consoleSpy.mockRestore();
      });
    });

    it('should handle various path scenarios in validateAndNormalizePath', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        const baseDir = '/app/uploads';

        // Test absolute path equal to base directory
        expect(() => validateAndNormalizePath('/app/uploads', baseDir)).not.toThrow();

        // Test path with multiple slashes
        const result = validateAndNormalizePath('folder//file.wav', baseDir);
        expect(result).toBe(path.resolve(baseDir, 'folder/file.wav'));

        // Test path that starts with base dir path but goes outside
        expect(() => validateAndNormalizePath('/other/uploads/file.wav', baseDir)).toThrow(
          'Path traversal attempt detected',
        );
      });
    });

    it('should test conditional branches in functions', async () => {
      await jest.isolateModules(async () => {
        const { logFileOperation } = await import('../file-system');

        // Test all operation types for logFileOperation
        const operations = ['delete', 'rename', 'create'] as const;

        for (const operation of operations) {
          await logFileOperation({
            operation,
            path: `/test/${operation}`,
            success: operation !== 'delete', // Mix success/failure to test branches
            error: operation === 'delete' ? 'Test error' : undefined,
            materialId: operation === 'rename' ? 'mat-123' : undefined,
            timestamp: '2024-01-01T00:00:00.000Z',
          });
        }
      });
    });

    it('should handle different base directory scenarios', async () => {
      await jest.isolateModules(async () => {
        const { validateAndNormalizePath } = await import('../file-system');
        const path = await import('path');

        // Test with trailing slash in base directory
        expect(() => validateAndNormalizePath('test.wav', '/base/dir/')).not.toThrow();

        // Test with relative path that resolves inside base
        const result = validateAndNormalizePath('./subfolder/../test.wav', '/base');
        expect(result).toBe(path.resolve('/base', 'test.wav'));

        // Test empty path
        expect(() => validateAndNormalizePath('', '/base')).not.toThrow();
      });
    });

    it('should handle edge cases in operation logging', async () => {
      await jest.isolateModules(async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        const { logFileOperation } = await import('../file-system');

        // Test success without materialId
        await logFileOperation({
          operation: 'create',
          path: '/no-material',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        // Test failure with all optional fields
        await logFileOperation({
          operation: 'delete',
          path: '/with-all-fields',
          materialId: 'test-material',
          success: false,
          error: 'Complete error message',
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        // Test rename operation specifically
        await logFileOperation({
          operation: 'rename',
          path: '/rename-test',
          success: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        });

        consoleSpy.mockRestore();
      });
    });
  });

  describe('deleteFile', () => {
    const testPath = '/test/file.wav';
    const baseDir = '/test';

    it('should delete file successfully without validation', async () => {
      await jest.isolateModules(async () => {
        const mockUnlink = jest.fn().mockResolvedValue(undefined);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Ensure clean module state
        jest.resetModules();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn().mockResolvedValue(undefined),
          rename: jest.fn().mockResolvedValue(undefined),
          readdir: jest.fn().mockResolvedValue([]),
        }));

        const { deleteFile } = await import('../file-system');

        await deleteFile(testPath, { skipValidation: true });

        // Wait for any pending async operations
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockUnlink).toHaveBeenCalledWith(testPath);
        expect(mockUnlink).toHaveBeenCalledTimes(1);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"success":true'));

        consoleSpy.mockRestore();
      });
    });

    it('should delete file with path validation', async () => {
      await jest.isolateModules(async () => {
        const mockUnlink = jest.fn().mockResolvedValue(undefined);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const path = await import('path');

        // Ensure clean module state and mock before any imports
        jest.resetModules();

        // Mock fs/promises with explicit module path
        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn().mockResolvedValue(undefined),
          rename: jest.fn().mockResolvedValue(undefined),
          readdir: jest.fn().mockResolvedValue([]),
        }));

        // Import the module after mocking - use require to ensure sync resolution
        const fileSystemModule = await import('../file-system');
        const { deleteFile } = fileSystemModule;

        // Call deleteFile with path validation
        await deleteFile('file.wav', { allowedBaseDir: baseDir });

        // Wait for all async operations to complete
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Verify that unlink was called with the correct path
        const expectedPath = path.resolve(baseDir, 'file.wav');
        expect(mockUnlink).toHaveBeenCalledWith(expectedPath);
        expect(mockUnlink).toHaveBeenCalledTimes(1);

        consoleSpy.mockRestore();
      });
    });

    it('should handle ENOENT error gracefully', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('File not found') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        const mockUnlink = jest.fn().mockRejectedValue(error);
        const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

        // Ensure clean module state
        jest.resetModules();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn().mockResolvedValue(undefined),
          rename: jest.fn().mockResolvedValue(undefined),
          readdir: jest.fn().mockResolvedValue([]),
        }));

        const { deleteFile } = await import('../file-system');

        await expect(deleteFile(testPath, { skipValidation: true })).resolves.not.toThrow();

        // Wait for async operations
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          expect.stringContaining('File already deleted or not found'),
        );

        consoleInfoSpy.mockRestore();
      });
    });

    it('should rethrow non-ENOENT errors', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('Permission denied');
        const mockUnlink = jest.fn().mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Ensure clean module state
        jest.resetModules();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn().mockResolvedValue(undefined),
          rename: jest.fn().mockResolvedValue(undefined),
          readdir: jest.fn().mockResolvedValue([]),
        }));

        const { deleteFile } = await import('../file-system');

        await expect(deleteFile(testPath, { skipValidation: true })).rejects.toThrow(
          'Permission denied',
        );

        // Wait for async operations
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"success":false'));

        consoleSpy.mockRestore();
      });
    });

    it('should include materialId in logs', async () => {
      await jest.isolateModules(async () => {
        const mockUnlink = jest.fn().mockResolvedValue(undefined);
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Ensure clean module state
        jest.resetModules();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn().mockResolvedValue(undefined),
          rename: jest.fn().mockResolvedValue(undefined),
          readdir: jest.fn().mockResolvedValue([]),
        }));

        const { deleteFile } = await import('../file-system');

        await deleteFile(testPath, { skipValidation: true, materialId: 'mat-123' });

        // Wait for async operations
        await new Promise((resolve) => setImmediate(resolve));
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"materialId":"mat-123"'));

        consoleSpy.mockRestore();
      });
    });

    it('should validate path when allowedBaseDir is provided', async () => {
      await jest.isolateModules(async () => {
        const mockUnlink = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: jest.fn(),
        }));

        const { deleteFile } = await import('../file-system');

        await expect(
          deleteFile('../../../etc/passwd', { allowedBaseDir: baseDir }),
        ).rejects.toThrow('Path traversal attempt detected');
      });
    });
  });

  describe('checkFileExists', () => {
    it('should return true when file exists', async () => {
      await jest.isolateModules(async () => {
        const mockAccess = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: mockAccess,
          rename: jest.fn(),
          readdir: jest.fn(),
        }));

        const { checkFileExists } = await import('../file-system');

        const result = await checkFileExists('/test/file.wav');

        expect(result).toBe(true);
        expect(mockAccess).toHaveBeenCalledWith('/test/file.wav');
      });
    });

    it('should return false when file does not exist (ENOENT)', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('File not found') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        const mockAccess = jest.fn().mockRejectedValue(error);

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: mockAccess,
          rename: jest.fn(),
          readdir: jest.fn(),
        }));

        const { checkFileExists } = await import('../file-system');

        const result = await checkFileExists('/test/nonexistent.wav');

        expect(result).toBe(false);
      });
    });

    it('should rethrow non-ENOENT errors', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('Permission denied') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        const mockAccess = jest.fn().mockRejectedValue(error);

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: mockAccess,
          rename: jest.fn(),
          readdir: jest.fn(),
        }));

        const { checkFileExists } = await import('../file-system');

        await expect(checkFileExists('/test/file.wav')).rejects.toThrow('Permission denied');
      });
    });
  });

  describe('markFileForDeletion', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    });

    afterEach(() => {
      (Date.now as jest.Mock).mockRestore();
    });

    it('should rename file with deletion marker', async () => {
      await jest.isolateModules(async () => {
        const mockRename = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: jest.fn(),
          rename: mockRename,
          readdir: jest.fn(),
        }));

        const { markFileForDeletion } = await import('../file-system');

        const result = await markFileForDeletion('/test/file.wav');

        expect(result).toBe('/test/file.wav.deleted_1234567890');
        expect(mockRename).toHaveBeenCalledWith(
          '/test/file.wav',
          '/test/file.wav.deleted_1234567890',
        );
      });
    });

    it('should handle rename errors', async () => {
      await jest.isolateModules(async () => {
        const mockRename = jest.fn().mockRejectedValue(new Error('Rename failed'));

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: jest.fn(),
          rename: mockRename,
          readdir: jest.fn(),
        }));

        const { markFileForDeletion } = await import('../file-system');

        await expect(markFileForDeletion('/test/file.wav')).rejects.toThrow('Rename failed');
      });
    });
  });

  describe('unmarkFileForDeletion', () => {
    it('should restore marked file to original name', async () => {
      await jest.isolateModules(async () => {
        const mockRename = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: jest.fn(),
          rename: mockRename,
          readdir: jest.fn(),
        }));

        const { unmarkFileForDeletion } = await import('../file-system');

        const result = await unmarkFileForDeletion('/test/file.wav.deleted_1234567890');

        expect(result).toBe('/test/file.wav');
        expect(mockRename).toHaveBeenCalledWith(
          '/test/file.wav.deleted_1234567890',
          '/test/file.wav',
        );
      });
    });

    it('should handle complex filename with multiple extensions', async () => {
      await jest.isolateModules(async () => {
        const mockRename = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: jest.fn(),
          rename: mockRename,
          readdir: jest.fn(),
        }));

        const { unmarkFileForDeletion } = await import('../file-system');

        const result = await unmarkFileForDeletion('/test/file.backup.wav.deleted_9876543210');

        expect(result).toBe('/test/file.backup.wav');
      });
    });

    it('should handle unmarking errors', async () => {
      await jest.isolateModules(async () => {
        const mockRename = jest.fn().mockRejectedValue(new Error('Unmark failed'));

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: jest.fn(),
          rename: mockRename,
          readdir: jest.fn(),
        }));

        const { unmarkFileForDeletion } = await import('../file-system');

        await expect(unmarkFileForDeletion('/test/file.wav.deleted_1234567890')).rejects.toThrow(
          'Unmark failed',
        );
      });
    });
  });

  describe('cleanupOrphanedFiles', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1000000000); // Fixed timestamp
    });

    afterEach(() => {
      (Date.now as jest.Mock).mockRestore();
    });

    it('should cleanup old marked files', async () => {
      await jest.isolateModules(async () => {
        const oldTimestamp = 1000000000 - 25 * 60 * 60 * 1000; // 25 hours ago
        const mockReaddir = jest
          .fn()
          .mockResolvedValue([
            'file1.wav',
            `old-file.wav.deleted_${oldTimestamp}`,
            'normal-file.wav',
          ]);
        const mockUnlink = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads');

        expect(result).toEqual([`/test/uploads/old-file.wav.deleted_${oldTimestamp}`]);
        expect(mockUnlink).toHaveBeenCalledWith(
          `/test/uploads/old-file.wav.deleted_${oldTimestamp}`,
        );
      });
    });

    it('should not cleanup recent marked files', async () => {
      await jest.isolateModules(async () => {
        const recentTimestamp = 1000000000 - 1 * 60 * 60 * 1000; // 1 hour ago
        const mockReaddir = jest
          .fn()
          .mockResolvedValue([`recent-file.wav.deleted_${recentTimestamp}`]);
        const mockUnlink = jest.fn();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads');

        expect(result).toEqual([]);
        expect(mockUnlink).not.toHaveBeenCalled();
      });
    });

    it('should handle dry run mode', async () => {
      await jest.isolateModules(async () => {
        const oldTimestamp = 1000000000 - 25 * 60 * 60 * 1000;
        const mockReaddir = jest.fn().mockResolvedValue([`old-file.wav.deleted_${oldTimestamp}`]);
        const mockUnlink = jest.fn();
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads', { dryRun: true });

        expect(result).toEqual([]);
        expect(mockUnlink).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[DRY RUN] Would delete'));

        consoleSpy.mockRestore();
      });
    });

    it('should use custom maxAge', async () => {
      await jest.isolateModules(async () => {
        const customAge = 2 * 60 * 60 * 1000; // 2 hours
        const timestamp = 1000000000 - 3 * 60 * 60 * 1000; // 3 hours ago
        const mockReaddir = jest.fn().mockResolvedValue([`file.wav.deleted_${timestamp}`]);
        const mockUnlink = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads', { maxAge: customAge });

        expect(result).toEqual([`/test/uploads/file.wav.deleted_${timestamp}`]);
      });
    });

    it('should handle readdir errors gracefully', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockRejectedValue(new Error('Directory not found'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.doMock('fs/promises', () => ({
          unlink: jest.fn(),
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads');

        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error during orphaned files cleanup:',
          expect.any(Error),
        );

        consoleErrorSpy.mockRestore();
      });
    });

    it('should handle unlink errors gracefully', async () => {
      await jest.isolateModules(async () => {
        const oldTimestamp = 1000000000 - 25 * 60 * 60 * 1000;
        const mockReaddir = jest.fn().mockResolvedValue([`file.wav.deleted_${oldTimestamp}`]);
        const mockUnlink = jest.fn().mockRejectedValue(new Error('Permission denied'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads');

        expect(result).toEqual([]);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to cleanup'),
          expect.any(Error),
        );

        consoleErrorSpy.mockRestore();
      });
    });

    it('should ignore files without proper deleted marker format', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest
          .fn()
          .mockResolvedValue(['file.wav.deleted_invalid', 'file.wav.deleted_', 'normal-file.wav']);
        const mockUnlink = jest.fn();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads');

        expect(result).toEqual([]);
        expect(mockUnlink).not.toHaveBeenCalled();
      });
    });

    it('should handle files with .deleted_ but invalid timestamp', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest
          .fn()
          .mockResolvedValue(['file.wav.deleted_abc', 'file.wav.deleted_123abc']);
        const mockUnlink = jest.fn();

        jest.doMock('fs/promises', () => ({
          unlink: mockUnlink,
          access: jest.fn(),
          rename: jest.fn(),
          readdir: mockReaddir,
        }));

        const { cleanupOrphanedFiles } = await import('../file-system');

        const result = await cleanupOrphanedFiles('/test/uploads');

        expect(result).toEqual([]);
        expect(mockUnlink).not.toHaveBeenCalled();
      });
    });
  });
});
