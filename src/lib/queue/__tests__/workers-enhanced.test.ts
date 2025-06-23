/**
 * @jest-environment node
 */

describe('workers enhanced tests', () => {
  let originalProcessOn: typeof process.on;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // processイベントハンドラーを保存
    originalProcessOn = process.on;
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    jest.dontMock('../file-deletion-queue');
    process.on = originalProcessOn;
    processExitSpy.mockRestore();
  });

  describe('startWorkers - successful startup', () => {
    it('should start workers successfully', async () => {
      const mockWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      // ワーカーのイベントハンドラーが設定されたことを確認
      expect(mockWorker.on).toHaveBeenCalledTimes(4); // 2 workers × 2 events
      expect(console.log).toHaveBeenCalledWith('[Workers] All queue workers started successfully');
    });

    it('should skip if workers already started', async () => {
      const mockWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      // 最初の起動
      await startWorkers();

      jest.clearAllMocks();

      // 2回目の起動試行
      await startWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] Workers already started');
      expect(mockWorker.on).not.toHaveBeenCalled();
    });
  });

  describe('startWorkers - worker not available', () => {
    it('should skip if workers are not available', async () => {
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => null),
        getOrphanedFilesCleanupWorker: jest.fn(() => null),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] Workers not available - skipping startup',
      );
    });
  });

  describe('startWorkers - error handling', () => {
    it('should handle errors during startup', async () => {
      const mockWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockRejectedValue(new Error('Schedule failed')),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await expect(startWorkers()).rejects.toThrow('Schedule failed');
      expect(console.error).toHaveBeenCalledWith(
        '[Workers] Failed to start workers:',
        expect.any(Error),
      );
    });
  });

  describe('worker event handlers', () => {
    it('should handle file deletion worker failed event', async () => {
      const mockWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      // イベントハンドラーを取得して実行
      const failedCall = mockWorker.on.mock.calls.find((call) => call[0] === 'failed');
      expect(failedCall).toBeDefined();

      const failedHandler = failedCall[1];
      const mockJob = { id: 'job-123' };
      const mockError = new Error('Deletion failed');

      failedHandler(mockJob, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job job-123 failed:',
        mockError,
      );
    });

    it('should handle file deletion worker completed event', async () => {
      const mockWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      // completedハンドラーを取得して実行（2番目の呼び出し）
      const completedCall = mockWorker.on.mock.calls[1];
      expect(completedCall[0]).toBe('completed');

      const completedHandler = completedCall[1];
      const mockJob = { id: 'job-123' };

      completedHandler(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job job-123 completed successfully',
      );
    });

    it('should handle worker failed event with null job', async () => {
      const mockWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      const failedCall = mockWorker.on.mock.calls.find((call) => call[0] === 'failed');
      const failedHandler = failedCall[1];
      const mockError = new Error('Job is null');

      failedHandler(null, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job undefined failed:',
        mockError,
      );
    });

    it('should handle orphaned files cleanup worker failed event', async () => {
      const mockFileDeletionWorker = {
        on: jest.fn(),
      };
      const mockOrphanedWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockOrphanedWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      // orphanedFilesCleanupWorkerのfailedハンドラーを取得
      const failedCall = mockOrphanedWorker.on.mock.calls.find((call) => call[0] === 'failed');
      expect(failedCall).toBeDefined();

      const failedHandler = failedCall[1];
      const mockJob = { id: 'cleanup-789' };
      const mockError = new Error('Cleanup failed');

      failedHandler(mockJob, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job cleanup-789 failed:',
        mockError,
      );
    });

    it('should handle orphaned files cleanup worker completed event', async () => {
      const mockFileDeletionWorker = {
        on: jest.fn(),
      };
      const mockOrphanedWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockOrphanedWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      // orphanedFilesCleanupWorkerのcompletedハンドラーを取得
      const completedCall = mockOrphanedWorker.on.mock.calls[1]; // 2番目の呼び出しがcompleted
      expect(completedCall[0]).toBe('completed');

      const completedHandler = completedCall[1];
      const mockJob = { id: 'cleanup-789' };

      completedHandler(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job cleanup-789 completed successfully',
      );
    });

    it('should handle orphaned files cleanup worker failed event with null job', async () => {
      const mockFileDeletionWorker = {
        on: jest.fn(),
      };
      const mockOrphanedWorker = {
        on: jest.fn(),
      };

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockOrphanedWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers } = require('../workers');

      await startWorkers();

      // orphanedFilesCleanupWorkerのfailedハンドラーを取得
      const failedCall = mockOrphanedWorker.on.mock.calls.find((call) => call[0] === 'failed');
      const failedHandler = failedCall[1];
      const mockError = new Error('Job is null');

      // jobがnullの場合
      failedHandler(null, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job undefined failed:',
        mockError,
      );
    });
  });

  describe('stopWorkers', () => {
    it('should stop workers successfully', async () => {
      const mockWorker = {
        on: jest.fn(),
      };
      const mockShutdownWorkers = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: mockShutdownWorkers,
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers, stopWorkers } = require('../workers');

      // まずワーカーを起動
      await startWorkers();

      jest.clearAllMocks();

      // ワーカーを停止
      await stopWorkers();

      expect(mockShutdownWorkers).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[Workers] All queue workers stopped successfully');
    });

    it('should skip if workers not started', async () => {
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => null),
        getOrphanedFilesCleanupWorker: jest.fn(() => null),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { stopWorkers } = require('../workers');

      await stopWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] Workers not started');
    });

    it('should handle errors during shutdown', async () => {
      const mockWorker = {
        on: jest.fn(),
      };
      const mockShutdownWorkers = jest.fn().mockRejectedValue(new Error('Shutdown failed'));

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: mockShutdownWorkers,
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers, stopWorkers } = require('../workers');

      // ワーカーを起動
      await startWorkers();

      await expect(stopWorkers()).rejects.toThrow('Shutdown failed');
      expect(console.error).toHaveBeenCalledWith(
        '[Workers] Failed to stop workers:',
        expect.any(Error),
      );
    });
  });

  describe('Signal handlers', () => {
    beforeEach(() => {
      // NODE_ENVを書き込み可能にする
      Object.defineProperty(process.env, 'NODE_ENV', {
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      // NODE_ENVを元に戻す
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: process.env.NODE_ENV,
        writable: true,
        configurable: true,
      });
    });
    it('should handle SIGTERM signal', async () => {
      // NODE_ENVを一時的に変更
      const originalEnv = process.env.NODE_ENV;
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

      const mockWorker = {
        on: jest.fn(),
      };
      const mockShutdownWorkers = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: mockShutdownWorkers,
      }));

      // processイベントリスナーをモック
      const listeners: { [key: string]: (() => void | Promise<void>)[] } = {};
      process.on = jest.fn((event: string, handler: () => void | Promise<void>) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
        return process;
      }) as unknown as typeof process.on;

      // モジュールをロード（シグナルハンドラーが登録される）
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      // NODE_ENVを元に戻す
      (process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;

      // SIGTERMハンドラーを取得して実行
      const sigtermHandler = listeners['SIGTERM']?.[0];
      expect(sigtermHandler).toBeDefined();

      try {
        await sigtermHandler();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] SIGTERM received, shutting down workers...',
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle SIGINT signal', async () => {
      // NODE_ENVを一時的に変更
      const originalEnv = process.env.NODE_ENV;
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

      const mockWorker = {
        on: jest.fn(),
      };
      const mockShutdownWorkers = jest.fn().mockResolvedValue(undefined);

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: mockShutdownWorkers,
      }));

      // processイベントリスナーをモック
      const listeners: { [key: string]: (() => void | Promise<void>)[] } = {};
      process.on = jest.fn((event: string, handler: () => void | Promise<void>) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
        return process;
      }) as unknown as typeof process.on;

      // モジュールをロード
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      // NODE_ENVを元に戻す
      (process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;

      // SIGINTハンドラーを取得して実行
      const sigintHandler = listeners['SIGINT']?.[0];
      expect(sigintHandler).toBeDefined();

      try {
        await sigintHandler();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] SIGINT received, shutting down workers...',
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should not register signal handlers in test environment', async () => {
      // NODE_ENVがtestの場合
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'test';

      const processOnSpy = jest.spyOn(process, 'on');

      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => null),
        getOrphanedFilesCleanupWorker: jest.fn(() => null),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // モジュールをロード
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      // シグナルハンドラーが登録されていないことを確認
      expect(processOnSpy).not.toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(processOnSpy).not.toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });
});
