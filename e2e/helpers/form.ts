import { Page } from '@playwright/test';

/**
 * フォーム操作用ヘルパー関数
 */
export class FormHelper {
  constructor(private page: Page) {}

  /**
   * ラベルを基にテキスト入力
   */
  async fillByLabel(label: string, value: string) {
    // Try multiple selectors to find the input field
    const selectors = [
      `label:has-text("${label}") + input`,
      `label:has-text("${label}") input`,
      `input[placeholder*="${label}" i]`,
      `form:has(label:has-text("${label}")) input[type="text"]`,
      `[aria-label="${label}"]`,
    ];

    for (const selector of selectors) {
      const input = this.page.locator(selector).first();
      if (await input.isVisible()) {
        await input.fill(value);
        return;
      }
    }

    // If no selector worked, try the first visible input after the label
    const labelElement = this.page.locator(`label:has-text("${label}")`).first();
    const parent = labelElement.locator('..');
    const input = parent.locator('input').first();
    await input.fill(value);
  }

  /**
   * ラベルを基にテキストエリア入力
   */
  async fillTextareaByLabel(label: string, value: string) {
    // Try multiple selectors to find the textarea
    const selectors = [
      `label:has-text("${label}") + textarea`,
      `label:has-text("${label}") textarea`,
      `textarea[placeholder*="${label}" i]`,
      `form:has(label:has-text("${label}")) textarea`,
      `[aria-label="${label}"]`,
    ];

    for (const selector of selectors) {
      const textarea = this.page.locator(selector).first();
      if (await textarea.isVisible()) {
        await textarea.fill(value);
        return;
      }
    }

    // If no selector worked, try the first visible textarea after the label
    const labelElement = this.page.locator(`label:has-text("${label}")`).first();
    const parent = labelElement.locator('..');
    const textarea = parent.locator('textarea').first();
    await textarea.fill(value);
  }

  /**
   * セレクトボックスで選択
   */
  async selectByLabel(label: string, value: string) {
    const select = this.page
      .locator(`label:has-text("${label}") + select, label:has-text("${label}") select`)
      .first();
    await select.selectOption(value);
  }

  /**
   * チェックボックスをチェック/アンチェック
   */
  async toggleCheckbox(label: string, checked: boolean = true) {
    const checkbox = this.page.locator(`label:has-text("${label}") input[type="checkbox"]`).first();
    if (checked) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
  }

  /**
   * ファイルアップロード
   */
  async uploadFile(inputSelector: string, filePath: string) {
    await this.page.setInputFiles(inputSelector, filePath);
  }

  /**
   * フォーム送信
   */
  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  /**
   * エラーメッセージの取得
   */
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page
      .locator('.error-message, [role="alert"][aria-live="assertive"]')
      .first();
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * フォームバリデーションエラーの確認
   */
  async hasValidationError(fieldLabel: string): Promise<boolean> {
    const field = this.page.locator(`label:has-text("${fieldLabel}")`).first();
    const errorMessage = field
      .locator('..')
      .locator('.error-message, .text-red-500, .text-destructive');
    return await errorMessage.isVisible();
  }
}
