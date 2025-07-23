/**
 * @jest-environment node
 */

describe('File Deletion Queue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('Test Environment Behavior', () => {
    it('should return null for queues in test environment', () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'test';

      const {
        getFileDeletionQueue,
        getOrphanedFilesCleanupQueue,
        getFileDeletionWorker,
        getOrphanedFilesCleanupWorker,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../file-deletion-queue');

      expect(getFileDeletionQueue()).toBeNull();
      expect(getOrphanedFilesCleanupQueue()).toBeNull();
      expect(getFileDeletionWorker()).toBeNull();
      expect(getOrphanedFilesCleanupWorker()).toBeNull();
    });

    it('should return mock job for queueFileDeletion in test environment', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'test';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { queueFileDeletion } = require('../file-deletion-queue');

      const result = await queueFileDeletion('/test/file.wav', 'mat123');

      expect(result).toEqual({
        id: 'test-job',
        data: {
          filePath: '/test/file.wav',
          materialId: 'mat123',
          attemptedAt: expect.any(String),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
      });
    });

    it('should skip cleanup schedule in test environment', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'test';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { scheduleOrphanedFilesCleanup } = require('../file-deletion-queue');

      await scheduleOrphanedFilesCleanup('/uploads', {
        maxAge: 86400000,
        repeatInterval: 3600000,
      });

      expect(console.log).toHaveBeenCalledWith(
        '[OrphanedFilesCleanup] Test mode - skipping cleanup schedule',
      );
    });

    it('should return empty stats in test environment', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'test';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getQueueStats } = require('../file-deletion-queue');

      const stats = await getQueueStats();

      expect(stats).toEqual({
        fileDeletion: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
        orphanedFilesCleanup: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
      });
    });

    it('should skip shutdown in test environment', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'test';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { shutdownWorkers } = require('../file-deletion-queue');

      await shutdownWorkers();

      expect(console.log).toHaveBeenCalledWith('[Queue] Test mode - skipping worker shutdown');
    });
  });

  describe('Production Environment Behavior', () => {
    beforeEach(() => {
      // Mock ioredis and bullmq for production tests
      jest.doMock('ioredis', () => {
        return jest.fn().mockImplementation(() => ({
          disconnect: jest.fn(),
          quit: jest.fn().mockResolvedValue(undefined),
        }));
      });

      const mockAdd = jest.fn().mockResolvedValue({ id: 'job-123' });
      const mockClose = jest.fn().mockResolvedValue(undefined);
      const mockRemoveRepeatable = jest.fn().mockResolvedValue(undefined);
      const mockGetJobCountByTypes = jest.fn().mockResolvedValue({
        waiting: 1,
        active: 2,
        completed: 10,
        failed: 0,
      });

      jest.doMock('bullmq', () => ({
        Queue: jest.fn().mockImplementation(() => ({
          add: mockAdd,
          close: mockClose,
          removeRepeatable: mockRemoveRepeatable,
          getJobCountByTypes: mockGetJobCountByTypes,
          getWaitingCount: jest.fn().mockResolvedValue(1),
          getActiveCount: jest.fn().mockResolvedValue(2),
          getCompletedCount: jest.fn().mockResolvedValue(10),
          getFailedCount: jest.fn().mockResolvedValue(0),
        })),
        Worker: jest.fn().mockImplementation(() => ({
          close: jest.fn().mockResolvedValue(undefined),
          on: jest.fn(),
        })),
      }));

      jest.doMock('../../file-system', () => ({
        deleteFile: jest.fn(),
        cleanupOrphanedFiles: jest.fn(),
      }));
    });

    it('should handle production environment functions', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';

      await jest.isolateModules(async () => {
        const {
          getFileDeletionQueue,
          getOrphanedFilesCleanupQueue,
          getFileDeletionWorker,
          getOrphanedFilesCleanupWorker,
          queueFileDeletion,
          scheduleOrphanedFilesCleanup,
          getQueueStats,
          shutdownWorkers,
          // eslint-disable-next-line @typescript-eslint/no-require-imports
        } = require('../file-deletion-queue');

        // Test queue creation
        const fileDeletionQueue = getFileDeletionQueue();
        const orphanedCleanupQueue = getOrphanedFilesCleanupQueue();
        expect(fileDeletionQueue).not.toBeNull();
        expect(orphanedCleanupQueue).not.toBeNull();

        // Test worker creation
        const fileDeletionWorker = getFileDeletionWorker();
        const orphanedCleanupWorker = getOrphanedFilesCleanupWorker();
        expect(fileDeletionWorker).not.toBeNull();
        expect(orphanedCleanupWorker).not.toBeNull();

        // Test queueFileDeletion
        const result = await queueFileDeletion('/test/file.wav', 'mat123');
        expect(result).toEqual({ id: 'job-123' });

        // Test queueFileDeletion with options
        const resultWithOptions = await queueFileDeletion('/test/file.wav', 'mat123', {
          priority: 10,
          delay: 5000,
        });
        expect(resultWithOptions).toEqual({ id: 'job-123' });

        // Test scheduleOrphanedFilesCleanup (one-time)
        await scheduleOrphanedFilesCleanup('/uploads', {
          maxAge: 86400000,
          dryRun: true,
        });
        expect(console.log).toHaveBeenCalledWith(
          '[OrphanedFilesCleanup] Scheduled one-time cleanup',
        );

        // Test scheduleOrphanedFilesCleanup (repeating)
        await scheduleOrphanedFilesCleanup('/uploads', {
          maxAge: 86400000,
          repeatInterval: 3600000,
        });
        expect(console.log).toHaveBeenCalledWith(
          '[OrphanedFilesCleanup] Scheduled cleanup every 3600000ms',
        );

        // Test getQueueStats
        const stats = await getQueueStats();
        expect(stats).toEqual({
          fileDeletion: {
            waiting: 1,
            active: 2,
            completed: 10,
            failed: 0,
          },
          orphanedFilesCleanup: {
            waiting: 1,
            active: 2,
            completed: 10,
            failed: 0,
          },
        });

        // Test shutdownWorkers
        await shutdownWorkers();
        expect(console.log).toHaveBeenCalledWith('[Queue] All workers and connections closed');
      });
    });

    it('should handle Redis connection with environment variables', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
      (process.env as unknown as { REDIS_HOST: string }).REDIS_HOST = 'custom-redis';
      (process.env as unknown as { REDIS_PORT: string }).REDIS_PORT = '6380';

      await jest.isolateModules(async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getFileDeletionQueue } = require('../file-deletion-queue');
        const queue = getFileDeletionQueue();
        expect(queue).not.toBeNull();
      });

      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
    });

    it('should use default Redis configuration', async () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      await jest.isolateModules(async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getFileDeletionQueue } = require('../file-deletion-queue');
        const queue = getFileDeletionQueue();
        expect(queue).not.toBeNull();
      });
    });
  });

  describe('Deprecated exports', () => {
    it('should export deprecated constants', () => {
      (process.env as { NODE_ENV: string }).NODE_ENV = 'test';

      const {
        fileDeletionQueue,
        orphanedFilesCleanupQueue,
        fileDeletionWorker,
        orphanedFilesCleanupWorker,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../file-deletion-queue');

      // In test environment, these should be null
      expect(fileDeletionQueue).toBeNull();
      expect(orphanedFilesCleanupQueue).toBeNull();
      expect(fileDeletionWorker).toBeNull();
      expect(orphanedFilesCleanupWorker).toBeNull();
    });
  });
});
