import { Page, Locator } from '@playwright/test';

/**
 * モーダル操作用ヘルパー関数
 */
export class ModalHelper {
  constructor(private page: Page) {}

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
    return await title.textContent() || '';
  }

  /**
   * モーダル内のボタンをクリック
   */
  async clickButton(buttonText: string) {
    const modal = this.getModal();
    await modal.locator(`button:has-text("${buttonText}")`).click();
  }

  /**
   * モーダルを閉じる（Xボタン）
   */
  async close() {
    const modal = this.getModal();
    const closeButton = modal.locator('[aria-label="Close"], button[aria-label*="close"], button:has-text("×")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
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
      timeout 
    });
  }

  /**
   * モーダルが開くまで待機
   */
  async waitForOpen(timeout: number = 5000) {
    await this.page.waitForSelector('[role="dialog"]', { 
      state: 'visible', 
      timeout 
    });
  }

  /**
   * 確認ダイアログで「はい」を選択
   */
  async confirmAction() {
    const confirmDialog = this.page.locator('[role="alertdialog"]');
    await confirmDialog.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")').click();
  }

  /**
   * 確認ダイアログで「いいえ」を選択
   */
  async cancelAction() {
    const confirmDialog = this.page.locator('[role="alertdialog"]');
    await confirmDialog.locator('button:has-text("Cancel"), button:has-text("No")').click();
  }
}