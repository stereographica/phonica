// Mock dependencies
jest.mock('../file-deletion-queue', () => ({
  getFileDeletionWorker: jest.fn(),
  getOrphanedFilesCleanupWorker: jest.fn(),
  scheduleOrphanedFilesCleanup: jest.fn(),
  shutdownWorkers: jest.fn(),
}));

import {
  getFileDeletionWorker,
  getOrphanedFilesCleanupWorker,
  scheduleOrphanedFilesCleanup,
  shutdownWorkers,
} from '../file-deletion-queue';
import { startWorkers, stopWorkers } from '../workers';

describe('Workers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startWorkers', () => {
    it('should skip startup when workers are not available', async () => {
      // Mock workers as null (test environment)
      (getFileDeletionWorker as jest.Mock).mockReturnValue(null);
      (getOrphanedFilesCleanupWorker as jest.Mock).mockReturnValue(null);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await startWorkers();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Workers] Workers not available - skipping startup'
      );

      consoleSpy.mockRestore();
    });

    it('should start workers when available', async () => {
      // Mock workers
      const mockFileDeletionWorker = {
        on: jest.fn(),
      };
      const mockOrphanedFilesCleanupWorker = {
        on: jest.fn(),
      };

      (getFileDeletionWorker as jest.Mock).mockReturnValue(mockFileDeletionWorker);
      (getOrphanedFilesCleanupWorker as jest.Mock).mockReturnValue(mockOrphanedFilesCleanupWorker);
      (scheduleOrphanedFilesCleanup as jest.Mock).mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await startWorkers();

      expect(mockFileDeletionWorker.on).toHaveBeenCalledTimes(2);
      expect(mockOrphanedFilesCleanupWorker.on).toHaveBeenCalledTimes(2);
      expect(scheduleOrphanedFilesCleanup).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Workers] All queue workers started successfully'
      );

      consoleSpy.mockRestore();
    });

    it('should not start workers twice', async () => {
      // Mock workers
      const mockWorker = { on: jest.fn() };
      (getFileDeletionWorker as jest.Mock).mockReturnValue(mockWorker);
      (getOrphanedFilesCleanupWorker as jest.Mock).mockReturnValue(mockWorker);
      (scheduleOrphanedFilesCleanup as jest.Mock).mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await startWorkers();
      await startWorkers(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('[Workers] Workers already started');

      consoleSpy.mockRestore();
    });
  });

  describe('stopWorkers', () => {
    it('should skip stop when workers not started', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await stopWorkers();

      expect(consoleSpy).toHaveBeenCalledWith('[Workers] Workers not started');
      expect(shutdownWorkers).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should stop workers when started', async () => {
      // Start workers first
      const mockWorker = { on: jest.fn() };
      (getFileDeletionWorker as jest.Mock).mockReturnValue(mockWorker);
      (getOrphanedFilesCleanupWorker as jest.Mock).mockReturnValue(mockWorker);
      (scheduleOrphanedFilesCleanup as jest.Mock).mockResolvedValue(undefined);
      (shutdownWorkers as jest.Mock).mockResolvedValue(undefined);

      await startWorkers();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await stopWorkers();

      expect(shutdownWorkers).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Workers] All queue workers stopped successfully'
      );

      consoleSpy.mockRestore();
    });
  });
});