/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page, Locator } from '@playwright/test';

/**
 * Firefox固有の問題に対応するためのカスタムフィクスチャ
 */
export const firefoxTest = base.extend({
  // Firefox CI環境での追加初期化
  page: async ({ page, browserName }, use) => {
    if (browserName === 'firefox' && process.env.CI) {
      console.log('🦊 Firefox CI: ページ初期化の追加設定を適用');

      // WebAudio APIの初期化待機
      page.on('pageerror', (error) => {
        // WebAudio関連のエラーは警告として扱う
        if (
          error.message.includes('AudioContext') ||
          error.message.includes('WebAudio') ||
          error.message.includes('audio')
        ) {
          console.warn('🔊 Firefox WebAudio警告:', error.message);
        } else {
          console.error('❌ ページエラー:', error.message);
        }
      });

      // コンソールメッセージのフィルタリング
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          // 既知のFirefox固有エラーを無視
          const ignoredErrors = [
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed',
            'Non-passive event listener',
            'AudioContext was not allowed to start',
          ];

          const text = msg.text();
          if (!ignoredErrors.some((err) => text.includes(err))) {
            console.log(`[Console ${msg.type()}] ${text}`);
          }
        }
      });

      // タイムアウトハンドリング
      page.setDefaultTimeout(process.env.CI ? 30000 : 15000);
      page.setDefaultNavigationTimeout(process.env.CI ? 60000 : 30000);
    }

    await use(page);
  },
});

/**
 * Firefox専用のカスタムexpect関数
 */
export const firefoxExpect = expect.extend({
  /**
   * Firefox CI環境での要素表示待機（拡張タイムアウト付き）
   */
  async toBeVisibleInFirefox(locator: Locator, options: { timeout?: number } = {}) {
    const browserName = await locator.page().context().browser()?.browserType().name();
    const isFirefoxCI = browserName === 'firefox' && process.env.CI;

    const timeout = options.timeout || (isFirefoxCI ? 30000 : 10000);

    try {
      await expect(locator).toBeVisible({ timeout });
      return {
        message: () => '要素が表示されました',
        pass: true,
      };
    } catch {
      if (isFirefoxCI) {
        console.warn('🦊 Firefox CI: 要素表示タイムアウト - リトライ中...');
        // リトライ
        await locator.page().waitForTimeout(2000);
        try {
          await expect(locator).toBeVisible({ timeout: 5000 });
          return {
            message: () => '要素が表示されました（リトライ成功）',
            pass: true,
          };
        } catch {
          // それでも失敗した場合
        }
      }
      return {
        message: () => `要素が${timeout}ms以内に表示されませんでした`,
        pass: false,
      };
    }
  },
});

/**
 * Firefox CI環境でのテストスキップヘルパー
 */
export function skipOnFirefoxCI(browserName: string): boolean {
  return browserName === 'firefox' && process.env.CI === 'true';
}

/**
 * Firefox CI環境での追加待機ヘルパー
 */
export async function waitForFirefoxCI(page: Page, browserName: string): Promise<void> {
  if (skipOnFirefoxCI(browserName)) {
    console.log('🦊 Firefox CI: 追加の初期化待機中...');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
  }
}

export { firefoxTest as test };
