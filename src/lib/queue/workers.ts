import {
  getFileDeletionWorker,
  getOrphanedFilesCleanupWorker,
  scheduleOrphanedFilesCleanup,
  shutdownWorkers,
} from './file-deletion-queue';
import { getZipGenerationWorker, shutdownZipGenerationWorker } from './zip-generation-queue';
import path from 'path';

// ワーカーが起動しているかのフラグ
let workersStarted = false;

/**
 * すべてのキューワーカーを起動
 */
export async function startWorkers(): Promise<void> {
  if (workersStarted) {
    console.log('[Workers] Workers already started');
    return;
  }

  const fileDeletionWorker = getFileDeletionWorker();
  const orphanedFilesCleanupWorker = getOrphanedFilesCleanupWorker();
  const zipGenerationWorker = getZipGenerationWorker();

  // ワーカーが存在しない場合はスキップ（テスト環境など）
  if (!fileDeletionWorker || !orphanedFilesCleanupWorker || !zipGenerationWorker) {
    console.log('[Workers] Workers not available - skipping startup');
    return;
  }

  try {
    // ワーカーのエラーハンドラーを設定
    fileDeletionWorker.on('failed', (job, err) => {
      console.error(`[FileDeletionWorker] Job ${job?.id} failed:`, err);
    });

    fileDeletionWorker.on('completed', (job) => {
      console.log(`[FileDeletionWorker] Job ${job.id} completed successfully`);
    });

    orphanedFilesCleanupWorker.on('failed', (job, err) => {
      console.error(`[OrphanedFilesCleanupWorker] Job ${job?.id} failed:`, err);
    });

    orphanedFilesCleanupWorker.on('completed', (job) => {
      console.log(`[OrphanedFilesCleanupWorker] Job ${job.id} completed successfully`);
    });

    zipGenerationWorker.on('failed', (job, err) => {
      console.error(`[ZipGenerationWorker] Job ${job?.id} failed:`, err);
    });

    zipGenerationWorker.on('completed', (job) => {
      console.log(`[ZipGenerationWorker] Job ${job.id} completed successfully`);
    });

    // 定期的な孤立ファイルクリーンアップをスケジュール
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
    await scheduleOrphanedFilesCleanup(uploadsDir, {
      maxAge: 24 * 60 * 60 * 1000, // 24時間
      dryRun: false,
      repeatInterval: 6 * 60 * 60 * 1000, // 6時間ごと
    });

    workersStarted = true;
    console.log('[Workers] All queue workers started successfully');
  } catch (error) {
    console.error('[Workers] Failed to start workers:', error);
    throw error;
  }
}

/**
 * すべてのキューワーカーを停止
 */
export async function stopWorkers(): Promise<void> {
  if (!workersStarted) {
    console.log('[Workers] Workers not started');
    return;
  }

  try {
    await shutdownWorkers();
    await shutdownZipGenerationWorker();
    workersStarted = false;
    console.log('[Workers] All queue workers stopped successfully');
  } catch (error) {
    console.error('[Workers] Failed to stop workers:', error);
    throw error;
  }
}

// プロセス終了時のクリーンアップ
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', async () => {
    console.log('[Workers] SIGTERM received, shutting down workers...');
    await stopWorkers();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Workers] SIGINT received, shutting down workers...');
    await stopWorkers();
    process.exit(0);
  });
}
