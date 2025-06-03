import { spawn } from 'child_process';
import { setupE2EEnvironment, cleanupE2EEnvironment, E2E_DATABASE_URL } from './e2e-db-setup';

/**
 * E2Eテストを実行（データベースのセットアップ・クリーンアップ付き）
 */
async function runE2ETests() {
  let testProcess: any;
  let serverProcess: any;
  
  try {
    console.log('🚀 Starting E2E test suite with database setup...\n');
    
    // 1. E2E環境のセットアップ
    await setupE2EEnvironment();
    console.log('\n');
    
    // 2. 開発サーバーを起動（E2E用データベースを使用）
    console.log('🌐 Starting development server with E2E database...');
    serverProcess = spawn('npm', ['run', 'dev'], {
      env: {
        ...process.env,
        DATABASE_URL: E2E_DATABASE_URL,
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });
    
    // サーバーの起動を待つ
    let serverPort = 3000;
    await new Promise((resolve) => {
      let serverReady = false;
      
      serverProcess.stdout?.on('data', (data: Buffer) => {
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
          setTimeout(resolve, 3000); // 追加の待機時間を延長
        }
      });
      
      serverProcess.stderr?.on('data', (data: Buffer) => {
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
      }, 30000);
    });
    
    console.log('\n📋 Running E2E tests...\n');
    
    // 3. E2Eテストを実行
    // プロセスの引数を取得（--grep など）
    const args = process.argv.slice(2);
    testProcess = spawn('npm', ['run', 'e2e:run', '--', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: `http://localhost:${serverPort}`,
      },
    });
    
    // テストの完了を待つ
    const testExitCode = await new Promise<number>((resolve) => {
      testProcess.on('close', (code: number) => {
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
        serverProcess.on('close', resolve);
        setTimeout(resolve, 5000); // タイムアウト
      });
    }
    
    // テストプロセスを停止（まだ実行中の場合）
    if (testProcess && !testProcess.killed) {
      testProcess.kill('SIGTERM');
    }
    
    // データベースをクリーンアップ
    await cleanupE2EEnvironment();
    
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