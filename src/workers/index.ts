import { Worker } from 'bullmq';
import { cleanupWorker, scheduleCleanupJobs } from './cleanup-worker';

export class WorkerManager {
  private workers: Worker[] = [];

  async start() {
    console.log('🚀 Starting batch worker processes...');

    // Schedule cleanup jobs
    await scheduleCleanupJobs();
    console.log('📅 Scheduled cleanup jobs');

    // Add cleanup worker
    this.workers.push(cleanupWorker);

    // Register graceful shutdown handlers
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    console.log('✅ All workers started successfully');
  }

  private async shutdown() {
    console.log('📦 Shutting down workers...');

    try {
      // Close all workers
      await Promise.all(this.workers.map((worker) => worker.close()));
      console.log('✅ All workers closed successfully');
    } catch (error) {
      console.error('❌ Error closing workers:', error);
    }

    process.exit(0);
  }
}

// Entry point when running as standalone process
if (require.main === module) {
  const manager = new WorkerManager();
  manager.start().catch((error) => {
    console.error('❌ Failed to start worker manager:', error);
    process.exit(1);
  });
}
