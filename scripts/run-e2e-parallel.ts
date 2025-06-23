import { spawn, ChildProcess } from 'child_process';

/**
 * 並列E2Eテストを実行（Worker毎に独立したデータベース）
 */
async function runParallelE2ETests() {
  let testProcess: ChildProcess | undefined;
  let serverProcess: ChildProcess | undefined;

  try {
    console.log('🚀 Starting parallel E2E test suite with worker-isolated databases...\n');

    // 1. 開発サーバーを起動（メインのデータベースURLは使用しない）
    console.log('🌐 Starting development server for parallel testing...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // データベースURLは各テストでWorker固有のものを使用
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
          setTimeout(resolve, 500);
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

      // タイムアウト設定
      setTimeout(() => {
        if (!serverReady) {
          console.log('⚠️  Server startup timeout, proceeding with tests...');
          resolve(undefined);
        }
      }, 20000);
    });

    console.log('\n📋 Running parallel E2E tests with worker isolation...\n');

    // 2. E2Eテストを実行（並列実行でWorker毎にDB分離）
    const args: string[] = process.argv.slice(2);
    testProcess = spawn('npx', ['playwright', 'test', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: `http://localhost:${serverPort}`,
        // Playwright が Worker ID を環境変数で提供
        PLAYWRIGHT_WORKER_INDEX: process.env.PLAYWRIGHT_WORKER_INDEX || '0',
      },
    });

    // テストの完了を待つ
    const testExitCode = await new Promise<number>((resolve) => {
      testProcess!.on('close', (code: number) => {
        resolve(code || 0);
      });
    });

    if (testExitCode !== 0) {
      throw new Error(`Parallel E2E tests failed with exit code ${testExitCode}`);
    }

    console.log('\n✅ Parallel E2E tests completed successfully');
  } catch (error) {
    console.error('\n❌ Parallel E2E tests failed:', error);
    throw error;
  } finally {
    // 3. クリーンアップ
    console.log('\n🧹 Cleaning up...');

    // サーバーを停止
    if (serverProcess) {
      console.log('Stopping development server...');
      serverProcess.kill('SIGTERM');

      // プロセスの終了を待つ
      await new Promise((resolve) => {
        serverProcess!.on('close', resolve);
        setTimeout(resolve, 3000);
      });
    }

    // テストプロセスを停止（まだ実行中の場合）
    if (testProcess && !testProcess.killed) {
      testProcess.kill('SIGTERM');
    }

    console.log('✅ Cleanup completed (databases cleaned up by global teardown)');
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

  runParallelE2ETests()
    .then(() => {
      console.log('\n🎉 Parallel E2E test suite completed successfully!');
      exitHandler(0);
    })
    .catch((error) => {
      console.error('\n💥 Parallel E2E test suite failed:', error);
      exitHandler(1);
    });
}
