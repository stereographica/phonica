// Mock dependencies first
jest.mock('ioredis');
jest.mock('bullmq');
jest.mock('../../file-system');

import { Queue } from 'bullmq';
import {
  getFileDeletionQueue,
  getOrphanedFilesCleanupQueue,
  getFileDeletionWorker,
  getOrphanedFilesCleanupWorker,
  queueFileDeletion,
  scheduleOrphanedFilesCleanup,
  getQueueStats,
  shutdownWorkers,
} from '../file-deletion-queue';

describe('File Deletion Queue', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = undefined;
  });

  afterEach(() => {
    // Restore original environment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = originalEnv;
  });

  describe('Test Environment Behavior', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env as any).NODE_ENV = 'test';
    });

    it('should return null for queues in test environment', () => {
      expect(getFileDeletionQueue()).toBeNull();
      expect(getOrphanedFilesCleanupQueue()).toBeNull();
      expect(getFileDeletionWorker()).toBeNull();
      expect(getOrphanedFilesCleanupWorker()).toBeNull();
    });

    it('should return mock job for queueFileDeletion in test environment', async () => {
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await scheduleOrphanedFilesCleanup('/uploads', {
        maxAge: 86400000,
        repeatInterval: 3600000,
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[OrphanedFilesCleanup] Test mode - skipping cleanup schedule'
      );
      
      consoleSpy.mockRestore();
    });

    it('should return empty stats in test environment', async () => {
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
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await shutdownWorkers();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Queue] Test mode - skipping worker shutdown'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Production Environment Behavior', () => {
    beforeEach(() => {
      // Remove NODE_ENV to simulate production
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env as any).NODE_ENV = undefined;
      
      // Mock Redis constructor
      const mockRedis = jest.requireMock('ioredis');
      mockRedis.mockImplementation(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        quit: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        maxRetriesPerRequest: null,
      }));

      // Mock Queue constructor
      const mockQueue = jest.fn();
      mockQueue.prototype.add = jest.fn().mockResolvedValue({ id: 'job-123' });
      mockQueue.prototype.getWaitingCount = jest.fn().mockResolvedValue(0);
      mockQueue.prototype.getActiveCount = jest.fn().mockResolvedValue(0);
      mockQueue.prototype.getCompletedCount = jest.fn().mockResolvedValue(0);
      mockQueue.prototype.getFailedCount = jest.fn().mockResolvedValue(0);
      mockQueue.prototype.close = jest.fn().mockResolvedValue(undefined);
      mockQueue.prototype.removeRepeatable = jest.fn().mockResolvedValue(undefined);
      
      // Mock Worker constructor
      const mockWorker = jest.fn();
      mockWorker.prototype.close = jest.fn().mockResolvedValue(undefined);
      mockWorker.prototype.on = jest.fn();
      
      // Apply mocks to bullmq
      const bullmq = jest.requireMock('bullmq');
      bullmq.Queue = mockQueue;
      bullmq.Worker = mockWorker;
    });

    it('should create queues in production environment', () => {
      const queue = getFileDeletionQueue();
      expect(queue).not.toBeNull();
      expect(Queue).toHaveBeenCalledWith('file-deletion', expect.any(Object));
    });

    it('should add job to queue in production', async () => {
      const result = await queueFileDeletion('/test/file.wav', 'mat123');
      
      expect(result).toEqual({ id: 'job-123' });
      const queue = getFileDeletionQueue();
      expect(queue?.add).toHaveBeenCalledWith(
        'delete-file',
        {
          filePath: '/test/file.wav',
          materialId: 'mat123',
          attemptedAt: expect.any(String),
        },
        {
          priority: undefined,
          delay: undefined,
        }
      );
    });

    it('should return stats in production', async () => {
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
  });
});