import { setupTemplate, cleanupAllWorkerDatabases } from '../../scripts/e2e-db-optimized';

/**
 * Playwright グローバルセットアップ
 * 全テスト実行前に1回だけ実行される
 */
async function globalSetup() {
  console.log('🌍 Global Setup: Initializing E2E test environment...');

  // CI環境ではスキップ
  if (process.env.CI === 'true') {
    console.log('🔧 CI environment detected - skipping database setup');
    return;
  }

  try {
    // 既存のWorkerデータベースをクリーンアップ
    console.log('🧹 Cleaning up any existing worker databases...');
    await cleanupAllWorkerDatabases();

    // テンプレートデータベースのセットアップ
    console.log('🎯 Setting up template database...');
    await setupTemplate();

    console.log('✅ Global Setup completed successfully');
  } catch (error) {
    console.error('❌ Global Setup failed:', error);
    throw error;
  }
}

export default globalSetup;
