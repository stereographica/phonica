/**
 * @jest-environment node
 */

// Workers module will be imported dynamically in tests

// モックワーカーとリスナーを保存
let mockFileDeletionWorker: { on: jest.Mock };
let mockOrphanedFilesCleanupWorker: { on: jest.Mock };
let mockShutdownWorkers: jest.Mock;
let mockScheduleOrphanedFilesCleanup: jest.Mock;

// file-deletion-queueモジュールのモック - jest.doMockで各テストで設定

// pathモジュールのモックは不要（実際のパスを使用）

describe('workers comprehensive tests', () => {
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

    // workersStartedフラグをリセットするために、モジュールをリセット
    jest.resetModules();

    // モックを再初期化
    mockFileDeletionWorker = {
      on: jest.fn(),
    };
    mockOrphanedFilesCleanupWorker = {
      on: jest.fn(),
    };
    mockShutdownWorkers = jest.fn().mockResolvedValue(undefined);
    mockScheduleOrphanedFilesCleanup = jest.fn().mockResolvedValue(undefined);

    // モジュールを動的にモック
    jest.doMock('../file-deletion-queue', () => ({
      getFileDeletionWorker: jest.fn(() => mockFileDeletionWorker),
      getOrphanedFilesCleanupWorker: jest.fn(() => mockOrphanedFilesCleanupWorker),
      scheduleOrphanedFilesCleanup: mockScheduleOrphanedFilesCleanup,
      shutdownWorkers: mockShutdownWorkers,
    }));

    jest.doMock('../zip-generation-queue', () => ({
      getZipGenerationWorker: jest.fn(() => mockFileDeletionWorker), // Use same mock structure
      shutdownZipGenerationWorker: jest.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock('../file-deletion-queue');
    jest.dontMock('../zip-generation-queue');
    jest.resetModules();
    process.on = originalProcessOn;
    processExitSpy.mockRestore();
  });

  describe('startWorkers', () => {
    it('should start workers successfully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      // ワーカーのイベントハンドラーが設定されたことを確認
      // mockFileDeletionWorker は FileDeletionWorker と ZipGenerationWorker で使用
      expect(mockFileDeletionWorker.on).toHaveBeenCalledTimes(4); // 2 workers × 2 events
      expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));

      // mockOrphanedFilesCleanupWorker は OrphanedFilesCleanupWorker で使用
      expect(mockOrphanedFilesCleanupWorker.on).toHaveBeenCalledTimes(2); // 1 worker × 2 events
      expect(mockOrphanedFilesCleanupWorker.on).toHaveBeenCalledWith(
        'failed',
        expect.any(Function),
      );
      expect(mockOrphanedFilesCleanupWorker.on).toHaveBeenCalledWith(
        'completed',
        expect.any(Function),
      );

      // スケジュールが設定されたことを確認
      expect(mockScheduleOrphanedFilesCleanup).toHaveBeenCalledWith(
        expect.stringContaining('public/uploads/materials'),
        {
          maxAge: 24 * 60 * 60 * 1000,
          dryRun: false,
          repeatInterval: 6 * 60 * 60 * 1000,
        },
      );

      expect(console.log).toHaveBeenCalledWith('[Workers] All queue workers started successfully');
    });

    it('should skip if workers already started', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      // 最初の起動
      await freshStartWorkers();

      jest.clearAllMocks();

      // 2回目の起動試行
      await freshStartWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] Workers already started');
      expect(mockFileDeletionWorker.on).not.toHaveBeenCalled();
    });

    it('should skip if workers are not available', async () => {
      // ワーカーをnullに設定
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fileDeletionQueue = require('../file-deletion-queue');
      fileDeletionQueue.getFileDeletionWorker.mockReturnValue(null);
      fileDeletionQueue.getOrphanedFilesCleanupWorker.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] Workers not available - skipping startup',
      );
    });

    it('should handle errors during startup', async () => {
      // モジュールをリセットして新しいモックを適用
      jest.resetModules();

      // エラーをスローするモックを設定
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn(() => mockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn(() => mockOrphanedFilesCleanupWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockRejectedValue(new Error('Schedule failed')),
        shutdownWorkers: mockShutdownWorkers,
      }));

      jest.doMock('../zip-generation-queue', () => ({
        getZipGenerationWorker: jest.fn(() => mockFileDeletionWorker),
        shutdownZipGenerationWorker: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await expect(freshStartWorkers()).rejects.toThrow('Schedule failed');
      expect(console.error).toHaveBeenCalledWith(
        '[Workers] Failed to start workers:',
        expect.any(Error),
      );

      // モックをリセットして元に戻す
      jest.resetModules();
      jest.dontMock('../file-deletion-queue');
    });

    it('should handle file deletion worker failed event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      // イベントハンドラーを取得して実行
      const failedHandler = mockFileDeletionWorker.on.mock.calls.find(
        (call) => call[0] === 'failed',
      )[1];

      const mockJob = { id: 'job-123' };
      const mockError = new Error('Deletion failed');
      failedHandler(mockJob, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job job-123 failed:',
        mockError,
      );
    });

    it('should handle file deletion worker completed event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      // イベントハンドラーを取得して実行
      const completedHandler = mockFileDeletionWorker.on.mock.calls.find(
        (call) => call[0] === 'completed',
      )[1];

      const mockJob = { id: 'job-123' };
      completedHandler(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job job-123 completed successfully',
      );
    });

    it('should handle orphaned files cleanup worker failed event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      const failedHandler = mockOrphanedFilesCleanupWorker.on.mock.calls.find(
        (call) => call[0] === 'failed',
      )[1];

      const mockJob = { id: 'cleanup-456' };
      const mockError = new Error('Cleanup failed');
      failedHandler(mockJob, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job cleanup-456 failed:',
        mockError,
      );
    });

    it('should handle orphaned files cleanup worker completed event', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      const completedHandler = mockOrphanedFilesCleanupWorker.on.mock.calls.find(
        (call) => call[0] === 'completed',
      )[1];

      const mockJob = { id: 'cleanup-456' };
      completedHandler(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job cleanup-456 completed successfully',
      );
    });
  });

  describe('stopWorkers', () => {
    it('should stop workers successfully', async () => {
      const {
        startWorkers: freshStartWorkers,
        stopWorkers: freshStopWorkers,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../workers');

      // まずワーカーを起動
      await freshStartWorkers();

      jest.clearAllMocks();

      // ワーカーを停止
      await freshStopWorkers();

      expect(mockShutdownWorkers).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[Workers] All queue workers stopped successfully');
    });

    it('should skip if workers not started', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { stopWorkers: freshStopWorkers } = require('../workers');

      await freshStopWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] Workers not started');
      expect(mockShutdownWorkers).not.toHaveBeenCalled();
    });

    it('should handle errors during shutdown', async () => {
      const {
        startWorkers: freshStartWorkers,
        stopWorkers: freshStopWorkers,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../workers');

      // ワーカーを起動
      await freshStartWorkers();

      // shutdownWorkersがエラーをスロー
      mockShutdownWorkers.mockRejectedValue(new Error('Shutdown failed'));

      await expect(freshStopWorkers()).rejects.toThrow('Shutdown failed');
      expect(console.error).toHaveBeenCalledWith(
        '[Workers] Failed to stop workers:',
        expect.any(Error),
      );
    });
  });

  describe('Signal handlers', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      // NODE_ENVを書き込み可能にする
      originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        writable: true,
        configurable: true,
      });
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

      // processイベントリスナーをモック
      const listeners: { [key: string]: (() => void | Promise<void>)[] } = {};
      process.on = jest.fn((event: string, handler: () => void | Promise<void>) => {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
        return process;
      }) as unknown as typeof process.on;

      // モジュールを再読み込みしてシグナルハンドラーを登録
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      // NODE_ENVを元に戻す
      if (originalEnv !== undefined) {
        (process.env as { NODE_ENV?: string }).NODE_ENV = originalEnv;
      }

      // リスナーを取得可能にする
      (process as { __listeners?: typeof listeners }).__listeners = listeners;
    });

    afterEach(() => {
      // NODE_ENVを元に戻す
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });

    it('should handle SIGTERM signal', async () => {
      const listeners = (
        process as { __listeners?: { [key: string]: (() => void | Promise<void>)[] } }
      ).__listeners;
      const sigtermHandler = listeners?.['SIGTERM']?.[0];

      expect(sigtermHandler).toBeDefined();

      // SIGTERMハンドラーを実行
      try {
        await sigtermHandler!();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] SIGTERM received, shutting down workers...',
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle SIGINT signal', async () => {
      const listeners = (
        process as { __listeners?: { [key: string]: (() => void | Promise<void>)[] } }
      ).__listeners;
      const sigintHandler = listeners?.['SIGINT']?.[0];

      expect(sigintHandler).toBeDefined();

      // SIGINTハンドラーを実行
      try {
        await sigintHandler!();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] SIGINT received, shutting down workers...',
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('Worker event handlers edge cases', () => {
    it('should handle failed event with null job', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      const failedHandler = mockFileDeletionWorker.on.mock.calls.find(
        (call) => call[0] === 'failed',
      )[1];

      const mockError = new Error('Job is null');
      failedHandler(null, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job undefined failed:',
        mockError,
      );
    });

    it('should handle orphaned cleanup failed event with undefined job', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      const failedHandler = mockOrphanedFilesCleanupWorker.on.mock.calls.find(
        (call) => call[0] === 'failed',
      )[1];

      const mockError = new Error('Job is undefined');
      failedHandler(undefined, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job undefined failed:',
        mockError,
      );
    });
  });
});
