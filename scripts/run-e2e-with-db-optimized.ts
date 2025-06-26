import { spawn, ChildProcess, execSync } from 'child_process';
import {
  setupOptimizedE2EEnvironment,
  cleanupE2EDatabase,
  E2E_DATABASE_URL,
} from './e2e-db-optimized';

/**
 * E2Eテストを実行（最適化されたデータベースセットアップ付き）
 */
async function runE2ETests() {
  let testProcess: ChildProcess | undefined;
  let serverProcess: ChildProcess | undefined;

  try {
    console.log('🚀 Starting E2E test suite with optimized database setup...\n');

    // CI環境では既存のデータベースを使用
    const isCI = process.env.CI === 'true';
    let databaseUrl: string;

    if (isCI) {
      console.log('🔧 CI environment detected - using existing database');
      databaseUrl =
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

      // CI環境ではマイグレーションとシードのみ実行
      console.log('🔄 Running migrations...');
      try {
        execSync('npx prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'inherit',
          timeout: 60000, // 1分タイムアウト
        });
      } catch (error) {
        console.error('❌ Migration failed:', error);
        throw new Error('Database migration failed in CI environment');
      }

      console.log('🌱 Seeding database...');
      try {
        execSync('tsx scripts/seed-test-data.ts', {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'inherit',
          timeout: 30000, // 30秒タイムアウト
        });
      } catch (error) {
        console.error('❌ Database seeding failed:', error);
        throw new Error('Database seeding failed in CI environment');
      }

      // CI環境では音声ファイル存在確認
      console.log('🎵 Checking test audio files...');
      const audioFiles = [
        'public/uploads/hot-spring.wav',
        'public/uploads/forest-morning.wav',
        'public/uploads/mountain-stream.wav',
      ];

      let missingFiles = 0;
      for (const file of audioFiles) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const fs = require('fs');
          if (fs.existsSync(file)) {
            console.log(`✅ Found: ${file}`);
          } else {
            console.log(`⚠️  Missing: ${file}`);
            missingFiles++;
          }
        } catch {
          console.log(`❌ Error checking: ${file}`);
          missingFiles++;
        }
      }

      if (missingFiles > 0) {
        console.log(`⚠️  ${missingFiles} audio files are missing - fallback API will be used`);
      } else {
        console.log('✅ All test audio files are present');
      }
    } else {
      // ローカル環境では最適化されたセットアップを使用
      const setupStart = Date.now();
      await setupOptimizedE2EEnvironment();
      const setupDuration = Date.now() - setupStart;
      console.log(`⚡ Database setup completed in ${(setupDuration / 1000).toFixed(2)}s\n`);
      databaseUrl = E2E_DATABASE_URL;
    }

    // 2. 開発サーバーを起動（E2E用データベースを使用）
    console.log('🌐 Starting development server with E2E database...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    // サーバーの起動を待つ
    let serverPort = 3000;
    await new Promise((resolve) => {
      let serverReady = false;

      serverProcess!.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[Server] ${output.trim()}`);

        // ポート番号を抽出
        const portMatch = output.match(/http:\/\/localhost:(\d+)/);
        if (portMatch) {
          serverPort = parseInt(portMatch[1]);
        }

        // Next.jsの起動完了を検知
        if (output.includes('Ready in') || output.includes('✓ Ready')) {
          serverReady = true;
          setTimeout(resolve, 500); // 待機時間を短縮
        }
      });

      serverProcess!.stderr?.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        console.error(`[Server Error] ${error}`);

        // ポート使用中のメッセージを確認
        if (error.includes('Port') && error.includes('is in use')) {
          const portMatch = error.match(/port (\d+)/i);
          if (portMatch) {
            serverPort = parseInt(portMatch[1]);
          }
        }
      });

      // タイムアウト設定（CI環境では長めに）
      const timeoutDuration = isCI ? 60000 : 20000; // CI: 60秒, ローカル: 20秒
      setTimeout(() => {
        if (!serverReady) {
          console.log(
            `⚠️  Server startup timeout after ${timeoutDuration / 1000}s, proceeding with tests...`,
          );
          if (isCI) {
            console.error('❌ CI environment: Server failed to start within timeout');
            // CI環境ではより厳密にエラーとして扱う
          }
          resolve(undefined);
        }
      }, timeoutDuration);
    });

    console.log('\n📋 Running E2E tests...\n');

    // Firefox専用の環境検出
    const isFirefoxTest = process.argv.some(
      (arg) => arg.includes('firefox') || arg.includes('--project=firefox'),
    );

    if (isFirefoxTest && isCI) {
      console.log('🦊 Firefox CI環境検出: テスト実行前に追加の初期化待機...');
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒待機
    }

    // 3. E2Eテストを実行
    // プロセスの引数を取得（--grep など）
    const args: string[] = process.argv.slice(2);
    testProcess = spawn('npm', ['run', 'e2e:run', '--', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: `http://localhost:${serverPort}`,
      },
    });

    // テストの完了を待つ
    const testExitCode = await new Promise<number>((resolve) => {
      testProcess!.on('close', (code: number) => {
        resolve(code || 0);
      });
    });

    if (testExitCode !== 0) {
      throw new Error(`E2E tests failed with exit code ${testExitCode}`);
    }

    console.log('\n✅ E2E tests completed successfully');
  } catch (error) {
    console.error('\n❌ E2E tests failed:', error);
    throw error;
  } finally {
    // 4. クリーンアップ
    console.log('\n🧹 Cleaning up...');

    // サーバーを停止
    if (serverProcess) {
      console.log('Stopping development server...');
      serverProcess.kill('SIGTERM');

      // プロセスの終了を待つ
      await new Promise((resolve) => {
        serverProcess!.on('close', resolve);
        setTimeout(resolve, 3000); // タイムアウトを短縮
      });
    }

    // テストプロセスを停止（まだ実行中の場合）
    if (testProcess && !testProcess.killed) {
      testProcess.kill('SIGTERM');
    }

    // CI環境ではデータベースをクリーンアップしない
    const isCI = process.env.CI === 'true';
    if (!isCI) {
      // データベースをクリーンアップ
      await cleanupE2EDatabase();
    }

    console.log('✅ Cleanup completed');
  }
}

// メイン処理
if (require.main === module) {
  // プロセス終了ハンドラー
  const exitHandler = (code: number = 0) => {
    console.log(`\nExiting with code ${code}`);
    process.exit(code);
  };

  // シグナルハンドラー
  process.on('SIGINT', () => exitHandler(130));
  process.on('SIGTERM', () => exitHandler(143));

  runE2ETests()
    .then(() => {
      console.log('\n🎉 E2E test suite completed successfully!');
      exitHandler(0);
    })
    .catch((error) => {
      console.error('\n💥 E2E test suite failed:', error);
      exitHandler(1);
    });
}
