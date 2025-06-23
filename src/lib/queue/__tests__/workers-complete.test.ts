/**
 * @jest-environment node
 */

import { startWorkers, stopWorkers } from '../workers';
import {
  getFileDeletionWorker,
  getOrphanedFilesCleanupWorker,
  scheduleOrphanedFilesCleanup,
  shutdownWorkers,
} from '../file-deletion-queue';

// file-deletion-queueモジュールのモック
jest.mock('../file-deletion-queue');

describe('workers - complete coverage', () => {
  let mockFileDeletionWorker: {
    on: jest.Mock;
  };
  let mockOrphanedFilesWorker: {
    on: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});

    // ワーカーのモックを作成
    mockFileDeletionWorker = {
      on: jest.fn(),
    };

    mockOrphanedFilesWorker = {
      on: jest.fn(),
    };

    // モックの戻り値を設定
    (getFileDeletionWorker as jest.Mock).mockReturnValue(mockFileDeletionWorker);
    (getOrphanedFilesCleanupWorker as jest.Mock).mockReturnValue(mockOrphanedFilesWorker);
    (scheduleOrphanedFilesCleanup as jest.Mock).mockResolvedValue(undefined);
    (shutdownWorkers as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock('../file-deletion-queue');
    jest.resetModules();
  });

  describe('startWorkers', () => {
    it('should start workers successfully', async () => {
      await startWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] All queue workers started successfully');
      expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockFileDeletionWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockOrphanedFilesWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockOrphanedFilesWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(scheduleOrphanedFilesCleanup).toHaveBeenCalledWith(
        expect.stringContaining('public/uploads/materials'),
        {
          maxAge: 24 * 60 * 60 * 1000,
          dryRun: false,
          repeatInterval: 6 * 60 * 60 * 1000,
        },
      );
    });

    it('should skip starting when workers already started', async () => {
      // 最初の起動
      await startWorkers();
      jest.clearAllMocks();

      // 2回目の起動
      await startWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] Workers already started');
      expect(scheduleOrphanedFilesCleanup).not.toHaveBeenCalled();
    });

    it('should skip when workers are not available', async () => {
      jest.resetModules();

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue(null),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(null),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] Workers not available - skipping startup',
      );
    });

    it('should handle startup errors', async () => {
      jest.resetModules();

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue(mockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(mockOrphanedFilesWorker),
        scheduleOrphanedFilesCleanup: jest
          .fn()
          .mockRejectedValue(new Error('Failed to schedule cleanup')),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await expect(freshStartWorkers()).rejects.toThrow('Failed to schedule cleanup');
      expect(console.error).toHaveBeenCalledWith(
        '[Workers] Failed to start workers:',
        expect.any(Error),
      );
    });

    it('should handle worker failed events', async () => {
      jest.resetModules();

      // ローカルワーカーモック
      const localMockFileDeletionWorker = {
        on: jest.fn(),
      };
      const localMockOrphanedFilesWorker = {
        on: jest.fn(),
      };

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue(localMockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(localMockOrphanedFilesWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      // Failed イベントハンドラーを取得して実行
      const failedHandler = localMockFileDeletionWorker.on.mock.calls.find(
        (call) => call[0] === 'failed',
      )[1];

      const mockJob = { id: 'job-123' };
      const mockError = new Error('Job processing failed');

      failedHandler(mockJob, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job job-123 failed:',
        mockError,
      );
    });

    it('should handle worker completed events', async () => {
      jest.resetModules();

      // ローカルワーカーモック
      const localMockFileDeletionWorker = {
        on: jest.fn(),
      };
      const localMockOrphanedFilesWorker = {
        on: jest.fn(),
      };

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue(localMockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(localMockOrphanedFilesWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      // Completed イベントハンドラーを取得して実行
      const completedHandler = localMockFileDeletionWorker.on.mock.calls.find(
        (call) => call[0] === 'completed',
      )[1];

      const mockJob = { id: 'job-456' };

      completedHandler(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        '[FileDeletionWorker] Job job-456 completed successfully',
      );
    });

    it('should handle orphaned files cleanup worker failed events', async () => {
      jest.resetModules();

      // ローカルワーカーモック
      const localMockFileDeletionWorker = {
        on: jest.fn(),
      };
      const localMockOrphanedFilesWorker = {
        on: jest.fn(),
      };

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue(localMockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(localMockOrphanedFilesWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      const failedHandler = localMockOrphanedFilesWorker.on.mock.calls.find(
        (call) => call[0] === 'failed',
      )[1];

      const mockJob = { id: 'cleanup-789' };
      const mockError = new Error('Cleanup failed');

      failedHandler(mockJob, mockError);

      expect(console.error).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job cleanup-789 failed:',
        mockError,
      );
    });

    it('should handle orphaned files cleanup worker completed events', async () => {
      jest.resetModules();

      // ローカルワーカーモック
      const localMockFileDeletionWorker = {
        on: jest.fn(),
      };
      const localMockOrphanedFilesWorker = {
        on: jest.fn(),
      };

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue(localMockFileDeletionWorker),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue(localMockOrphanedFilesWorker),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startWorkers: freshStartWorkers } = require('../workers');

      await freshStartWorkers();

      const completedHandler = localMockOrphanedFilesWorker.on.mock.calls.find(
        (call) => call[0] === 'completed',
      )[1];

      const mockJob = { id: 'cleanup-101' };

      completedHandler(mockJob);

      expect(console.log).toHaveBeenCalledWith(
        '[OrphanedFilesCleanupWorker] Job cleanup-101 completed successfully',
      );
    });
  });

  describe('stopWorkers', () => {
    it('should stop workers successfully when started', async () => {
      // まずワーカーを起動
      await startWorkers();
      jest.clearAllMocks();

      // ワーカーを停止
      await stopWorkers();

      expect(shutdownWorkers).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[Workers] All queue workers stopped successfully');
    });

    it('should skip stopping when workers not started', async () => {
      await stopWorkers();

      expect(console.log).toHaveBeenCalledWith('[Workers] Workers not started');
      expect(shutdownWorkers).not.toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      // ワーカーを起動
      await startWorkers();
      jest.clearAllMocks();

      (shutdownWorkers as jest.Mock).mockRejectedValue(new Error('Shutdown failed'));

      await expect(stopWorkers()).rejects.toThrow('Shutdown failed');
      expect(console.error).toHaveBeenCalledWith(
        '[Workers] Failed to stop workers:',
        expect.any(Error),
      );
    });
  });

  describe('process signal handlers', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      // プロセスハンドラーをリセット
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
      // NODE_ENVを書き込み可能にする
      Object.defineProperty(process.env, 'NODE_ENV', {
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
      });
    });

    it('should not register signal handlers in test environment', () => {
      jest.resetModules();
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'test';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      expect(process.listenerCount('SIGTERM')).toBe(0);
      expect(process.listenerCount('SIGINT')).toBe(0);
    });

    it('should register and handle SIGTERM signal', async () => {
      jest.resetModules();
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

      // exitをモック
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue({
          on: jest.fn(),
        }),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue({
          on: jest.fn(),
        }),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      // SIGTERMシグナルを発生させる
      const sigtermHandler = process.listeners('SIGTERM')[0] as () => Promise<void>;

      try {
        await sigtermHandler();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] SIGTERM received, shutting down workers...',
      );
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    it('should register and handle SIGINT signal', async () => {
      jest.resetModules();
      (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      // モジュールをモック
      jest.doMock('../file-deletion-queue', () => ({
        getFileDeletionWorker: jest.fn().mockReturnValue({
          on: jest.fn(),
        }),
        getOrphanedFilesCleanupWorker: jest.fn().mockReturnValue({
          on: jest.fn(),
        }),
        scheduleOrphanedFilesCleanup: jest.fn().mockResolvedValue(undefined),
        shutdownWorkers: jest.fn().mockResolvedValue(undefined),
      }));

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../workers');

      // SIGINTシグナルを発生させる
      const sigintHandler = process.listeners('SIGINT')[0] as () => Promise<void>;

      try {
        await sigintHandler();
      } catch (error) {
        expect((error as Error).message).toBe('process.exit called');
      }

      expect(console.log).toHaveBeenCalledWith(
        '[Workers] SIGINT received, shutting down workers...',
      );
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });
  });
});
