import { test as base, expect } from '@playwright/test';

// カスタムフィクスチャの型定義
type TestFixtures = {
  // 将来的にテストデータや認証状態などを追加
};

// カスタムテストインスタンスを作成
export const test = base.extend<TestFixtures>({
  // 将来的にカスタムフィクスチャを追加
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
  inputByLabel: (label: string) => `label:has-text("${label}") + input, label:has-text("${label}") input`,
  textareaByLabel: (label: string) => `label:has-text("${label}") + textarea, label:has-text("${label}") textarea`,
  selectByLabel: (label: string) => `label:has-text("${label}") + select, label:has-text("${label}") select`,
  
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