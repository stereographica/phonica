import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

// ZIP生成ジョブのデータ型
export interface ZipGenerationJobData {
  materialIds: string[];
  requestId: string;
  requestedAt: string;
  userId?: string; // 将来的にユーザー認証を追加する場合
}

// ZIP生成結果のデータ型
export interface ZipGenerationResult {
  requestId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  materialCount: number;
  completedAt: string;
  downloadUrl: string;
}

// 遅延初期化用の変数
let connection: Redis | null = null;
let _zipGenerationQueue: Queue<ZipGenerationJobData> | null = null;
let _zipGenerationWorker: Worker<ZipGenerationJobData> | null = null;

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
 * ZIP生成キューを取得（遅延初期化）
 */
export function getZipGenerationQueue(): Queue<ZipGenerationJobData> | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!_zipGenerationQueue) {
    _zipGenerationQueue = new Queue<ZipGenerationJobData>('zip-generation', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5秒から開始
        },
        removeOnComplete: {
          age: 24 * 3600, // 24時間後に完了したジョブを削除
          count: 100, // 最新100件は保持
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7日後に失敗したジョブを削除
        },
      },
    });
  }
  return _zipGenerationQueue;
}

/**
 * ZIP生成ワーカーを取得（遅延初期化）
 */
export function getZipGenerationWorker(): Worker<ZipGenerationJobData> | null {
  const conn = getConnection();
  if (!conn) return null;

  if (!_zipGenerationWorker) {
    _zipGenerationWorker = new Worker<ZipGenerationJobData>(
      'zip-generation',
      async (job: Job<ZipGenerationJobData>) => {
        const { materialIds, requestId } = job.data;

        console.log(`[ZipGenerationWorker] Starting ZIP generation for request ${requestId}`);

        // 素材情報を取得
        const materials = await prisma.material.findMany({
          where: { id: { in: materialIds } },
          select: {
            id: true,
            title: true,
            filePath: true,
            slug: true,
          },
        });

        if (materials.length === 0) {
          throw new Error('No materials found for the given IDs');
        }

        // ZIPファイル保存ディレクトリを作成
        const zipDir = path.join(process.cwd(), 'public', 'downloads', 'zips');
        await fs.mkdir(zipDir, { recursive: true });

        // ZIPファイル名を生成
        const zipFileName = `materials_${requestId}_${Date.now()}.zip`;
        const zipFilePath = path.join(zipDir, zipFileName);

        // アーカイバーを作成
        const output = createWriteStream(zipFilePath);
        const archive = archiver('zip', {
          zlib: { level: 9 }, // 最高圧縮率
        });

        return new Promise<ZipGenerationResult>((resolve, reject) => {
          output.on('close', () => {
            const result: ZipGenerationResult = {
              requestId,
              filePath: zipFilePath,
              fileName: zipFileName,
              fileSize: archive.pointer(),
              materialCount: materials.length,
              completedAt: new Date().toISOString(),
              downloadUrl: `/downloads/zips/${zipFileName}`,
            };
            console.log(`[ZipGenerationWorker] ZIP generation completed: ${result.fileSize} bytes`);
            resolve(result);
          });

          archive.on('error', (err: Error) => {
            console.error('[ZipGenerationWorker] Archive error:', err);
            reject(err);
          });

          archive.pipe(output);

          // 素材ファイルをZIPに追加
          const addFilePromises = materials.map(async (material) => {
            const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
            const filePath = path.join(uploadsBaseDir, material.filePath);

            try {
              await fs.access(filePath);
              // ファイル名を安全な形式に変換
              const safeFileName = `${material.slug}_${path.basename(material.filePath)}`;
              archive.file(filePath, { name: safeFileName });

              // 進捗を更新
              await job.updateProgress(
                ((materials.indexOf(material) + 1) / materials.length) * 100,
              );
            } catch (error) {
              console.warn(`[ZipGenerationWorker] File not found: ${filePath}`, error);
              // ファイルが見つからない場合はエラーメッセージを含むテキストファイルを追加
              archive.append(`File not found: ${material.title}`, {
                name: `${material.slug}_NOT_FOUND.txt`,
              });
            }
          });

          Promise.all(addFilePromises)
            .then(() => {
              archive.finalize();
            })
            .catch(reject);
        });
      },
      {
        connection: conn,
        concurrency: 2, // 同時に2つまでのZIP生成を許可
      },
    );
  }
  return _zipGenerationWorker;
}

/**
 * ZIP生成ジョブをキューに追加
 */
export async function scheduleZipGeneration(materialIds: string[]): Promise<string | null> {
  const queue = getZipGenerationQueue();
  if (!queue) {
    console.warn('[ZipGeneration] Queue not available - skipping ZIP generation');
    return null;
  }

  const requestId = uuidv4();
  const jobData: ZipGenerationJobData = {
    materialIds,
    requestId,
    requestedAt: new Date().toISOString(),
  };

  const job = await queue.add('generate-zip', jobData);
  console.log(`[ZipGeneration] Scheduled ZIP generation job ${job.id} for request ${requestId}`);

  return requestId;
}

/**
 * ZIP生成ジョブのステータスを取得
 */
export async function getZipGenerationStatus(requestId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: ZipGenerationResult;
  error?: string;
} | null> {
  const queue = getZipGenerationQueue();
  if (!queue) return null;

  // すべてのジョブから該当するrequestIdを検索
  const jobs = await queue.getJobs(['waiting', 'active', 'completed', 'failed']);

  for (const job of jobs) {
    if (job.data.requestId === requestId) {
      const state = await job.getState();

      if (state === 'waiting') {
        return { status: 'pending' };
      } else if (state === 'active') {
        return {
          status: 'processing',
          progress: job.progress as number,
        };
      } else if (state === 'completed') {
        return {
          status: 'completed',
          result: job.returnvalue as ZipGenerationResult,
        };
      } else if (state === 'failed') {
        return {
          status: 'failed',
          error: job.failedReason || 'Unknown error',
        };
      }
    }
  }

  return null;
}

/**
 * ワーカーをシャットダウン
 */
export async function shutdownZipGenerationWorker(): Promise<void> {
  if (_zipGenerationWorker) {
    await _zipGenerationWorker.close();
    _zipGenerationWorker = null;
  }
  if (_zipGenerationQueue) {
    await _zipGenerationQueue.close();
    _zipGenerationQueue = null;
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}
