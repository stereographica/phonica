import { Page, Locator, expect } from '@playwright/test';

export class ToastHelper {
  constructor(private page: Page) {}

  /**
   * 最新のToast通知を取得
   * 複数のToastがある場合は最後に表示されたものを返す
   */
  async getLatestToast(): Promise<Locator> {
    // Toast通知が表示されるまで少し待つ
    await this.page.waitForTimeout(500);

    // すべてのToast要素を取得（Radix UIのToastに対応したセレクター）
    // Radix UIのToastは [role="region"] と [data-state="open"] を使用
    const toasts = this.page.locator(
      '[role="status"], [role="region"][data-state="open"], .toast, .notification, [data-testid*="toast"]',
    );

    // 少なくとも1つのToastが表示されるまで待つ（タイムアウトを延長）
    await expect(toasts.first()).toBeVisible({ timeout: 8000 });

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
   * 古いToast通知をクリアする
   * テスト間の干渉を避けるため
   */
  async clearOldToasts(): Promise<void> {
    try {
      // 既存のToast要素を探す（Radix UIのToastに対応）
      const existingToasts = this.page.locator(
        '[role="status"], [role="region"][data-state="open"], .toast, .notification, [data-testid*="toast"]',
      );
      const count = await existingToasts.count();

      if (count > 0) {
        console.log(`${count}個の既存Toast通知をクリアします`);

        // ESCキーまたはクリックでToastを消去
        for (let i = 0; i < count; i++) {
          const toast = existingToasts.nth(i);
          if (await toast.isVisible({ timeout: 1000 })) {
            try {
              // 閉じるボタンがある場合はクリック
              const closeButton = toast.locator(
                'button[aria-label*="close"], button:has-text("×"), [role="button"]',
              );
              if (await closeButton.isVisible({ timeout: 500 })) {
                await closeButton.click();
              } else {
                // Toast要素自体をクリックして消去を試行
                await toast.click();
              }
              await this.page.waitForTimeout(100);
            } catch (error) {
              console.log(`Toast ${i}の消去でエラー:`, error);
            }
          }
        }

        // 追加の待機時間でToastのアニメーションを待つ
        await this.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('Toast クリア処理でエラー:', error);
      // エラーが発生しても処理は続行
    }
  }

  /**
   * Toast通知が表示されることを確認
   * @param expectedText 期待されるテキスト（部分一致）
   * @param variant 'success' | 'error' | 'default'
   */
  async expectToastWithText(
    expectedText: string | string[],
    variant?: 'success' | 'error' | 'default',
  ) {
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
