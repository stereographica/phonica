// Mock fs/promises before any imports
const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();
const mockRename = jest.fn();
const mockStat = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
  rename: mockRename,
  stat: mockStat,
  unlink: mockUnlink,
}));

// Mock crypto module
const mockRandomUUID = jest.fn(() => 'test-uuid-123');
jest.mock('crypto', () => ({
  randomUUID: () => mockRandomUUID(),
}));

// Mock child_process module
jest.mock('child_process', () => {
  const mockExec = jest.fn();
  return {
    exec: mockExec,
  };
});

// Import after mocking
import { AudioMetadataService, TempFileNotFoundError } from '../audio-metadata';
import * as path from 'path';
import type { ChildProcess } from 'child_process';
import { exec } from 'child_process';
import type { Stats } from 'fs';
const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('AudioMetadataService', () => {
  let service: AudioMetadataService;
  const TEMP_DIR = '/tmp/phonica-uploads';
  const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads/materials');
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Reset the mocks with proper return values
    mockMkdir.mockReset();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockReset();
    mockWriteFile.mockResolvedValue(undefined);
    mockReaddir.mockReset();
    mockReaddir.mockResolvedValue([]);
    mockRename.mockReset();
    mockRename.mockResolvedValue(undefined);
    mockStat.mockReset();
    mockUnlink.mockReset();
    mockUnlink.mockResolvedValue(undefined);

    // Set environment variables for testing
    process.env = {
      ...originalEnv,
      TEMP_UPLOAD_DIR: TEMP_DIR,
      UPLOAD_DIR: UPLOAD_DIR,
    };

    service = new AudioMetadataService();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('extractMetadata', () => {
    it('should extract metadata from WAV file', async () => {
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

      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(null, mockFFProbeOutput, '');
        return {} as unknown as ChildProcess;
      });

      const result = await service.extractMetadata('/test/audio.wav');

      expect(result).toEqual({
        fileFormat: 'WAV',
        sampleRate: 44100,
        bitDepth: 16,
        durationSeconds: 120.5,
        channels: 2,
      });
    });

    it('should extract metadata from MP3 file', async () => {
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

      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(null, mockFFProbeOutput, '');
        return {} as unknown as ChildProcess;
      });

      const result = await service.extractMetadata('/test/audio.mp3');

      expect(result).toEqual({
        fileFormat: 'MP3',
        sampleRate: 48000,
        bitDepth: null,
        durationSeconds: 180.25,
        channels: 1,
      });
    });

    it('should return null when ffprobe fails', async () => {
      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(new Error('FFProbe not found'), '', '');
        return {} as unknown as ChildProcess;
      });

      const result = await service.extractMetadata('/test/audio.wav');

      expect(result).toBeNull();
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();

      mockExec.mockImplementation(() => {
        // Don't call callback to simulate timeout
        return {} as unknown as ChildProcess;
      });

      const resultPromise = service.extractMetadata('/test/audio.wav');

      // Fast-forward time by 30 seconds
      jest.advanceTimersByTime(30000);

      const result = await resultPromise;
      expect(result).toBeNull();

      jest.useRealTimers();
    }, 35000);

    it('should handle invalid JSON output', async () => {
      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(null, 'invalid json', '');
        return {} as unknown as ChildProcess;
      });

      const result = await service.extractMetadata('/test/audio.wav');

      expect(result).toBeNull();
    });

    it('should handle missing audio stream', async () => {
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

      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(null, mockFFProbeOutput, '');
        return {} as unknown as ChildProcess;
      });

      const result = await service.extractMetadata('/test/video.mp4');

      expect(result).toBeNull();
    });
  });

  describe('saveTempFile', () => {
    it.skip('should save temporary file with unique ID', async () => {
      const mockFile = new File(['test content'], 'test.wav', { type: 'audio/wav' });
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const tempFileId = await service.saveTempFile(mockFile);

      expect(tempFileId).toBe('test-uuid-123');
      expect(mockMkdir).toHaveBeenCalledWith(TEMP_DIR, { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        path.join(TEMP_DIR, 'test-uuid-123_test.wav'),
        expect.any(Buffer),
      );
    });
  });

  describe('analyzeAudio', () => {
    it.skip('should analyze audio from temp file ID', async () => {
      mockReaddir.mockResolvedValue(['test-uuid-123_test.wav']);

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

      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(null, mockFFProbeOutput, '');
        return {} as unknown as ChildProcess;
      });

      const result = await service.analyzeAudio('test-uuid-123');

      expect(result).toEqual({
        fileFormat: 'WAV',
        sampleRate: 44100,
        bitDepth: 16,
        durationSeconds: 60.0,
        channels: 1,
      });
    });

    it('should throw error when temp file not found', async () => {
      mockReaddir.mockResolvedValue([]);

      await expect(service.analyzeAudio('nonexistent-id')).rejects.toThrow(
        'Temporary file not found',
      );
    });

    it.skip('should throw error when metadata extraction fails', async () => {
      mockReaddir.mockResolvedValue(['test-uuid-123_test.wav']);
      mockExec.mockImplementation((...args: Parameters<typeof exec>) => {
        // Handle both exec(cmd, callback) and exec(cmd, options, callback) signatures
        const cb =
          typeof args[1] === 'function'
            ? args[1]
            : typeof args[2] === 'function'
              ? args[2]
              : undefined;
        cb?.(new Error('FFProbe failed'), '', '');
        return {} as unknown as ChildProcess;
      });

      await expect(service.analyzeAudio('test-uuid-123')).rejects.toThrow(
        'Failed to extract metadata',
      );
    });
  });

  describe('persistTempFile', () => {
    it.skip('should move temp file to permanent location', async () => {
      mockReaddir.mockResolvedValue(['test-uuid-123_test.wav']);
      mockRename.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const result = await service.persistTempFile('test-uuid-123', 'permanent.wav');

      expect(result).toBe(path.join(UPLOAD_DIR, 'permanent.wav'));
      expect(mockRename).toHaveBeenCalledWith(
        path.join(TEMP_DIR, 'test-uuid-123_test.wav'),
        path.join(UPLOAD_DIR, 'permanent.wav'),
      );
    });

    it('should throw TempFileNotFoundError when temp file not found', async () => {
      mockReaddir.mockResolvedValue([]);

      await expect(service.persistTempFile('nonexistent-id', 'permanent.wav')).rejects.toThrow(
        TempFileNotFoundError,
      );
    });
  });

  describe('verifyTempFile', () => {
    it.skip('should return true when temp file exists', async () => {
      mockReaddir.mockResolvedValue(['test-uuid-123_test.wav', 'other-file.wav']);

      const result = await service.verifyTempFile('test-uuid-123');

      expect(result).toBe(true);
    });

    it.skip('should return false when temp file does not exist', async () => {
      mockReaddir.mockResolvedValue(['other-file.wav']);

      const result = await service.verifyTempFile('test-uuid-123');

      expect(mockReaddir).toHaveBeenCalledWith(TEMP_DIR);
      expect(result).toBe(false);
    });

    it.skip('should return false when directory read fails', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      const result = await service.verifyTempFile('test-uuid-123');

      expect(mockReaddir).toHaveBeenCalledWith(TEMP_DIR);
      expect(result).toBe(false);
    });
  });

  describe('cleanupTempFiles', () => {
    it.skip('should delete files older than 1 hour', async () => {
      const now = Date.now();
      const oldTime = new Date(now - 2 * 60 * 60 * 1000); // 2 hours ago
      const recentTime = new Date(now - 30 * 60 * 1000); // 30 minutes ago

      mockReaddir.mockResolvedValue(['old-file.wav', 'recent-file.wav']);
      mockStat.mockImplementation((filePath) => {
        if (filePath.includes('old-file')) {
          return Promise.resolve({ mtimeMs: oldTime.getTime() } as Stats);
        }
        return Promise.resolve({ mtimeMs: recentTime.getTime() } as Stats);
      });
      mockUnlink.mockResolvedValue(undefined);

      await service.cleanupTempFiles();

      expect(mockUnlink).toHaveBeenCalledTimes(1);
      expect(mockUnlink).toHaveBeenCalledWith(path.join(TEMP_DIR, 'old-file.wav'));
    });

    it('should handle errors gracefully', async () => {
      mockReaddir.mockRejectedValue(new Error('Directory not found'));

      // Should not throw
      await expect(service.cleanupTempFiles()).resolves.not.toThrow();
    });
  });

  describe('normalizeFileFormat', () => {
    it('should normalize common audio formats', () => {
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

    it('should handle unknown formats', () => {
      expect(service['normalizeFileFormat']('xyz')).toBe('UNKNOWN');
      expect(service['normalizeFileFormat']('')).toBe('UNKNOWN');
    });
  });

  describe('detectBitDepth', () => {
    it('should detect bit depth from bits_per_sample', () => {
      expect(service['detectBitDepth']({ bits_per_sample: 16 })).toBe(16);
      expect(service['detectBitDepth']({ bits_per_sample: 24 })).toBe(24);
      expect(service['detectBitDepth']({ bits_per_sample: 32 })).toBe(32);
    });

    it('should detect bit depth from codec name', () => {
      expect(service['detectBitDepth']({ codec_name: 'pcm_s16le' })).toBe(16);
      expect(service['detectBitDepth']({ codec_name: 'pcm_s24le' })).toBe(24);
      expect(service['detectBitDepth']({ codec_name: 'pcm_s32le' })).toBe(32);
      expect(service['detectBitDepth']({ codec_name: 'pcm_f32le' })).toBe(32);
    });

    it('should return null for unknown codecs', () => {
      expect(service['detectBitDepth']({ codec_name: 'mp3' })).toBeNull();
      expect(service['detectBitDepth']({ codec_name: 'aac' })).toBeNull();
      expect(service['detectBitDepth']({})).toBeNull();
    });
  });
});
