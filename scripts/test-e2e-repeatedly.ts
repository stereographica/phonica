#!/usr/bin/env tsx
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MAX_RUNS = 10;
const LOG_DIR = path.join(process.cwd(), 'e2e-test-logs');

// ログディレクトリを作成
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

interface TestResult {
  run: number;
  success: boolean;
  duration: number;
  failedTests: string[];
  output: string;
}

const results: TestResult[] = [];

async function runE2ETests(runNumber: number): Promise<TestResult> {
  console.log(`\n🔄 実行 ${runNumber}/${MAX_RUNS} 開始...`);
  const startTime = Date.now();

  return new Promise((resolve) => {
    const logFile = path.join(LOG_DIR, `run-${runNumber}.log`);
    const logStream = fs.createWriteStream(logFile);

    let output = '';
    const failedTests: string[] = [];

    const process = spawn('npm', ['run', 'e2e'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    const captureOutput = (data: Buffer) => {
      const text = data.toString();
      output += text;
      logStream.write(text);

      // 失敗したテストを抽出
      const failureMatch = text.match(/✘.*?\[(.*?)\].*?›\s*(.*?)$/gm);
      if (failureMatch) {
        failureMatch.forEach((match) => {
          const testMatch = match.match(/\[(.*?)\].*?›\s*(.*)$/);
          if (testMatch) {
            failedTests.push(`[${testMatch[1]}] ${testMatch[2].trim()}`);
          }
        });
      }
    };

    process.stdout.on('data', captureOutput);
    process.stderr.on('data', captureOutput);

    process.on('close', (code) => {
      logStream.end();
      const duration = Date.now() - startTime;
      const success = code === 0;

      const result: TestResult = {
        run: runNumber,
        success,
        duration,
        failedTests: [...new Set(failedTests)], // 重複を削除
        output,
      };

      results.push(result);

      console.log(
        `✅ 実行 ${runNumber} 完了: ${success ? '成功' : '失敗'} (${(duration / 1000).toFixed(1)}秒)`,
      );
      if (!success) {
        console.log(`  失敗したテスト数: ${result.failedTests.length}`);
        result.failedTests.forEach((test) => {
          console.log(`    - ${test}`);
        });
      }

      resolve(result);
    });
  });
}

async function analyzeResults() {
  console.log('\n📊 === 分析結果 ===\n');

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(
    `成功: ${successCount}/${MAX_RUNS} (${((successCount / MAX_RUNS) * 100).toFixed(1)}%)`,
  );
  console.log(
    `失敗: ${failureCount}/${MAX_RUNS} (${((failureCount / MAX_RUNS) * 100).toFixed(1)}%)`,
  );

  // 失敗したテストの統計
  const failureStats: { [key: string]: number } = {};
  results.forEach((result) => {
    if (!result.success) {
      result.failedTests.forEach((test) => {
        failureStats[test] = (failureStats[test] || 0) + 1;
      });
    }
  });

  if (Object.keys(failureStats).length > 0) {
    console.log('\n🔴 失敗したテストの頻度:');
    Object.entries(failureStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([test, count]) => {
        console.log(`  ${count}回: ${test}`);
      });
  }

  // 平均実行時間
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`\n⏱️  平均実行時間: ${(avgDuration / 1000).toFixed(1)}秒`);

  // 結果をJSONファイルに保存
  const summaryPath = path.join(LOG_DIR, 'summary.json');
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        totalRuns: MAX_RUNS,
        successCount,
        failureCount,
        failureStats,
        avgDuration,
        results: results.map((r) => ({
          run: r.run,
          success: r.success,
          duration: r.duration,
          failedTests: r.failedTests,
        })),
      },
      null,
      2,
    ),
  );

  console.log(`\n📁 詳細なログは ${LOG_DIR} に保存されました`);
}

async function main() {
  console.log(`🚀 E2E テストを ${MAX_RUNS} 回実行します...\n`);

  for (let i = 1; i <= MAX_RUNS; i++) {
    const result = await runE2ETests(i);

    // 失敗した場合は早期終了
    if (!result.success) {
      console.log(`\n❌ 実行 ${i} で失敗が検出されました。残りの実行をスキップします。`);
      break;
    }
  }

  await analyzeResults();
}

main().catch(console.error);
