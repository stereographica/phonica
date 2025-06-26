import { cleanupAllWorkerDatabases } from '../../scripts/e2e-db-optimized';

/**
 * Playwright グローバルテアダウン
 * 全テスト実行後に1回だけ実行される
 */
async function globalTeardown() {
  console.log('🌍 Global Teardown: Cleaning up E2E test environment...');

  // CI環境では認証情報を設定
  if (process.env.CI === 'true') {
    process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
    process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
  }

  try {
    // 全Workerのデータベースをクリーンアップ
    console.log('🧹 Cleaning up all worker databases...');
    await cleanupAllWorkerDatabases();

    console.log('✅ Global Teardown completed successfully');
  } catch (error) {
    console.error('❌ Global Teardown failed:', error);
    // テアダウンでは例外を投げずに警告のみ表示
    console.error('⚠️  Some cleanup operations may have failed, please check manually');
  }
}

export default globalTeardown;
