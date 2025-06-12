import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  browser?: string;
}

interface BenchmarkResult {
  totalDuration: number;
  setupDuration: number;
  testDuration: number;
  cleanupDuration: number;
  testResults: TestResult[];
  timestamp: Date;
}

/**
 * E2Eテストのパフォーマンスベンチマークを実行
 */
async function runBenchmark(): Promise<BenchmarkResult> {
  const startTime = Date.now();
  let setupDuration = 0;
  let testDuration = 0;
  let cleanupDuration = 0;
  const testResults: TestResult[] = [];

  console.log('🚀 Starting E2E Performance Benchmark...\n');

  try {
    // 1. データベースセットアップ時間を測定
    const setupStart = Date.now();
    console.log('📊 Measuring database setup time...');

    const setupProcess = spawn('tsx', ['scripts/e2e-db-setup.ts', 'setup'], {
      stdio: 'pipe',
    });

    await new Promise<void>((resolve, reject) => {
      setupProcess.stdout?.on('data', (data) => {
        process.stdout.write(`[Setup] ${data}`);
      });

      setupProcess.stderr?.on('data', (data) => {
        process.stderr.write(`[Setup Error] ${data}`);
      });

      setupProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Setup failed with code ${code}`));
        }
      });
    });

    setupDuration = Date.now() - setupStart;
    console.log(`✅ Database setup completed in ${(setupDuration / 1000).toFixed(2)}s\n`);

    // 2. 開発サーバーを起動
    console.log('🌐 Starting development server...');
    const serverProcess = spawn('npm', ['run', 'dev'], {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://phonica_user:phonica_password@localhost:5432/phonica_e2e_test',
        NODE_ENV: 'test',
      },
      stdio: 'pipe',
    });

    // サーバーの起動を待つ
    const serverPort = 3000;
    await new Promise<void>((resolve) => {
      serverProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Ready in') || output.includes('✓ Ready')) {
          setTimeout(resolve, 1000);
        }
      });

      setTimeout(resolve, 30000); // タイムアウト
    });

    // 3. 各テストファイルの実行時間を測定
    const testStart = Date.now();
    console.log('\n📋 Running E2E tests with performance tracking...\n');

    // JSON レポーターを使用してテスト結果を取得
    const testProcess = spawn('npm', ['run', 'e2e:run', '--', '--reporter=json'], {
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: `http://localhost:${serverPort}`,
      },
      stdio: 'pipe',
    });

    testProcess.stdout?.on('data', (data) => {
      console.log(data.toString());
    });

    testProcess.stderr?.on('data', (data) => {
      process.stderr.write(`[Test Error] ${data}`);
    });

    await new Promise<void>((resolve) => {
      testProcess.on('close', () => {
        resolve();
      });
    });

    testDuration = Date.now() - testStart;

    // JSONレポートを解析
    try {
      const reportPath = path.join(process.cwd(), 'test-results', 'results.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

        // テストごとの実行時間を抽出
        if (report.suites) {
          for (const suite of report.suites) {
            for (const spec of suite.specs || []) {
              for (const test of spec.tests || []) {
                testResults.push({
                  name: `${suite.title} > ${spec.title} > ${test.title}`,
                  duration: test.results?.[0]?.duration || 0,
                  status: test.results?.[0]?.status || 'skipped',
                  browser: test.projectName,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse test results:', error);
    }

    // 4. クリーンアップ時間を測定
    const cleanupStart = Date.now();
    console.log('\n🧹 Measuring cleanup time...');

    // サーバーを停止
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // データベースクリーンアップ
    const cleanupProcess = spawn('tsx', ['scripts/e2e-db-setup.ts', 'cleanup'], {
      stdio: 'pipe',
    });

    await new Promise<void>((resolve) => {
      cleanupProcess.on('close', () => resolve());
    });

    cleanupDuration = Date.now() - cleanupStart;

    const totalDuration = Date.now() - startTime;

    return {
      totalDuration,
      setupDuration,
      testDuration,
      cleanupDuration,
      testResults,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Benchmark failed:', error);
    throw error;
  }
}

/**
 * ベンチマーク結果を表示
 */
function displayResults(result: BenchmarkResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 E2E Performance Benchmark Results');
  console.log('='.repeat(80));

  console.log(`\n📅 Timestamp: ${result.timestamp.toISOString()}`);

  console.log('\n⏱️  Duration Summary:');
  console.log(`   Total:    ${(result.totalDuration / 1000).toFixed(2)}s`);
  console.log(
    `   Setup:    ${(result.setupDuration / 1000).toFixed(2)}s (${((result.setupDuration / result.totalDuration) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Tests:    ${(result.testDuration / 1000).toFixed(2)}s (${((result.testDuration / result.totalDuration) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   Cleanup:  ${(result.cleanupDuration / 1000).toFixed(2)}s (${((result.cleanupDuration / result.totalDuration) * 100).toFixed(1)}%)`,
  );

  if (result.testResults.length > 0) {
    console.log('\n📋 Top 10 Slowest Tests:');
    const slowestTests = result.testResults
      .filter((t) => t.status === 'passed')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    slowestTests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.name} (${test.browser})`);
      console.log(`      Duration: ${(test.duration / 1000).toFixed(2)}s`);
    });

    // ブラウザごとの統計
    console.log('\n🌐 Browser Statistics:');
    const browserStats: Record<string, { count: number; totalDuration: number }> = {};

    result.testResults.forEach((test) => {
      if (test.browser && test.status === 'passed') {
        if (!browserStats[test.browser]) {
          browserStats[test.browser] = { count: 0, totalDuration: 0 };
        }
        browserStats[test.browser].count++;
        browserStats[test.browser].totalDuration += test.duration;
      }
    });

    Object.entries(browserStats).forEach(([browser, stats]) => {
      console.log(`   ${browser}:`);
      console.log(`     Tests: ${stats.count}`);
      console.log(`     Total Duration: ${(stats.totalDuration / 1000).toFixed(2)}s`);
      console.log(`     Average: ${(stats.totalDuration / stats.count / 1000).toFixed(2)}s`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // 結果をファイルに保存
  const benchmarkDir = path.join(process.cwd(), 'e2e-benchmarks');
  if (!fs.existsSync(benchmarkDir)) {
    fs.mkdirSync(benchmarkDir);
  }

  const filename = `benchmark-${result.timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(benchmarkDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`\n💾 Results saved to: ${filepath}`);
}

// メイン処理
if (require.main === module) {
  runBenchmark()
    .then(displayResults)
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
