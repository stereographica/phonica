// Mock dependencies first
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    maxRetriesPerRequest: null,
  }));
});

jest.mock('bullmq', () => {
  const mockQueue = jest.fn();
  const mockWorker = jest.fn();
  
  mockQueue.prototype.add = jest.fn();
  mockQueue.prototype.getWaitingCount = jest.fn();
  mockQueue.prototype.getActiveCount = jest.fn();
  mockQueue.prototype.getCompletedCount = jest.fn();
  mockQueue.prototype.getFailedCount = jest.fn();
  mockQueue.prototype.close = jest.fn();
  mockQueue.prototype.removeRepeatable = jest.fn();
  
  mockWorker.prototype.close = jest.fn();
  
  return {
    Queue: mockQueue,
    Worker: mockWorker,
    Job: jest.fn(),
  };
});

jest.mock('../../file-system');

import { Worker } from 'bullmq';
import {
  fileDeletionQueue,
  orphanedFilesCleanupQueue,
  fileDeletionWorker,
  orphanedFilesCleanupWorker,
  queueFileDeletion,
  scheduleOrphanedFilesCleanup,
  getQueueStats,
  shutdownWorkers,
} from '../file-deletion-queue';

describe('File Deletion Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queueFileDeletion', () => {
    it('should add a file deletion job to the queue', async () => {
      const mockJob = { id: 'job-123' };
      (fileDeletionQueue.add as jest.Mock).mockResolvedValue(mockJob);

      const result = await queueFileDeletion('/test/file.wav', 'mat123');

      expect(fileDeletionQueue.add).toHaveBeenCalledWith(
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
      expect(result).toBe(mockJob);
    });

    it('should add a job with custom options', async () => {
      const mockJob = { id: 'job-456' };
      (fileDeletionQueue.add as jest.Mock).mockResolvedValue(mockJob);

      await queueFileDeletion('/test/file.wav', 'mat123', {
        priority: 1,
        delay: 5000,
      });

      expect(fileDeletionQueue.add).toHaveBeenCalledWith(
        'delete-file',
        expect.any(Object),
        {
          priority: 1,
          delay: 5000,
        }
      );
    });
  });

  describe('scheduleOrphanedFilesCleanup', () => {
    it('should schedule a repeating cleanup job', async () => {
      await scheduleOrphanedFilesCleanup('/uploads', {
        maxAge: 86400000,
        repeatInterval: 3600000,
      });

      expect(orphanedFilesCleanupQueue.removeRepeatable).toHaveBeenCalledWith(
        'scheduled-cleanup',
        {}
      );
      expect(orphanedFilesCleanupQueue.add).toHaveBeenCalledWith(
        'scheduled-cleanup',
        {
          uploadsDir: '/uploads',
          maxAge: 86400000,
          dryRun: undefined,
        },
        {
          repeat: {
            every: 3600000,
          },
        }
      );
    });

    it('should schedule a one-time cleanup job', async () => {
      await scheduleOrphanedFilesCleanup('/uploads', {
        maxAge: 86400000,
        dryRun: true,
      });

      expect(orphanedFilesCleanupQueue.add).toHaveBeenCalledWith(
        'one-time-cleanup',
        {
          uploadsDir: '/uploads',
          maxAge: 86400000,
          dryRun: true,
        }
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      // Clear any previous mock implementations
      jest.clearAllMocks();
      
      // Set up the mocks with explicit return values
      (fileDeletionQueue.getWaitingCount as jest.Mock).mockResolvedValueOnce(5);
      (fileDeletionQueue.getActiveCount as jest.Mock).mockResolvedValueOnce(2);
      (fileDeletionQueue.getCompletedCount as jest.Mock).mockResolvedValueOnce(100);
      (fileDeletionQueue.getFailedCount as jest.Mock).mockResolvedValueOnce(3);
      
      (orphanedFilesCleanupQueue.getWaitingCount as jest.Mock).mockResolvedValueOnce(1);
      (orphanedFilesCleanupQueue.getActiveCount as jest.Mock).mockResolvedValueOnce(0);
      (orphanedFilesCleanupQueue.getCompletedCount as jest.Mock).mockResolvedValueOnce(10);
      (orphanedFilesCleanupQueue.getFailedCount as jest.Mock).mockResolvedValueOnce(0);

      const stats = await getQueueStats();

      expect(stats).toEqual({
        fileDeletion: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
        },
        orphanedFilesCleanup: {
          waiting: 1,
          active: 0,
          completed: 10,
          failed: 0,
        },
      });
    });
  });

  describe('shutdownWorkers', () => {
    it('should close all workers and connections', async () => {
      (fileDeletionWorker.close as jest.Mock).mockResolvedValue(undefined);
      (orphanedFilesCleanupWorker.close as jest.Mock).mockResolvedValue(undefined);
      (fileDeletionQueue.close as jest.Mock).mockResolvedValue(undefined);
      (orphanedFilesCleanupQueue.close as jest.Mock).mockResolvedValue(undefined);

      // Mock the console.log
      jest.spyOn(console, 'log').mockImplementation();

      await shutdownWorkers();

      expect(fileDeletionWorker.close).toHaveBeenCalled();
      expect(orphanedFilesCleanupWorker.close).toHaveBeenCalled();
      expect(fileDeletionQueue.close).toHaveBeenCalled();
      expect(orphanedFilesCleanupQueue.close).toHaveBeenCalled();
      // Redis quit is called through the mocked connection
    });
  });

  describe.skip('Worker behavior', () => {
    // These tests are skipped due to module-level initialization
    // See issue #36 for details on the refactoring needed
    it('should handle file deletion worker logic', async () => {
      // This test would require more complex setup to test the actual worker logic
      // For now, we just verify the worker is created
      expect(Worker).toHaveBeenCalledWith(
        'file-deletion',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });

    it('should handle cleanup worker logic', async () => {
      // Verify cleanup worker is created
      expect(Worker).toHaveBeenCalledWith(
        'orphaned-files-cleanup',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 1,
        })
      );
    });
  });

  describe('Edge cases', () => {
    describe('queueFileDeletion edge cases', () => {
      it('should handle empty file path', async () => {
        const mockJob = { id: 'job-empty' };
        (fileDeletionQueue.add as jest.Mock).mockResolvedValue(mockJob);
        
        // Empty path is allowed by the implementation
        const result = await queueFileDeletion('', 'mat123');
        expect(result).toBe(mockJob);
      });

      it('should handle very long file paths', async () => {
        const longPath = '/'.repeat(1000) + 'file.wav';
        const mockJob = { id: 'job-long' };
        (fileDeletionQueue.add as jest.Mock).mockResolvedValue(mockJob);

        const result = await queueFileDeletion(longPath, 'mat123');
        expect(result).toBe(mockJob);
      });

      it('should handle special characters in file path', async () => {
        const specialPath = '/uploads/file with spaces & special@chars!.wav';
        const mockJob = { id: 'job-special' };
        (fileDeletionQueue.add as jest.Mock).mockResolvedValue(mockJob);

        const result = await queueFileDeletion(specialPath, 'mat123');
        expect(result).toBe(mockJob);
      });

      it('should handle queue addition failure', async () => {
        (fileDeletionQueue.add as jest.Mock).mockRejectedValue(new Error('Queue full'));

        await expect(queueFileDeletion('/test/file.wav', 'mat123'))
          .rejects.toThrow('Queue full');
      });
    });

    describe('scheduleOrphanedFilesCleanup edge cases', () => {
      it('should handle removeRepeatable failure', async () => {
        (orphanedFilesCleanupQueue.removeRepeatable as jest.Mock)
          .mockRejectedValue(new Error('Redis error'));

        await expect(scheduleOrphanedFilesCleanup('/uploads', {
          repeatInterval: 3600000,
        })).rejects.toThrow('Redis error');
      });

      it('should handle zero repeat interval', async () => {
        // Reset mocks for this specific test
        (orphanedFilesCleanupQueue.removeRepeatable as jest.Mock).mockResolvedValue(undefined);
        (orphanedFilesCleanupQueue.add as jest.Mock).mockResolvedValue({ id: 'cleanup-zero' });
        
        await scheduleOrphanedFilesCleanup('/uploads', {
          repeatInterval: 0,
        });

        // Should create one-time job instead
        expect(orphanedFilesCleanupQueue.add).toHaveBeenCalledWith(
          'one-time-cleanup',
          expect.any(Object)
        );
      });
    });

    describe('getQueueStats edge cases', () => {
      it('should handle partial failures in stats retrieval', async () => {
        (fileDeletionQueue.getWaitingCount as jest.Mock).mockResolvedValue(5);
        (fileDeletionQueue.getActiveCount as jest.Mock).mockRejectedValue(new Error('Redis timeout'));
        
        await expect(getQueueStats()).rejects.toThrow('Redis timeout');
      });

      it('should handle all queues being empty', async () => {
        jest.clearAllMocks();
        
        (fileDeletionQueue.getWaitingCount as jest.Mock).mockResolvedValueOnce(0);
        (fileDeletionQueue.getActiveCount as jest.Mock).mockResolvedValueOnce(0);
        (fileDeletionQueue.getCompletedCount as jest.Mock).mockResolvedValueOnce(0);
        (fileDeletionQueue.getFailedCount as jest.Mock).mockResolvedValueOnce(0);
        (orphanedFilesCleanupQueue.getWaitingCount as jest.Mock).mockResolvedValueOnce(0);
        (orphanedFilesCleanupQueue.getActiveCount as jest.Mock).mockResolvedValueOnce(0);
        (orphanedFilesCleanupQueue.getCompletedCount as jest.Mock).mockResolvedValueOnce(0);
        (orphanedFilesCleanupQueue.getFailedCount as jest.Mock).mockResolvedValueOnce(0);

        const stats = await getQueueStats();

        expect(stats.fileDeletion).toEqual({
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        });
      });
    });

    describe('shutdownWorkers edge cases', () => {
      // Skip these tests due to Redis connection mocking issues
      // Will be fixed with issue #36
      it.skip('should handle partial shutdown failures', async () => {
        (fileDeletionWorker.close as jest.Mock).mockRejectedValue(new Error('Worker busy'));
        (orphanedFilesCleanupWorker.close as jest.Mock).mockResolvedValue(undefined);
        (fileDeletionQueue.close as jest.Mock).mockResolvedValue(undefined);
        (orphanedFilesCleanupQueue.close as jest.Mock).mockResolvedValue(undefined);

        // Promise.all will reject if any promise rejects
        await expect(shutdownWorkers()).rejects.toThrow('Worker busy');
      });

      it.skip('should handle all closures failing', async () => {
        // Skip this test due to Redis connection mocking issues
        // Will be fixed with issue #36
        const mockError = new Error('Close failed');
        (fileDeletionWorker.close as jest.Mock).mockRejectedValue(mockError);
        (orphanedFilesCleanupWorker.close as jest.Mock).mockRejectedValue(mockError);
        (fileDeletionQueue.close as jest.Mock).mockRejectedValue(mockError);
        (orphanedFilesCleanupQueue.close as jest.Mock).mockRejectedValue(mockError);

        await expect(shutdownWorkers()).rejects.toThrow('Close failed');
      });
    });
  });
});