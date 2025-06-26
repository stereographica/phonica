/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { getSessionID, getSessionDatabaseURL } from '../../scripts/e2e-db-optimized';

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
  // セッション共有のデータベース
  sessionDatabase: {
    databaseUrl: string;
    sessionId: string;
  };
};

// カスタムテストインスタンスを作成
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // すべてのテストでセッション共有のデータベースを自動使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  page: async ({ page, sessionDatabase: _sessionDatabase }, use) => {
    // sessionDatabaseが自動的に初期化されることを保証
    await use(page);
  },

  // API直接テストでもセッション共有のデータベースを自動使用
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: async ({ request, sessionDatabase: _sessionDatabase }, use) => {
    // sessionDatabaseが自動的に初期化されることを保証
    await use(request);
  },
  // セッション共有のデータベース設定
  sessionDatabase: [
    async ({}, use) => {
      const isCI = process.env.CI === 'true';

      if (isCI) {
        // CI環境では既存のデータベースを使用
        console.log('🔧 CI environment detected - using existing test database');
        const databaseUrl =
          process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db';

        await use({ databaseUrl, sessionId: 'ci' });
      } else {
        // ローカル環境ではセッション共有のデータベースを使用
        const sessionId = getSessionID();
        if (!sessionId) {
          throw new Error('E2E_SESSION_ID is not set. Please run tests through npm run e2e');
        }

        const databaseUrl = getSessionDatabaseURL(sessionId);
        console.log(`🔗 Using session database: ${databaseUrl.replace(/:[^:@]*@/, ':***@')}`);

        // 環境変数をセッションデータベースに設定
        process.env.DATABASE_URL = databaseUrl;

        await use({ databaseUrl, sessionId });
      }
    },
    { scope: 'worker' },
  ],

  // 認証状態をキャッシュするコンテキスト
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  authenticatedContext: async ({ browser, sessionDatabase: _sessionDatabase }, use) => {
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
  cachedPage: async ({ page, sessionDatabase: _sessionDatabase }, use) => {
    // sessionDatabaseが自動的に初期化されることを保証
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
