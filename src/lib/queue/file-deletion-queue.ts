import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { deleteFile, cleanupOrphanedFiles } from '@/lib/file-system';
import path from 'path';

// Redis接続設定
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// ファイル削除ジョブのデータ型
export interface FileDeletionJobData {
  filePath: string;
  materialId: string;
  attemptedAt: string;
  retryCount?: number;
}

// 孤立ファイルクリーンアップジョブのデータ型
export interface OrphanedFilesCleanupJobData {
  uploadsDir: string;
  maxAge?: number;
  dryRun?: boolean;
}

// キューの定義
export const fileDeletionQueue = new Queue<FileDeletionJobData>('file-deletion', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2秒から開始
    },
    removeOnComplete: {
      age: 24 * 3600, // 24時間後に完了したジョブを削除
      count: 1000, // 最新1000件は保持
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7日後に失敗したジョブを削除
    },
  },
});

export const orphanedFilesCleanupQueue = new Queue<OrphanedFilesCleanupJobData>(
  'orphaned-files-cleanup',
  {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: {
        age: 24 * 3600,
        count: 100,
      },
    },
  }
);

// ファイル削除ワーカー
export const fileDeletionWorker = new Worker<FileDeletionJobData>(
  'file-deletion',
  async (job: Job<FileDeletionJobData>) => {
    const { filePath, materialId } = job.data;
    const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
    
    console.log(`[FileDeletionWorker] Processing job ${job.id} for material ${materialId}`);
    
    try {
      await deleteFile(filePath, {
        allowedBaseDir: uploadsBaseDir,
        materialId,
      });
      
      console.log(`[FileDeletionWorker] Successfully deleted file: ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      console.error(`[FileDeletionWorker] Failed to delete file: ${filePath}`, error);
      
      // 最後の試行の場合は、ファイルを.failed_サフィックスでマーク
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        try {
          const fs = await import('fs/promises');
          await fs.rename(filePath, `${filePath}.failed_${Date.now()}`);
          console.log(`[FileDeletionWorker] Marked failed file: ${filePath}`);
        } catch (markError) {
          console.error(`[FileDeletionWorker] Failed to mark file as failed:`, markError);
        }
      }
      
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // 同時に5つまでのジョブを処理
  }
);

// 孤立ファイルクリーンアップワーカー
export const orphanedFilesCleanupWorker = new Worker<OrphanedFilesCleanupJobData>(
  'orphaned-files-cleanup',
  async (job: Job<OrphanedFilesCleanupJobData>) => {
    const { uploadsDir, maxAge, dryRun } = job.data;
    
    console.log(`[OrphanedFilesCleanupWorker] Starting cleanup for ${uploadsDir}`);
    
    try {
      const deletedFiles = await cleanupOrphanedFiles(uploadsDir, {
        maxAge,
        dryRun,
      });
      
      console.log(
        `[OrphanedFilesCleanupWorker] Cleanup completed. ` +
        `${deletedFiles.length} files ${dryRun ? 'would be' : 'were'} deleted.`
      );
      
      return { 
        success: true, 
        deletedCount: deletedFiles.length,
        deletedFiles,
        dryRun: !!dryRun,
      };
    } catch (error) {
      console.error(`[OrphanedFilesCleanupWorker] Cleanup failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // クリーンアップは1つずつ実行
  }
);

/**
 * ファイル削除をキューに追加
 */
export async function queueFileDeletion(
  filePath: string,
  materialId: string,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<Job<FileDeletionJobData>> {
  const job = await fileDeletionQueue.add(
    'delete-file',
    {
      filePath,
      materialId,
      attemptedAt: new Date().toISOString(),
    },
    {
      priority: options?.priority,
      delay: options?.delay,
    }
  );
  
  console.log(`[FileDeletionQueue] Queued deletion job ${job.id} for material ${materialId}`);
  return job;
}

/**
 * 孤立ファイルクリーンアップをスケジュール
 */
export async function scheduleOrphanedFilesCleanup(
  uploadsDir: string,
  options?: {
    maxAge?: number;
    dryRun?: boolean;
    repeatInterval?: number; // ミリ秒単位
  }
): Promise<void> {
  const jobName = 'scheduled-cleanup';
  
  // 既存のスケジュールされたジョブを削除
  await orphanedFilesCleanupQueue.removeRepeatable(jobName, {});
  
  // 新しいスケジュールを設定
  if (options?.repeatInterval) {
    await orphanedFilesCleanupQueue.add(
      jobName,
      {
        uploadsDir,
        maxAge: options.maxAge,
        dryRun: options.dryRun,
      },
      {
        repeat: {
          every: options.repeatInterval,
        },
      }
    );
    
    console.log(
      `[OrphanedFilesCleanup] Scheduled cleanup every ${options.repeatInterval}ms`
    );
  } else {
    // 1回だけ実行
    await orphanedFilesCleanupQueue.add(
      'one-time-cleanup',
      {
        uploadsDir,
        maxAge: options?.maxAge,
        dryRun: options?.dryRun,
      }
    );
    
    console.log(`[OrphanedFilesCleanup] Scheduled one-time cleanup`);
  }
}

/**
 * キューの統計情報を取得
 */
export async function getQueueStats() {
  const [
    deletionWaiting,
    deletionActive,
    deletionCompleted,
    deletionFailed,
    cleanupWaiting,
    cleanupActive,
    cleanupCompleted,
    cleanupFailed,
  ] = await Promise.all([
    fileDeletionQueue.getWaitingCount(),
    fileDeletionQueue.getActiveCount(),
    fileDeletionQueue.getCompletedCount(),
    fileDeletionQueue.getFailedCount(),
    orphanedFilesCleanupQueue.getWaitingCount(),
    orphanedFilesCleanupQueue.getActiveCount(),
    orphanedFilesCleanupQueue.getCompletedCount(),
    orphanedFilesCleanupQueue.getFailedCount(),
  ]);
  
  return {
    fileDeletion: {
      waiting: deletionWaiting,
      active: deletionActive,
      completed: deletionCompleted,
      failed: deletionFailed,
    },
    orphanedFilesCleanup: {
      waiting: cleanupWaiting,
      active: cleanupActive,
      completed: cleanupCompleted,
      failed: cleanupFailed,
    },
  };
}

/**
 * ワーカーを適切にシャットダウン
 */
export async function shutdownWorkers(): Promise<void> {
  await Promise.all([
    fileDeletionWorker.close(),
    orphanedFilesCleanupWorker.close(),
    fileDeletionQueue.close(),
    orphanedFilesCleanupQueue.close(),
    connection.quit(),
  ]);
  
  console.log('[Queue] All workers and connections closed');
}