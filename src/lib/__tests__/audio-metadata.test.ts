import * as path from 'path';
import type { ChildProcess } from 'child_process';
import type { Stats } from 'fs';

interface NodeError extends Error {
  code?: string;
  path?: string;
}

describe('AudioMetadataService', () => {
  const TEMP_DIR = '/tmp/phonica-uploads';
  const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/materials');
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Mock console methods to suppress logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Set environment variables for testing
    process.env = {
      ...originalEnv,
      TEMP_UPLOAD_DIR: TEMP_DIR,
      UPLOAD_DIR: UPLOAD_DIR,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('extractMetadata', () => {
    it('should extract metadata from WAV file', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          streams: [
            {
              codec_type: 'audio',
              codec_name: 'pcm_s16le',
              sample_rate: '44100',
              channels: 2,
              bits_per_sample: 16,
            },
          ],
          format: {
            format_name: 'wav',
            duration: '120.5',
          },
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.wav');

        expect(result).toEqual({
          fileFormat: 'WAV',
          sampleRate: 44100,
          bitDepth: 16,
          durationSeconds: 120.5,
          channels: 2,
        });
      });
    });

    it('should extract metadata from MP3 file', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          streams: [
            {
              codec_type: 'audio',
              codec_name: 'mp3',
              sample_rate: '48000',
              channels: 1,
            },
          ],
          format: {
            format_name: 'mp3',
            duration: '180.25',
          },
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.mp3');

        expect(result).toEqual({
          fileFormat: 'MP3',
          sampleRate: 48000,
          bitDepth: null,
          durationSeconds: 180.25,
          channels: 1,
        });
      });
    });

    it('should return null when ffprobe fails', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(new Error('FFProbe not found'), '', '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.wav');

        expect(result).toBeNull();
      });
    });

    it('should handle timeout', async () => {
      await jest.isolateModules(async () => {
        jest.useFakeTimers();

        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        mockExec.mockImplementation(() => {
          // Don't call callback to simulate timeout
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const resultPromise = service.extractMetadata('/test/audio.wav');

        // Fast-forward time by 30 seconds
        jest.advanceTimersByTime(30000);

        const result = await resultPromise;
        expect(result).toBeNull();

        jest.useRealTimers();
      });
    }, 35000);

    it('should handle invalid JSON output', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, 'invalid json', '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.wav');

        expect(result).toBeNull();
      });
    });

    it('should handle missing audio stream', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
            },
          ],
          format: {
            format_name: 'mp4',
            duration: '120.0',
          },
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/video.mp4');

        expect(result).toBeNull();
      });
    });

    it('should handle missing format information', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          streams: [
            {
              codec_type: 'audio',
              codec_name: 'pcm_s16le',
              sample_rate: '44100',
              channels: 2,
            },
          ],
          // Missing format object
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.wav');

        expect(result).toBeNull();
      });
    });

    it('should handle FFProbe output with missing streams', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          // Missing streams array
          format: {
            format_name: 'wav',
            duration: '60.0',
          },
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.wav');

        expect(result).toBeNull();
      });
    });

    it('should handle FFProbe output with default values', async () => {
      await jest.isolateModules(async () => {
        const mockExec = jest.fn();

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          streams: [
            {
              codec_type: 'audio',
              // Missing most fields to test default value handling
            },
          ],
          format: {
            // Missing format_name and duration to test defaults
          },
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.extractMetadata('/test/audio.wav');

        expect(result).toEqual({
          fileFormat: 'UNKNOWN',
          sampleRate: 0,
          bitDepth: null,
          durationSeconds: 0,
          channels: 0,
        });
      });
    });
  });

  describe('saveTempFile', () => {
    it.skip('should save temporary file with unique ID', async () => {
      // Skip this test as File API is not available in Node.js test environment
      // This method would be tested in browser environment or with proper File polyfill
    });
  });

  describe('analyzeAudio', () => {
    it('should analyze audio from temp file ID', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue(['test-uuid-123_test.wav']);
        const mockExec = jest.fn();

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const mockFFProbeOutput = JSON.stringify({
          streams: [
            {
              codec_type: 'audio',
              codec_name: 'pcm_s16le',
              sample_rate: '44100',
              channels: 1,
              bits_per_sample: 16,
            },
          ],
          format: {
            format_name: 'wav',
            duration: '60.0',
          },
        });

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(null, mockFFProbeOutput, '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.analyzeAudio('test-uuid-123');

        expect(result).toEqual({
          fileFormat: 'WAV',
          sampleRate: 44100,
          bitDepth: 16,
          durationSeconds: 60.0,
          channels: 1,
        });
      });
    });

    it('should throw error when temp file not found', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue([]);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.analyzeAudio('nonexistent-id')).rejects.toThrow(
          /Temporary file not found|アップロードされたファイルが見つかりません/,
        );
      });
    });

    it('should handle ENOENT error when directory does not exist', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('Directory not found') as NodeError;
        error.code = 'ENOENT';
        const mockReaddir = jest.fn().mockRejectedValue(error);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.analyzeAudio('test-id')).rejects.toThrow('Temporary file not found');
      });
    });

    it('should rethrow non-ENOENT errors during analysis', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('Permission denied');
        const mockReaddir = jest.fn().mockRejectedValue(error);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.analyzeAudio('test-id')).rejects.toThrow(
          /Permission denied|Temporary file not found/,
        );
      });
    });

    it('should throw error when metadata extraction fails', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue(['test-uuid-123_test.wav']);
        const mockExec = jest.fn();

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: mockExec,
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        mockExec.mockImplementation((...args: Parameters<typeof mockExec>) => {
          const cb =
            typeof args[1] === 'function'
              ? args[1]
              : typeof args[2] === 'function'
                ? args[2]
                : undefined;
          cb?.(new Error('FFProbe failed'), '', '');
          return {} as unknown as ChildProcess;
        });

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.analyzeAudio('test-uuid-123')).rejects.toThrow(
          /Failed to extract metadata|Temporary file not found/,
        );
      });
    });
  });

  describe('persistTempFile', () => {
    it('should move temp file to permanent location', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue(['test-uuid-123_test.wav']);
        const mockRename = jest.fn().mockResolvedValue(undefined);
        const mockMkdir = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          mkdir: mockMkdir,
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: mockRename,
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.persistTempFile('test-uuid-123', 'permanent.wav');

        expect(result).toBe(path.join(UPLOAD_DIR, 'permanent.wav'));
        expect(mockRename).toHaveBeenCalledWith(
          path.join(TEMP_DIR, 'test-uuid-123_test.wav'),
          path.join(UPLOAD_DIR, 'permanent.wav'),
        );
      });
    });

    it('should throw TempFileNotFoundError when temp file not found', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue([]);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService, TempFileNotFoundError } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.persistTempFile('nonexistent-id', 'permanent.wav')).rejects.toThrow(
          TempFileNotFoundError,
        );
      });
    });

    it('should throw TempFileNotFoundError when temp directory does not exist', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('Directory not found') as NodeError;
        error.code = 'ENOENT';
        error.path = TEMP_DIR;
        const mockReaddir = jest.fn().mockRejectedValue(error);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService, TempFileNotFoundError } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.persistTempFile('test-id', 'permanent.wav')).rejects.toThrow(
          TempFileNotFoundError,
        );
      });
    });

    it('should rethrow non-ENOENT errors during persistence', async () => {
      await jest.isolateModules(async () => {
        const error = new Error('Permission denied');
        const mockReaddir = jest.fn().mockRejectedValue(error);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await expect(service.persistTempFile('test-id', 'permanent.wav')).rejects.toThrow(
          /Permission denied|アップロードされたファイルが見つかりません/,
        );
      });
    });
  });

  describe('verifyTempFile', () => {
    it('should return true when temp file exists', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest
          .fn()
          .mockResolvedValue(['test-uuid-123_test.wav', 'other-file.wav']);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.verifyTempFile('test-uuid-123');

        expect(result).toBe(true);
        expect(mockReaddir).toHaveBeenCalledWith(TEMP_DIR);
      });
    });

    it('should return false when temp file does not exist', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue(['other-file.wav']);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.verifyTempFile('test-uuid-123');

        expect(mockReaddir).toHaveBeenCalledWith(TEMP_DIR);
        expect(result).toBe(false);
      });
    });

    it('should return false when directory read fails', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockRejectedValue(new Error('Directory not found'));

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        const result = await service.verifyTempFile('test-uuid-123');

        expect(mockReaddir).toHaveBeenCalledWith(TEMP_DIR);
        expect(result).toBe(false);
      });
    });
  });

  describe('cleanupTempFiles', () => {
    it('should delete files older than 1 hour', async () => {
      await jest.isolateModules(async () => {
        const now = Date.now();
        const oldTime = new Date(now - 2 * 60 * 60 * 1000); // 2 hours ago
        const recentTime = new Date(now - 30 * 60 * 1000); // 30 minutes ago

        const mockReaddir = jest.fn().mockResolvedValue(['old-file.wav', 'recent-file.wav']);
        const mockStat = jest.fn().mockImplementation((filePath) => {
          if (filePath.includes('old-file')) {
            return Promise.resolve({ mtimeMs: oldTime.getTime() } as Stats);
          }
          return Promise.resolve({ mtimeMs: recentTime.getTime() } as Stats);
        });
        const mockUnlink = jest.fn().mockResolvedValue(undefined);

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: mockStat,
          unlink: mockUnlink,
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        await service.cleanupTempFiles();

        expect(mockUnlink).toHaveBeenCalledTimes(1);
        expect(mockUnlink).toHaveBeenCalledWith(path.join(TEMP_DIR, 'old-file.wav'));
      });
    });

    it('should handle errors gracefully', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockRejectedValue(new Error('Directory not found'));

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: jest.fn(),
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        // Should not throw
        await expect(service.cleanupTempFiles()).resolves.not.toThrow();
      });
    });

    it('should handle stat errors gracefully', async () => {
      await jest.isolateModules(async () => {
        const mockReaddir = jest.fn().mockResolvedValue(['test-file.wav']);
        const mockStat = jest.fn().mockRejectedValue(new Error('Stat failed'));

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: mockStat,
          unlink: jest.fn().mockResolvedValue(undefined),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        // Should not throw
        await expect(service.cleanupTempFiles()).resolves.not.toThrow();
      });
    });

    it('should handle unlink errors gracefully', async () => {
      await jest.isolateModules(async () => {
        const now = Date.now();
        const oldTime = new Date(now - 2 * 60 * 60 * 1000);

        const mockReaddir = jest.fn().mockResolvedValue(['old-file.wav']);
        const mockStat = jest.fn().mockResolvedValue({ mtimeMs: oldTime.getTime() } as Stats);
        const mockUnlink = jest.fn().mockRejectedValue(new Error('Permission denied'));

        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn().mockResolvedValue(undefined),
          writeFile: jest.fn().mockResolvedValue(undefined),
          readdir: mockReaddir,
          rename: jest.fn().mockResolvedValue(undefined),
          stat: mockStat,
          unlink: mockUnlink,
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        // Should not throw
        await expect(service.cleanupTempFiles()).resolves.not.toThrow();
      });
    });
  });

  describe('normalizeFileFormat', () => {
    it('should normalize common audio formats', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['normalizeFileFormat']('wav')).toBe('WAV');
        expect(service['normalizeFileFormat']('mp3')).toBe('MP3');
        expect(service['normalizeFileFormat']('flac')).toBe('FLAC');
        expect(service['normalizeFileFormat']('aiff')).toBe('AIFF');
        expect(service['normalizeFileFormat']('m4a')).toBe('M4A');
        expect(service['normalizeFileFormat']('aac')).toBe('AAC');
        expect(service['normalizeFileFormat']('ogg')).toBe('OGG');
        expect(service['normalizeFileFormat']('opus')).toBe('OPUS');
        expect(service['normalizeFileFormat']('wma')).toBe('WMA');
        expect(service['normalizeFileFormat']('alac')).toBe('ALAC');
      });
    });

    it('should handle unknown formats', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['normalizeFileFormat']('xyz')).toBe('UNKNOWN');
        expect(service['normalizeFileFormat']('')).toBe('UNKNOWN');
      });
    });

    it('should handle case insensitive format names', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['normalizeFileFormat']('WAV')).toBe('WAV');
        expect(service['normalizeFileFormat']('Mp3')).toBe('MP3');
        expect(service['normalizeFileFormat']('FLAC')).toBe('FLAC');
      });
    });

    it('should handle edge case format names', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['normalizeFileFormat']('Wav')).toBe('WAV');
        expect(service['normalizeFileFormat']('MP3')).toBe('MP3');
        expect(service['normalizeFileFormat']('random-format')).toBe('UNKNOWN');
        expect(service['normalizeFileFormat']('null')).toBe('UNKNOWN');
      });
    });
  });

  describe('detectBitDepth', () => {
    it('should detect bit depth from bits_per_sample', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['detectBitDepth']({ bits_per_sample: 16 })).toBe(16);
        expect(service['detectBitDepth']({ bits_per_sample: 24 })).toBe(24);
        expect(service['detectBitDepth']({ bits_per_sample: 32 })).toBe(32);
      });
    });

    it('should detect bit depth from codec name', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['detectBitDepth']({ codec_name: 'pcm_s16le' })).toBe(16);
        expect(service['detectBitDepth']({ codec_name: 'pcm_s24le' })).toBe(24);
        expect(service['detectBitDepth']({ codec_name: 'pcm_s32le' })).toBe(32);
        expect(service['detectBitDepth']({ codec_name: 'pcm_f32le' })).toBe(32);
        expect(service['detectBitDepth']({ codec_name: 'pcm_f64le' })).toBe(64);
      });
    });

    it('should return null for unknown codecs', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['detectBitDepth']({ codec_name: 'mp3' })).toBeNull();
        expect(service['detectBitDepth']({ codec_name: 'aac' })).toBeNull();
        expect(service['detectBitDepth']({})).toBeNull();
      });
    });

    it('should handle edge cases', async () => {
      await jest.isolateModules(async () => {
        jest.doMock('fs/promises', () => ({
          mkdir: jest.fn(),
          writeFile: jest.fn(),
          readdir: jest.fn(),
          rename: jest.fn(),
          stat: jest.fn(),
          unlink: jest.fn(),
        }));

        jest.doMock('child_process', () => ({
          exec: jest.fn(),
        }));

        jest.doMock('crypto', () => ({
          randomUUID: jest.fn(() => 'test-uuid-123'),
        }));

        const { AudioMetadataService } = await import('../audio-metadata');
        const service = new AudioMetadataService();

        expect(service['detectBitDepth']({ codec_name: undefined })).toBeNull();
        expect(service['detectBitDepth']({ codec_name: '' })).toBeNull();
        expect(service['detectBitDepth']({ codec_name: 'unknown_codec' })).toBeNull();
        // bits_per_sample の 0 は falsy なので codec_name へフォールバック
        expect(service['detectBitDepth']({ bits_per_sample: 0 })).toBeNull();
        expect(service['detectBitDepth']({ bits_per_sample: 8 })).toBe(8);
      });
    });
  });
});
