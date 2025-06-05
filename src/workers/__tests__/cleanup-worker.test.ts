// Define types outside the mock
interface MockJob {
  name: string;
  data: Record<string, unknown>;
}

interface MockWorkerInstance {
  name: string;
  close: jest.Mock;
  _processor: (job: MockJob) => Promise<{ success: boolean; timestamp: string }>;
  _options: Record<string, unknown>;
}

// Mock BullMQ
jest.mock('bullmq', () => {
  const mockWorkerClose = jest.fn();

  const MockWorker = jest
    .fn()
    .mockImplementation(
      (
        name: string,
        processor: (job: MockJob) => Promise<{ success: boolean; timestamp: string }>,
        options: Record<string, unknown>,
      ) => {
        const workerInstance: MockWorkerInstance = {
          name,
          close: mockWorkerClose,
          // Store processor and options for testing
          _processor: processor,
          _options: options,
        };
        // Store reference in global scope for tests
        (global as typeof globalThis & { __workerInstance: MockWorkerInstance }).__workerInstance =
          workerInstance;
        return workerInstance;
      },
    );

  const MockQueue = jest.fn().mockImplementation((name: string) => ({
    name,
    add: jest.fn(),
  }));

  return {
    Worker: MockWorker,
    Queue: MockQueue,
  };
});

import { cleanupWorker, cleanupQueue, scheduleCleanupJobs } from '../cleanup-worker';

// Mock AudioMetadataService
const mockCleanupTempFiles = jest.fn();
jest.mock('@/lib/audio-metadata', () => ({
  AudioMetadataService: jest.fn().mockImplementation(() => ({
    cleanupTempFiles: mockCleanupTempFiles,
  })),
}));

// Mock redis connection
jest.mock('@/lib/redis', () => ({
  connection: {
    host: 'localhost',
    port: 6379,
  },
}));

describe('CleanupWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCleanupTempFiles.mockClear();
  });

  describe('scheduleCleanupJobs', () => {
    it('should schedule cleanup job with correct repeat pattern', async () => {
      await scheduleCleanupJobs();

      expect(cleanupQueue.add).toHaveBeenCalledWith(
        'cleanup-temp-files',
        {},
        {
          repeat: {
            pattern: '*/15 * * * *', // Every 15 minutes
          },
        },
      );
    });
  });

  describe('cleanupWorker', () => {
    it('should have correct name and configuration', () => {
      expect(cleanupWorker.name).toBe('file-cleanup');
      expect((cleanupWorker as unknown as MockWorkerInstance)._options).toEqual({
        connection: {
          host: 'localhost',
          port: 6379,
        },
      });
    });

    it('should process cleanup job successfully', async () => {
      mockCleanupTempFiles.mockResolvedValue(undefined);

      // Get the processor function from the worker
      const processorFn = (cleanupWorker as unknown as MockWorkerInstance)._processor;

      const mockJob = {
        name: 'cleanup-temp-files',
        data: {},
      };

      const result = await processorFn(mockJob);

      expect(mockCleanupTempFiles).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        timestamp: expect.any(String),
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      const error = new Error('Cleanup failed');
      mockCleanupTempFiles.mockRejectedValue(error);

      const processorFn = (cleanupWorker as unknown as MockWorkerInstance)._processor;
      const mockJob = {
        name: 'cleanup-temp-files',
        data: {},
      };

      await expect(processorFn(mockJob)).rejects.toThrow('Cleanup failed');
      expect(mockCleanupTempFiles).toHaveBeenCalledTimes(1);
    });

    it('should be able to close the worker', async () => {
      await cleanupWorker.close();
      expect(cleanupWorker.close).toHaveBeenCalled();
    });
  });
});
