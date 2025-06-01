describe('Workers', () => {
  // Mock modules
  const mockFileDeletionWorker = {
    on: jest.fn(),
  };
  const mockOrphanedFilesCleanupWorker = {
    on: jest.fn(),
  };
  const mockScheduleOrphanedFilesCleanup = jest.fn();
  const mockShutdownWorkers = jest.fn();

  jest.doMock('../file-deletion-queue', () => ({
    fileDeletionWorker: mockFileDeletionWorker,
    orphanedFilesCleanupWorker: mockOrphanedFilesCleanupWorker,
    scheduleOrphanedFilesCleanup: mockScheduleOrphanedFilesCleanup,
    shutdownWorkers: mockShutdownWorkers,
  }));

  // Variables to hold the functions
  let startWorkers: () => Promise<void>;
  let stopWorkers: () => Promise<void>;
  
  // Mock console methods
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Reset mock implementations
    mockScheduleOrphanedFilesCleanup.mockResolvedValue(undefined);
    mockShutdownWorkers.mockResolvedValue(undefined);
    
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    
    // Import the module after setting up mocks
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const workers = require('../workers');
    startWorkers = workers.startWorkers;
    stopWorkers = workers.stopWorkers;
  });

  afterEach(() => {
    // Restore console methods
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('startWorkers', () => {
    it('starts all workers successfully', async () => {
      await startWorkers();

      // Check that event handlers were registered
      expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockOrphanedFilesCleanupWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockOrphanedFilesCleanupWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));

      // Check that cleanup was scheduled
      expect(mockScheduleOrphanedFilesCleanup).toHaveBeenCalledWith(
        expect.stringContaining('uploads/materials'),
        {
          maxAge: 24 * 60 * 60 * 1000,
          dryRun: false,
          repeatInterval: 6 * 60 * 60 * 1000,
        }
      );

      expect(mockConsoleLog).toHaveBeenCalledWith('[Workers] All queue workers started successfully');
    });

    it('does not start workers if already started', async () => {
      await startWorkers();
      mockConsoleLog.mockClear();
      mockScheduleOrphanedFilesCleanup.mockClear();
      
      await startWorkers();

      expect(mockConsoleLog).toHaveBeenCalledWith('[Workers] Workers already started');
      expect(mockScheduleOrphanedFilesCleanup).not.toHaveBeenCalled();
    });

    it('handles errors during startup', async () => {
      const error = new Error('Startup failed');
      mockScheduleOrphanedFilesCleanup.mockRejectedValue(error);

      await expect(startWorkers()).rejects.toThrow('Startup failed');
      expect(mockConsoleError).toHaveBeenCalledWith('[Workers] Failed to start workers:', error);
    });
  });

  describe('stopWorkers', () => {
    it('stops all workers successfully', async () => {
      // First start workers
      await startWorkers();
      mockConsoleLog.mockClear();
      mockShutdownWorkers.mockClear();

      await stopWorkers();

      expect(mockShutdownWorkers).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('[Workers] All queue workers stopped successfully');
    });

    it('does not stop workers if not started', async () => {
      await stopWorkers();

      expect(mockConsoleLog).toHaveBeenCalledWith('[Workers] Workers not started');
      expect(mockShutdownWorkers).not.toHaveBeenCalled();
    });

    it('handles errors during shutdown', async () => {
      await startWorkers();
      mockConsoleLog.mockClear();
      
      const error = new Error('Shutdown failed');
      mockShutdownWorkers.mockRejectedValue(error);

      await expect(stopWorkers()).rejects.toThrow('Shutdown failed');
      expect(mockConsoleError).toHaveBeenCalledWith('[Workers] Failed to stop workers:', error);
    });
  });

  describe('Worker event handlers', () => {
    let fileDeletionFailHandler: (job: unknown, err: Error) => void;
    let fileDeletionCompleteHandler: (job: unknown) => void;
    
    beforeEach(async () => {
      await startWorkers();
      
      // Get the registered event handlers
      const failCalls = mockFileDeletionWorker.on.mock.calls;
      const failedCall = failCalls.find(call => call[0] === 'failed');
      fileDeletionFailHandler = failedCall[1];
      
      const completeCalls = mockFileDeletionWorker.on.mock.calls;
      const completedCall = completeCalls.find(call => call[0] === 'completed');
      fileDeletionCompleteHandler = completedCall[1];
      
      mockConsoleLog.mockClear();
      mockConsoleError.mockClear();
    });

    it('handles file deletion worker failure', () => {
      const mockJob = { id: 'test-123' };
      const mockError = new Error('Delete failed');
      
      fileDeletionFailHandler(mockJob, mockError);
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job test-123 failed:',
        mockError
      );
    });

    it('handles file deletion worker completion', () => {
      const mockJob = { id: 'test-456' };
      
      fileDeletionCompleteHandler(mockJob);
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job test-456 completed successfully'
      );
    });
  });

  describe('Process event handlers', () => {
    it('registers shutdown handlers', () => {
      const processSpy = jest.spyOn(process, 'on');
      
      // Import module fresh to register handlers
      jest.resetModules();
      jest.doMock('../file-deletion-queue', () => ({
        fileDeletionWorker: mockFileDeletionWorker,
        orphanedFilesCleanupWorker: mockOrphanedFilesCleanupWorker,
        scheduleOrphanedFilesCleanup: mockScheduleOrphanedFilesCleanup,
        shutdownWorkers: mockShutdownWorkers,
      }));
      
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');
      
      expect(processSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      
      processSpy.mockRestore();
    });
  });
});