/**
 * @jest-environment node
 */

// 注意: jest.mock() はファイルの先頭で行わず、各テストで jest.doMock() を使用します

describe('Workers - Test Environment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Test Environment ではワーカーはnullを返すモック
    jest.doMock('../file-deletion-queue', () => ({
      getFileDeletionWorker: jest.fn(() => null),
      getOrphanedFilesCleanupWorker: jest.fn(() => null),
      scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
      shutdownWorkers: jest.fn().mockResolvedValue(undefined),
    }));

    jest.doMock('../zip-generation-queue', () => ({
      getZipGenerationWorker: jest.fn(() => null), // Also null for test environment
      shutdownZipGenerationWorker: jest.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.dontMock('../file-deletion-queue');
    jest.dontMock('../zip-generation-queue');
  });

  describe('startWorkers', () => {
    it('should skip startup in test environment when workers are null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');
      const consoleSpy = jest.spyOn(console, 'log');

      await freshStartWorkers();

      expect(consoleSpy).toHaveBeenCalledWith('[Workers] Workers not available - skipping startup');
    });
  });

  describe('stopWorkers', () => {
    it('should handle stop when workers not started', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { stopWorkers: freshStopWorkers } = require('../workers');
      const consoleSpy = jest.spyOn(console, 'log');

      await freshStopWorkers();

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
    jest.resetModules();
    jest.dontMock('../file-deletion-queue');
    jest.dontMock('../zip-generation-queue');
  });

  it('should handle worker functionality when available', async () => {
    // Create proper worker mocks
    const mockFileDeletionWorker = {
      on: jest.fn(),
    };
    const mockOrphanedFilesWorker = {
      on: jest.fn(),
    };
    const mockScheduleOrphanedFilesCleanup = jest.fn().mockResolvedValue(undefined);
    const mockShutdownWorkers = jest.fn().mockResolvedValue(undefined);

    // Reset modules completely
    jest.resetModules();
    jest.clearAllMocks();

    // Clear any previous mocks
    jest.dontMock('../file-deletion-queue');
    jest.dontMock('../zip-generation-queue');

    // Mock with actual worker objects
    jest.doMock('../file-deletion-queue', () => ({
      getFileDeletionWorker: jest.fn().mockReturnValue(mockFileDeletionWorker),
      getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(mockOrphanedFilesWorker),
      scheduleOrphanedFilesCleanup: mockScheduleOrphanedFilesCleanup,
      shutdownWorkers: mockShutdownWorkers,
    }));

    // Also mock zip generation worker
    jest.doMock('../zip-generation-queue', () => ({
      getZipGenerationWorker: jest.fn().mockReturnValue(mockFileDeletionWorker), // Use same mock structure
      shutdownZipGenerationWorker: jest.fn().mockResolvedValue(undefined),
    }));

    // Re-import with fresh mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startWorkers: startWorkersNew } = require('../workers');

    const consoleSpy = jest.spyOn(console, 'log');

    await startWorkersNew();

    // When workers are available, expect successful startup
    expect(consoleSpy).toHaveBeenCalledWith('[Workers] All queue workers started successfully');
    expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(mockOrphanedFilesWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(mockOrphanedFilesWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(mockScheduleOrphanedFilesCleanup).toHaveBeenCalled();
  });
});
