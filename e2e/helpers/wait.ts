import { Page } from '@playwright/test';

/**
 * 待機処理用ヘルパー関数
 */
export class WaitHelper {
  constructor(private page: Page) {}

  /**
   * API呼び出しが完了するまで待機
   */
  async waitForApiResponse(urlPattern: string | RegExp, method: string = 'GET') {
    await this.page.waitForResponse(
      response => {
        const matches = typeof urlPattern === 'string' 
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
        return matches && response.request().method() === method && response.ok();
      },
      { timeout: 30000 }
    );
  }

  /**
   * 特定の要素が表示されるまで待機
   */
  async waitForElementVisible(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { 
      state: 'visible', 
      timeout 
    });
  }

  /**
   * 特定の要素が非表示になるまで待機
   */
  async waitForElementHidden(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, { 
      state: 'hidden', 
      timeout 
    });
  }

  /**
   * ローディングインジケーターが消えるまで待機
   */
  async waitForLoadingComplete() {
    // ローディングインジケーターのセレクタ（プロジェクトに応じて調整）
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[role="progressbar"]'
    ];

    for (const selector of loadingSelectors) {
      const element = this.page.locator(selector);
      if (await element.count() > 0) {
        await this.waitForElementHidden(selector);
      }
    }
  }

  /**
   * トーストメッセージが表示されるまで待機
   */
  async waitForToast(text?: string) {
    const toastSelector = '[role="alert"][data-radix-collection-item]';
    await this.waitForElementVisible(toastSelector);
    
    if (text) {
      await this.page.waitForSelector(`${toastSelector}:has-text("${text}")`, {
        state: 'visible',
        timeout: 5000
      });
    }
  }

  /**
   * ページナビゲーション完了まで待機
   */
  async waitForNavigation(url?: string | RegExp) {
    if (url) {
      await this.page.waitForURL(url, { timeout: 30000 });
    }
    await this.page.waitForLoadState('networkidle');
  }
}