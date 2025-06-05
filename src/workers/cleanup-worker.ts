import { Worker, Queue, Job } from 'bullmq';
import { connection } from '@/lib/redis';
import { AudioMetadataService } from '@/lib/audio-metadata';

export const cleanupQueue = new Queue('file-cleanup', { connection });

// Schedule cleanup jobs
export async function scheduleCleanupJobs() {
  // Add recurring job to cleanup temp files every 15 minutes
  await cleanupQueue.add(
    'cleanup-temp-files',
    {},
    {
      repeat: {
        pattern: '*/15 * * * *', // Cron pattern: every 15 minutes
      },
    },
  );
}

// Define the worker
export const cleanupWorker = new Worker(
  'file-cleanup',
  async (job: Job) => {
    console.log(`🧹 Starting cleanup job: ${job.name}`);

    try {
      const audioMetadataService = new AudioMetadataService();
      await audioMetadataService.cleanupTempFiles();

      const result = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      console.log(`✅ Cleanup job completed: ${job.name}`);
      return result;
    } catch (error) {
      console.error('❌ Cleanup job failed:', error);
      throw error;
    }
  },
  { connection },
);
