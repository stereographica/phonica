/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import {
  setupOptimizedE2EEnvironment,
  cleanupE2EDatabase,
  getE2EDatabaseURL,
  getWorkerID,
} from '../../scripts/e2e-db-optimized';

// キャッシュディレクトリ
const CACHE_DIR = path.join(process.cwd(), '.e2e-cache');
const AUTH_CACHE_FILE = path.join(CACHE_DIR, 'auth-state.json');
const RESOURCE_CACHE_DIR = path.join(CACHE_DIR, 'resources');

// キャッシュディレクトリを作成
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(RESOURCE_CACHE_DIR)) {
  fs.mkdirSync(RESOURCE_CACHE_DIR, { recursive: true });
}

// カスタムフィクスチャの型定義
type TestFixtures = {
  // 認証済みのコンテキスト
  authenticatedContext: BrowserContext;
  // キャッシュ付きページ
  cachedPage: Page;
};

// Worker scopeフィクスチャの型定義
type WorkerFixtures = {
  // Worker固有のデータベース
  workerDatabase: {
    databaseUrl: string;
    workerId: string;
  };
};

// カスタムテストインスタンスを作成
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // すべてのテストでWorker固有のデータベースを自動使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  page: async ({ page, workerDatabase: _workerDatabase }, use) => {
    // workerDatabaseが自動的に初期化されることを保証
    await use(page);
  },

  // API直接テストでもWorker固有のデータベースを自動使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: async ({ request, workerDatabase: _workerDatabase }, use) => {
    // workerDatabaseが自動的に初期化されることを保証
    await use(request);
  },
  // Worker固有のデータベース設定
  workerDatabase: [
    async ({}, use) => {
      const isCI = process.env.CI === 'true';
      const workerId = getWorkerID();

      if (isCI) {
        // CI環境では既存のデータベースを使用
        console.log(
          `🔧 CI environment detected - using existing test database for worker: ${workerId}`,
        );
        const databaseUrl =
          process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

        await use({ databaseUrl, workerId });
      } else {
        // ローカル環境ではWorker固有のデータベースを使用
        console.log(`🔧 Setting up database for worker: ${workerId}`);

        // 元の環境変数を保存
        const originalDatabaseUrl = process.env.DATABASE_URL;

        try {
          // Worker固有のデータベースをセットアップ
          await setupOptimizedE2EEnvironment(workerId);
          const databaseUrl = getE2EDatabaseURL(workerId);

          // 環境変数を動的に設定してAPIリクエストでWorker固有のDBを使用
          process.env.DATABASE_URL = databaseUrl;
          console.log(
            `🔗 Worker ${workerId} using database: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`,
          );

          await use({ databaseUrl, workerId });
        } catch (error) {
          console.error(`❌ Failed to setup database for worker ${workerId}:`, error);
          throw error;
        } finally {
          // 環境変数を元に戻す
          if (originalDatabaseUrl) {
            process.env.DATABASE_URL = originalDatabaseUrl;
          } else {
            delete process.env.DATABASE_URL;
          }

          // テスト完了後にクリーンアップ
          try {
            await cleanupE2EDatabase(workerId);
            console.log(`✅ Cleaned up database for worker: ${workerId}`);
          } catch (error) {
            console.error(`⚠️  Failed to cleanup database for worker ${workerId}:`, error);
          }
        }
      }
    },
    { scope: 'worker' },
  ],

  // 認証状態をキャッシュするコンテキスト
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  authenticatedContext: async ({ browser, workerDatabase: _workerDatabase }, use) => {
    let context: BrowserContext;

    // 認証状態のキャッシュが存在するか確認
    if (fs.existsSync(AUTH_CACHE_FILE)) {
      // キャッシュから認証状態を復元
      context = await browser.newContext({
        storageState: AUTH_CACHE_FILE,
      });
    } else {
      // 新しいコンテキストを作成
      context = await browser.newContext();

      // ここで必要に応じて認証処理を実行
      // 例: await authenticateUser(context);

      // 認証状態を保存
      await context.storageState({ path: AUTH_CACHE_FILE });
    }

    await use(context);
    await context.close();
  },

  // 静的リソースをキャッシュするページ（現在は通常のpageと同じ）
  // 将来的により安全なキャッシュ実装を追加予定
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  cachedPage: async ({ page, workerDatabase: _workerDatabase }, use) => {
    // workerDatabaseが自動的に初期化されることを保証
    await use(page);
  },
});

export { expect };

// テスト用定数
export const TEST_TIMEOUTS = {
  SHORT: 5000,
  MEDIUM: 10000,
  LONG: 30000,
};

// よく使うセレクター
export const SELECTORS = {
  // ナビゲーション
  sidebar: 'nav[role="navigation"]',
  sidebarLink: (text: string) => `nav[role="navigation"] a:has-text("${text}")`,

  // ボタン
  primaryButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
  deleteButton: 'button:has-text("Delete")',
  cancelButton: 'button:has-text("Cancel")',

  // フォーム
  inputByLabel: (label: string) =>
    `label:has-text("${label}") + input, label:has-text("${label}") input`,
  textareaByLabel: (label: string) =>
    `label:has-text("${label}") + textarea, label:has-text("${label}") textarea`,
  selectByLabel: (label: string) =>
    `label:has-text("${label}") + select, label:has-text("${label}") select`,

  // テーブル
  tableRow: 'tbody tr',
  tableCell: 'td',

  // モーダル
  modal: '[role="dialog"]',
  modalTitle: '[role="dialog"] h2',

  // メッセージ
  toast: '[role="alert"]',
  errorMessage: '.error-message, [role="alert"][aria-live="assertive"]',
};
