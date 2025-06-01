/**
 * @jest-environment node
 */

import { startWorkers, stopWorkers } from '../workers';

// Mock the file-deletion-queue module
jest.mock('../file-deletion-queue', () => {
  // Create mock implementations
  const mockWorker = null;
  const mockShutdownWorkers = jest.fn().mockResolvedValue(undefined);
  
  return {
    getFileDeletionWorker: jest.fn().mockReturnValue(mockWorker),
    getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(mockWorker),
    scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
    shutdownWorkers: mockShutdownWorkers,
  };
});

describe('Workers - Test Environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('startWorkers', () => {
    it('should skip startup in test environment when workers are null', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await startWorkers();
      
      expect(consoleSpy).toHaveBeenCalledWith('[Workers] Workers not available - skipping startup');
    });
  });

  describe('stopWorkers', () => {
    it('should handle stop when workers not started', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await stopWorkers();
      
      expect(consoleSpy).toHaveBeenCalledWith('[Workers] Workers not started');
    });
  });
});

// Additional tests for production behavior with different mocks
describe('Workers - Production Environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should handle worker functionality when available', async () => {
    // Re-mock with actual worker objects
    jest.doMock('../file-deletion-queue', () => {
      const mockWorkerObj = {
        on: jest.fn(),
      };
      
      return {
        getFileDeletionWorker: jest.fn().mockReturnValue(mockWorkerObj),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(mockWorkerObj),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      };
    });

    // Re-import to get fresh module
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startWorkers: startWorkersNew } = require('../workers');
    
    const consoleSpy = jest.spyOn(console, 'log');
    
    await startWorkersNew();
    
    expect(consoleSpy).toHaveBeenCalledWith('[Workers] All queue workers started successfully');
  });
});