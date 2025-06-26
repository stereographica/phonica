import { existsSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * E2Eテストで生成されたファイルをクリーンアップする
 */
export function cleanupE2EFiles() {
  console.log('🧹 Cleaning up E2E test files...\n');

  const cleanupTasks = [
    {
      name: 'Seed data audio files',
      path: 'public/uploads',
      pattern: /\.(wav|mp3|flac)$/,
      excludeDir: ['materials'], // materialsディレクトリは除外
    },
    {
      name: 'Test audio file',
      path: 'e2e/fixtures',
      files: ['test-audio.wav'],
    },
  ];

  let totalCleaned = 0;

  for (const task of cleanupTasks) {
    if (task.pattern && task.path) {
      // パターンマッチでファイルを削除
      const dirPath = join(process.cwd(), task.path);
      if (existsSync(dirPath)) {
        try {
          const files = readdirSync(dirPath);
          let cleaned = 0;

          for (const file of files) {
            // 除外ディレクトリはスキップ
            if (task.excludeDir?.includes(file)) {
              continue;
            }

            if (task.pattern.test(file)) {
              const filePath = join(dirPath, file);
              try {
                rmSync(filePath, { force: true });
                cleaned++;
              } catch (error) {
                console.warn(`⚠️  Failed to delete ${file}:`, error);
              }
            }
          }

          if (cleaned > 0) {
            console.log(`✅ Cleaned ${cleaned} ${task.name} from ${task.path}`);
            totalCleaned += cleaned;
          }
        } catch (error) {
          console.warn(`⚠️  Failed to clean ${task.name}:`, error);
        }
      }
    } else if (task.files && task.path) {
      // 特定のファイルを削除
      for (const file of task.files) {
        const filePath = join(process.cwd(), task.path, file);
        if (existsSync(filePath)) {
          try {
            rmSync(filePath, { force: true });
            console.log(`✅ Cleaned ${file} from ${task.path}`);
            totalCleaned++;
          } catch (error) {
            console.warn(`⚠️  Failed to delete ${file}:`, error);
          }
        }
      }
    }
  }

  if (totalCleaned === 0) {
    console.log('ℹ️  No E2E test files to clean up');
  } else {
    console.log(`\n🎉 Cleaned up ${totalCleaned} E2E test files`);
  }
}

// スタンドアロン実行用
if (require.main === module) {
  cleanupE2EFiles();
}
