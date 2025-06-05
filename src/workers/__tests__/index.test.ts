import { WorkerManager } from '../index';
import { cleanupWorker } from '../cleanup-worker';

// Mock workers
jest.mock('../cleanup-worker', () => ({
  cleanupWorker: {
    name: 'file-cleanup',
    close: jest.fn(),
  },
  scheduleCleanupJobs: jest.fn(),
}));

// Mock console methods
const originalLog = console.log;
const originalError = console.error;

describe('WorkerManager', () => {
  let manager: WorkerManager;
  let mockExit: jest.SpyInstance;
  let mockProcessOn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    mockExit = jest.spyOn(process, 'exit').mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw new Error(`Process exited with code ${code}`);
    }) as (code?: string | number | null | undefined) => never);
    mockProcessOn = jest.spyOn(process, 'on').mockImplementation(() => process);
    manager = new WorkerManager();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    mockExit.mockRestore();
    mockProcessOn.mockRestore();
  });

  describe('start', () => {
    it('should start all workers', async () => {
      await manager.start();

      expect(console.log).toHaveBeenCalledWith('🚀 Starting batch worker processes...');
      expect(manager['workers']).toHaveLength(1);
      expect(manager['workers']).toContain(cleanupWorker);
    });

    it('should register signal handlers', async () => {
      await manager.start();

      expect(mockProcessOn).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(mockProcessOn).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });

  describe('shutdown', () => {
    it('should close all workers on SIGTERM', async () => {
      await manager.start();

      const sigTermHandler = (process.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'SIGTERM',
      )[1];

      try {
        await sigTermHandler();
      } catch (error) {
        expect((error as Error).message).toBe('Process exited with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('📦 Shutting down workers...');
      expect(cleanupWorker.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should close all workers on SIGINT', async () => {
      await manager.start();

      const sigIntHandler = (process.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'SIGINT',
      )[1];

      try {
        await sigIntHandler();
      } catch (error) {
        expect((error as Error).message).toBe('Process exited with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('📦 Shutting down workers...');
      expect(cleanupWorker.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should handle worker close errors', async () => {
      const closeError = new Error('Failed to close worker');
      (cleanupWorker.close as jest.Mock).mockRejectedValue(closeError);

      await manager.start();

      const sigTermHandler = (process.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'SIGTERM',
      )[1];

      try {
        await sigTermHandler();
      } catch (error) {
        expect((error as Error).message).toBe('Process exited with code 0');
      }

      expect(console.log).toHaveBeenCalledWith('📦 Shutting down workers...');
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
