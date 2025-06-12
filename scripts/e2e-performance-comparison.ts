import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceResult {
  method: 'original' | 'optimized';
  totalDuration: number;
  setupDuration: number;
  testDuration: number;
  testResults: {
    passed: number;
    failed: number;
    skipped: number;
  };
  averageTestDuration: number;
  timestamp: Date;
}

/**
 * 元の方法でE2Eテストを実行
 */
async function runOriginalTests(): Promise<PerformanceResult> {
  console.log('🐌 Running E2E tests with ORIGINAL method...\n');
  const startTime = Date.now();
  let setupDuration = 0;
  let testDuration = 0;

  // データベースセットアップ
  const setupStart = Date.now();
  await runCommand('tsx', ['scripts/e2e-db-setup.ts', 'setup']);
  setupDuration = Date.now() - setupStart;

  // テスト実行
  const testStart = Date.now();
  const testResult = await runCommand('npm', ['run', 'e2e:chrome'], {
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://phonica_user:phonica_password@localhost:5432/phonica_e2e_test',
    },
  });
  testDuration = Date.now() - testStart;

  // クリーンアップ
  await runCommand('tsx', ['scripts/e2e-db-setup.ts', 'cleanup']);

  const totalDuration = Date.now() - startTime;

  return {
    method: 'original',
    totalDuration,
    setupDuration,
    testDuration,
    testResults: parseTestResults(testResult),
    averageTestDuration: testDuration / parseTestResults(testResult).passed,
    timestamp: new Date(),
  };
}

/**
 * 最適化された方法でE2Eテストを実行
 */
async function runOptimizedTests(): Promise<PerformanceResult> {
  console.log('🚀 Running E2E tests with OPTIMIZED method...\n');
  const startTime = Date.now();
  let setupDuration = 0;
  let testDuration = 0;

  // 最適化されたデータベースセットアップ
  const setupStart = Date.now();
  await runCommand('tsx', ['scripts/e2e-db-optimized.ts', 'setup']);
  setupDuration = Date.now() - setupStart;

  // テスト実行（並列実行、動的待機、キャッシュ付き）
  const testStart = Date.now();
  const testResult = await runCommand('npm', ['run', 'e2e:chrome'], {
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://phonica_user:phonica_password@localhost:5432/phonica_e2e_test',
    },
  });
  testDuration = Date.now() - testStart;

  // クリーンアップ
  await runCommand('tsx', ['scripts/e2e-db-optimized.ts', 'cleanup']);

  const totalDuration = Date.now() - startTime;

  return {
    method: 'optimized',
    totalDuration,
    setupDuration,
    testDuration,
    testResults: parseTestResults(testResult),
    averageTestDuration: testDuration / parseTestResults(testResult).passed,
    timestamp: new Date(),
  };
}

/**
 * コマンドを実行
 */
function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: Record<string, string> },
): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: 'pipe' as const,
      env: options?.env ? { ...process.env, ...options.env } : process.env,
      cwd: options?.cwd,
    });

    let output = '';
    let errorOutput = '';

    proc.stdout?.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(str);
    });

    proc.stderr?.on('data', (data) => {
      const str = data.toString();
      errorOutput += str;
      process.stderr.write(str);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        resolve(output + errorOutput); // テストが失敗しても結果を返す
      }
    });
  });
}

/**
 * テスト結果を解析
 */
function parseTestResults(output: string): { passed: number; failed: number; skipped: number } {
  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  const skippedMatch = output.match(/(\d+) skipped/);

  return {
    passed: passedMatch ? parseInt(passedMatch[1]) : 0,
    failed: failedMatch ? parseInt(failedMatch[1]) : 0,
    skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
  };
}

/**
 * 比較結果を表示
 */
function displayComparison(original: PerformanceResult, optimized: PerformanceResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 E2E Performance Comparison Results');
  console.log('='.repeat(80));

  // 時間の改善率を計算
  const totalImprovement =
    ((original.totalDuration - optimized.totalDuration) / original.totalDuration) * 100;
  const setupImprovement =
    ((original.setupDuration - optimized.setupDuration) / original.setupDuration) * 100;
  const testImprovement =
    ((original.testDuration - optimized.testDuration) / original.testDuration) * 100;

  console.log('\n⏱️  Execution Time Comparison:');
  console.log('┌─────────────────┬──────────────┬──────────────┬─────────────┐');
  console.log('│     Metric      │   Original   │  Optimized   │ Improvement │');
  console.log('├─────────────────┼──────────────┼──────────────┼─────────────┤');
  console.log(
    `│ Total Duration  │ ${formatTime(original.totalDuration)} │ ${formatTime(optimized.totalDuration)} │ ${formatPercent(totalImprovement)} │`,
  );
  console.log(
    `│ Setup Time      │ ${formatTime(original.setupDuration)} │ ${formatTime(optimized.setupDuration)} │ ${formatPercent(setupImprovement)} │`,
  );
  console.log(
    `│ Test Execution  │ ${formatTime(original.testDuration)} │ ${formatTime(optimized.testDuration)} │ ${formatPercent(testImprovement)} │`,
  );
  console.log('└─────────────────┴──────────────┴──────────────┴─────────────┘');

  console.log('\n📈 Performance Metrics:');
  console.log(`   Original average per test: ${(original.averageTestDuration / 1000).toFixed(2)}s`);
  console.log(
    `   Optimized average per test: ${(optimized.averageTestDuration / 1000).toFixed(2)}s`,
  );
  console.log(`   Speed improvement: ${totalImprovement.toFixed(1)}%`);

  console.log('\n✅ Test Results:');
  console.log(
    `   Original: ${original.testResults.passed} passed, ${original.testResults.failed} failed, ${original.testResults.skipped} skipped`,
  );
  console.log(
    `   Optimized: ${optimized.testResults.passed} passed, ${optimized.testResults.failed} failed, ${optimized.testResults.skipped} skipped`,
  );

  // 目標達成の確認
  console.log('\n🎯 Goal Achievement:');
  if (totalImprovement >= 50) {
    console.log(`   ✅ Goal achieved! ${totalImprovement.toFixed(1)}% improvement (target: 50%)`);
  } else {
    console.log(`   ⚠️  Goal not met. ${totalImprovement.toFixed(1)}% improvement (target: 50%)`);
  }

  // 結果を保存
  const results = {
    original,
    optimized,
    improvement: {
      total: totalImprovement,
      setup: setupImprovement,
      test: testImprovement,
    },
    timestamp: new Date(),
  };

  const resultsDir = path.join(process.cwd(), 'e2e-benchmarks');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const filename = `comparison-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(resultsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${filepath}`);
}

/**
 * 時間をフォーマット
 */
function formatTime(ms: number): string {
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds.padStart(9)}s`;
}

/**
 * パーセンテージをフォーマット
 */
function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`.padStart(11);
}

/**
 * メイン処理
 */
async function main() {
  try {
    console.log('🔬 Starting E2E Performance Comparison...\n');
    console.log(
      'This will run the E2E tests twice: once with the original method and once with optimizations.\n',
    );

    // 元の方法でテスト
    const originalResult = await runOriginalTests();

    console.log('\n' + '-'.repeat(80) + '\n');

    // 最適化された方法でテスト
    const optimizedResult = await runOptimizedTests();

    // 結果を比較
    displayComparison(originalResult, optimizedResult);
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}
