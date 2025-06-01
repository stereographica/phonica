import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { deleteFile, cleanupOrphanedFiles } from '@/lib/file-system';
import path from 'path';

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

// 遅延初期化用の変数
let connection: Redis | null = null;
let _fileDeletionQueue: Queue<FileDeletionJobData> | null = null;
let _orphanedFilesCleanupQueue: Queue<OrphanedFilesCleanupJobData> | null = null;
let _fileDeletionWorker: Worker<FileDeletionJobData> | null = null;
let _orphanedFilesCleanupWorker: Worker<OrphanedFilesCleanupJobData> | null = null;

/**
 * Redis接続を取得（遅延初期化）
 */
function getConnection(): Redis | null {
  // テスト環境では常にnullを返す
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  if (!connection) {
    connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

/**
 * ファイル削除キューを取得（遅延初期化）
 */
export function getFileDeletionQueue(): Queue<FileDeletionJobData> | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!_fileDeletionQueue) {
    _fileDeletionQueue = new Queue<FileDeletionJobData>('file-deletion', {
      connection: conn,
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
  }
  return _fileDeletionQueue;
}

/**
 * 孤立ファイルクリーンアップキューを取得（遅延初期化）
 */
export function getOrphanedFilesCleanupQueue(): Queue<OrphanedFilesCleanupJobData> | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!_orphanedFilesCleanupQueue) {
    _orphanedFilesCleanupQueue = new Queue<OrphanedFilesCleanupJobData>(
      'orphaned-files-cleanup',
      {
        connection: conn,
        defaultJobOptions: {
          attempts: 1,
          removeOnComplete: {
            age: 24 * 3600,
            count: 100,
          },
        },
      }
    );
  }
  return _orphanedFilesCleanupQueue;
}

/**
 * ファイル削除ワーカーを取得（遅延初期化）
 */
export function getFileDeletionWorker(): Worker<FileDeletionJobData> | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!_fileDeletionWorker) {
    _fileDeletionWorker = new Worker<FileDeletionJobData>(
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
        connection: conn,
        concurrency: 5, // 同時に5つまでのジョブを処理
      }
    );
  }
  return _fileDeletionWorker;
}

/**
 * 孤立ファイルクリーンアップワーカーを取得（遅延初期化）
 */
export function getOrphanedFilesCleanupWorker(): Worker<OrphanedFilesCleanupJobData> | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!_orphanedFilesCleanupWorker) {
    _orphanedFilesCleanupWorker = new Worker<OrphanedFilesCleanupJobData>(
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
        connection: conn,
        concurrency: 1, // クリーンアップは1つずつ実行
      }
    );
  }
  return _orphanedFilesCleanupWorker;
}

// 互換性のためのエクスポート（deprecated）
export const fileDeletionQueue = getFileDeletionQueue();
export const orphanedFilesCleanupQueue = getOrphanedFilesCleanupQueue();
export const fileDeletionWorker = getFileDeletionWorker();
export const orphanedFilesCleanupWorker = getOrphanedFilesCleanupWorker();

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
  const queue = getFileDeletionQueue();
  
  // テスト環境ではモックジョブを返す
  if (!queue) {
    console.log(`[FileDeletionQueue] Test mode - skipping queue for material ${materialId}`);
    return { 
      id: 'test-job', 
      data: { filePath, materialId, attemptedAt: new Date().toISOString() },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as Job<FileDeletionJobData>;
  }
  
  const job = await queue.add(
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
  const queue = getOrphanedFilesCleanupQueue();
  
  // テスト環境では処理をスキップ
  if (!queue) {
    console.log(`[OrphanedFilesCleanup] Test mode - skipping cleanup schedule`);
    return;
  }
  
  const jobName = 'scheduled-cleanup';
  
  // 既存のスケジュールされたジョブを削除
  await queue.removeRepeatable(jobName, {});
  
  // 新しいスケジュールを設定
  if (options?.repeatInterval) {
    await queue.add(
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
    await queue.add(
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
  const fileDeletionQ = getFileDeletionQueue();
  const orphanedFilesCleanupQ = getOrphanedFilesCleanupQueue();
  
  // テスト環境ではモック統計を返す
  if (!fileDeletionQ || !orphanedFilesCleanupQ) {
    return {
      fileDeletion: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
      orphanedFilesCleanup: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    };
  }
  
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
    fileDeletionQ.getWaitingCount(),
    fileDeletionQ.getActiveCount(),
    fileDeletionQ.getCompletedCount(),
    fileDeletionQ.getFailedCount(),
    orphanedFilesCleanupQ.getWaitingCount(),
    orphanedFilesCleanupQ.getActiveCount(),
    orphanedFilesCleanupQ.getCompletedCount(),
    orphanedFilesCleanupQ.getFailedCount(),
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
  const conn = getConnection();
  const fileDeletionW = getFileDeletionWorker();
  const orphanedFilesCleanupW = getOrphanedFilesCleanupWorker();
  const fileDeletionQ = getFileDeletionQueue();
  const orphanedFilesCleanupQ = getOrphanedFilesCleanupQueue();
  
  // テスト環境では処理をスキップ
  if (!conn || !fileDeletionW || !orphanedFilesCleanupW || !fileDeletionQ || !orphanedFilesCleanupQ) {
    console.log('[Queue] Test mode - skipping worker shutdown');
    return;
  }
  
  await Promise.all([
    fileDeletionW.close(),
    orphanedFilesCleanupW.close(),
    fileDeletionQ.close(),
    orphanedFilesCleanupQ.close(),
    conn.quit(),
  ]);
  
  // 参照をクリア
  _fileDeletionWorker = null;
  _orphanedFilesCleanupWorker = null;
  _fileDeletionQueue = null;
  _orphanedFilesCleanupQueue = null;
  connection = null;
  
  console.log('[Queue] All workers and connections closed');
}