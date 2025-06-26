import { spawn, ChildProcess, execSync } from 'child_process';
import { setupOptimizedE2EEnvironment, cleanupE2EDatabase } from './e2e-db-optimized';

/**
 * 統合E2Eテスト実行スクリプト
 * - ローカル環境: 並列実行（複数ワーカー）
 * - CI環境: 安定性重視（単一ワーカー）
 */
async function runE2ETests() {
  let testProcess: ChildProcess | undefined;
  let serverProcess: ChildProcess | undefined;

  try {
    console.log('🚀 Starting E2E test suite...\n');

    // CI環境の検出
    const isCI = process.env.CI === 'true';
    console.log(`🔧 Environment: ${isCI ? 'CI' : 'Local'}`);
    console.log(`🔀 Workers: ${isCI ? '1 (CI mode)' : '4 (parallel mode)'}\n`);

    // 1. データベースセットアップ
    let databaseUrl: string;

    if (isCI) {
      // CI環境では既存のデータベースを使用
      console.log('🗄️  Using existing CI database...');
      databaseUrl =
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

      // マイグレーションとシードを実行
      console.log('🔄 Running migrations...');
      try {
        execSync('npx prisma migrate deploy', {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: 'inherit',
          timeout: 60000,
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
          timeout: 30000,
        });
      } catch (error) {
        console.error('❌ Database seeding failed:', error);
        throw new Error('Database seeding failed in CI environment');
      }
    } else {
      // ローカル環境では最適化されたセットアップを使用
      console.log('🗄️  Setting up optimized E2E database...');
      databaseUrl = await setupOptimizedE2EEnvironment('0');
    }

    // 2. E2Eテストファイルのセットアップ
    console.log('📁 Setting up E2E test files...');
    try {
      execSync('tsx scripts/setup-e2e-files.ts', {
        env: { ...process.env, CI: isCI ? 'true' : 'false' },
        stdio: 'inherit',
      });
    } catch {
      console.log('⚠️  E2E file setup failed or not found, continuing...');
    }

    // 3. 開発サーバーを起動
    console.log('🌐 Starting development server...');
    console.log(`📊 Using database: ${databaseUrl}\n`);

    serverProcess = spawn(
      'npx',
      [
        'concurrently',
        '-n',
        'next,worker',
        '-c',
        'blue,green',
        `"DATABASE_URL=${databaseUrl} NODE_ENV=test npm run dev:next"`,
        `"DATABASE_URL=${databaseUrl} NODE_ENV=test npm run dev:worker"`,
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NODE_ENV: 'test',
        },
        stdio: 'pipe',
        shell: true,
      },
    );

    // サーバーの起動を待つ
    let serverPort = 3000;
    await new Promise((resolve) => {
      let serverReady = false;

      serverProcess!.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!output.trim()) return;

        // ポート番号を抽出
        const portMatch = output.match(/http:\/\/localhost:(\d+)/);
        if (portMatch) {
          serverPort = parseInt(portMatch[1]);
        }

        // Next.jsの起動完了を検知
        if (output.includes('Ready in') || output.includes('✓ Ready')) {
          serverReady = true;
          console.log(`✅ Server ready on http://localhost:${serverPort}`);
          setTimeout(resolve, 500);
        }
      });

      serverProcess!.stderr?.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        if (error && !error.includes('ExperimentalWarning')) {
          console.error(`[Server Error] ${error}`);
        }
      });

      // タイムアウト設定
      const timeoutDuration = isCI ? 60000 : 20000;
      setTimeout(() => {
        if (!serverReady) {
          console.log(`⚠️  Server startup timeout after ${timeoutDuration / 1000}s, proceeding...`);
          resolve(undefined);
        }
      }, timeoutDuration);
    });

    // 4. E2Eテストを実行
    console.log('\n📋 Running E2E tests...\n');

    // 引数の処理
    const args: string[] = process.argv.slice(2);

    // CI環境でのワーカー数設定
    if (isCI && !args.some((arg) => arg.includes('--workers'))) {
      args.push('--workers=1');
    }

    // ローカル環境でプロジェクトが指定されていない場合は全ブラウザを並列実行
    const hasProjectArg = args.some((arg) => arg.includes('--project'));
    if (!hasProjectArg && !isCI) {
      console.log('🌐 Running tests on all browsers in parallel...');
      args.push('--project=chromium', '--project=firefox', '--project=webkit');
    }

    testProcess = spawn('npx', ['playwright', 'test', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: `http://localhost:${serverPort}`,
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
        CI: isCI ? 'true' : 'false',
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

    console.log('\n✅ E2E tests completed successfully!');
  } catch (error) {
    console.error('\n❌ E2E tests failed:', error);
    throw error;
  } finally {
    // 5. クリーンアップ
    console.log('\n🧹 Cleaning up...');

    // サーバーを停止
    if (serverProcess) {
      console.log('Stopping development server...');
      serverProcess.kill('SIGTERM');

      await new Promise((resolve) => {
        serverProcess!.on('close', resolve);
        setTimeout(resolve, 3000);
      });
    }

    // テストプロセスを停止（まだ実行中の場合）
    if (testProcess && !testProcess.killed) {
      testProcess.kill('SIGTERM');
    }

    // データベースのクリーンアップ（ローカル環境のみ）
    if (process.env.CI !== 'true') {
      console.log('Cleaning up E2E database...');
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
