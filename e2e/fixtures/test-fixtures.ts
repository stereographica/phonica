/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

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

// カスタムテストインスタンスを作成
export const test = base.extend<TestFixtures>({
  // 認証状態をキャッシュするコンテキスト
  authenticatedContext: async ({ browser }, use) => {
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
  cachedPage: async ({ page }, use) => {
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
