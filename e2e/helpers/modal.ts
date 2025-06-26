import { Page, Locator } from '@playwright/test';

/**
 * モーダル操作用ヘルパー関数
 */
export class ModalHelper {
  constructor(private page: Page) {}

  /**
   * ブラウザ名を取得
   */
  private getBrowserName(): string {
    return this.page.context().browser()?.browserType().name() || 'unknown';
  }

  /**
   * モーダルのロケーターを取得
   */
  getModal(): Locator {
    return this.page.locator('[role="dialog"]').first();
  }

  /**
   * モーダルが開いているか確認
   */
  async isOpen(): Promise<boolean> {
    return await this.getModal().isVisible();
  }

  /**
   * モーダルタイトルを取得
   */
  async getTitle(): Promise<string> {
    const modal = this.getModal();
    const title = modal.locator('h2, h3, [role="heading"]').first();
    return (await title.textContent()) || '';
  }

  /**
   * モーダル内のボタンをクリック
   */
  async clickButton(buttonText: string) {
    const modal = this.getModal();
    const button = modal.locator(`button:has-text("${buttonText}")`);

    // WebKitの場合は force オプションを使用
    if (this.getBrowserName() === 'webkit') {
      await button.click({ force: true });
    } else {
      await button.click();
    }
  }

  /**
   * モーダルを閉じる（Xボタン）
   */
  async close() {
    const modal = this.getModal();
    const closeButton = modal
      .locator('[aria-label="Close"], button[aria-label*="close"], button:has-text("×")')
      .first();
    if (await closeButton.isVisible()) {
      // WebKitの場合は force オプションを使用
      if (this.getBrowserName() === 'webkit') {
        await closeButton.click({ force: true });
      } else {
        await closeButton.click();
      }
    }
  }

  /**
   * モーダルを閉じる（ESCキー）
   */
  async closeWithEsc() {
    await this.page.keyboard.press('Escape');
  }

  /**
   * モーダルが閉じるまで待機
   */
  async waitForClose(timeout: number = 5000) {
    await this.page.waitForSelector('[role="dialog"]', {
      state: 'hidden',
      timeout,
    });
  }

  /**
   * モーダルが開くまで待機
   */
  async waitForOpen(timeout?: number) {
    // CI環境では長めのタイムアウトを設定
    const defaultTimeout = process.env.CI ? 15000 : 5000;
    const actualTimeout = timeout ?? defaultTimeout;

    console.log(
      `⏳ Waiting for modal to open (timeout: ${actualTimeout}ms, CI: ${process.env.CI || 'false'})`,
    );

    try {
      await this.page.waitForSelector('[role="dialog"]', {
        state: 'visible',
        timeout: actualTimeout,
      });
      console.log('✅ Modal opened successfully');
    } catch (error) {
      console.error(`❌ Modal failed to open within ${actualTimeout}ms`);
      // デバッグ情報を追加
      const hasDialog = await this.page.locator('[role="dialog"]').count();
      console.log(`Dialog elements found: ${hasDialog}`);
      throw error;
    }
  }

  /**
   * 確認ダイアログで「はい」を選択
   */
  async confirmAction() {
    const confirmDialog = this.page.locator('[role="alertdialog"]');
    const confirmButton = confirmDialog.locator(
      'button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")',
    );

    // WebKitの場合は force オプションを使用
    if (this.getBrowserName() === 'webkit') {
      await confirmButton.click({ force: true });
    } else {
      await confirmButton.click();
    }
  }

  /**
   * 確認ダイアログで「いいえ」を選択
   */
  async cancelAction() {
    const confirmDialog = this.page.locator('[role="alertdialog"]');
    const cancelButton = confirmDialog.locator('button:has-text("Cancel"), button:has-text("No")');

    // WebKitの場合は force オプションを使用
    if (this.getBrowserName() === 'webkit') {
      await cancelButton.click({ force: true });
    } else {
      await cancelButton.click();
    }
  }
}
