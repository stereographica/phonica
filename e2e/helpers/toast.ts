import { Page, Locator, expect } from '@playwright/test';

export class ToastHelper {
  constructor(private page: Page) {}

  /**
   * 最新のToast通知を取得
   * 複数のToastがある場合は最後に表示されたものを返す
   */
  async getLatestToast(): Promise<Locator> {
    // Toast通知が表示されるまで少し待つ
    await this.page.waitForTimeout(300);
    
    // すべてのToast要素を取得
    const toasts = this.page.locator('[role="status"]');
    
    // 少なくとも1つのToastが表示されるまで待つ
    await expect(toasts.first()).toBeVisible({ timeout: 5000 });
    
    const count = await toasts.count();
    
    if (count === 0) {
      throw new Error('No toast notifications found');
    }
    
    // 最後のToast（最新）を返す
    const latestToast = toasts.nth(count - 1);
    
    // 選択したToastが実際に存在することを確認
    await expect(latestToast).toBeVisible({ timeout: 5000 });
    
    return latestToast;
  }

  /**
   * Toast通知が表示されることを確認
   * @param expectedText 期待されるテキスト（部分一致）
   * @param variant 'success' | 'error' | 'default'
   */
  async expectToastWithText(expectedText: string | string[], variant?: 'success' | 'error' | 'default') {
    const toast = await this.getLatestToast();
    await expect(toast).toBeVisible();
    
    // テキストの確認（配列の場合は全てのテキストが含まれることを確認）
    if (Array.isArray(expectedText)) {
      for (const text of expectedText) {
        await expect(toast).toContainText(text);
      }
    } else {
      await expect(toast).toContainText(expectedText);
    }
    
    // バリアントの確認（variantが指定されている場合）
    if (variant === 'success') {
      await expect(toast).toContainText('成功');
    } else if (variant === 'error') {
      await expect(toast).toContainText('エラー');
    }
  }

  /**
   * 成功Toast通知を確認
   * @param message 期待されるメッセージ
   */
  async expectSuccessToast(message: string) {
    await this.expectToastWithText(['成功', message], 'success');
  }

  /**
   * エラーToast通知を確認
   * @param message 期待されるメッセージ
   */
  async expectErrorToast(message: string) {
    await this.expectToastWithText(['エラー', message], 'error');
  }

  /**
   * Toast通知が消えるまで待つ
   */
  async waitForToastToDisappear() {
    const toast = await this.getLatestToast();
    await toast.waitFor({ state: 'hidden', timeout: 10000 });
  }
}