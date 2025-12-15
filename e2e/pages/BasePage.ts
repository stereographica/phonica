import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object class
 * 全てのPage Objectの親クラス
 */
export class BasePage {
  constructor(protected page: Page) {}

  /**
   * 共通セレクタ定義
   * Phase 1 で確立した data-testid パターンに基づく
   */
  protected selectors = {
    // Toast（Phase A パターン）
    toast: '[data-testid="toast"]',
    toastError: '[data-testid="toast"][data-type="error"]',
    toastSuccess: '[data-testid="toast"][data-type="success"]',

    // Loading
    loading: '[data-testid="loading"]',
    loadingSpinner: '[data-testid="loading-spinner"]',

    // Modal
    modal: '[role="dialog"]',
    modalClose: '[data-testid="modal-close"]',
    modalTitle: '[data-testid="modal-title"]',
    modalContent: '[data-testid="modal-content"]',

    // Form
    form: '[data-testid*="form"]',
    submitButton: 'button[type="submit"]',
    cancelButton: 'button[type="button"]:has-text("キャンセル")',

    // Navigation
    sidebar: '[data-testid="sidebar"]',
    sidebarLink: '[data-testid^="sidebar-link-"]',
  };

  /**
   * Toast の表示を待つ（Phase A パターン）
   * @param text - Toast に表示されるテキスト（省略可）
   * @param type - Toast のタイプ（'error' | 'success' | 'info'）
   * @param timeout - タイムアウト時間（デフォルト: 5000ms）
   */
  async waitForToast(
    text?: string,
    type: 'error' | 'success' | 'info' = 'success',
    timeout = 5000,
  ): Promise<Locator> {
    const selector =
      type === 'error'
        ? this.selectors.toastError
        : type === 'success'
          ? this.selectors.toastSuccess
          : this.selectors.toast;

    const toast = this.page.locator(selector);
    await toast.waitFor({ state: 'visible', timeout });

    if (text) {
      await expect(toast).toContainText(text, { timeout });
    }

    return toast;
  }

  /**
   * Loading の完了を待つ
   * @param timeout - タイムアウト時間（デフォルト: 30000ms）
   */
  async waitForLoadingComplete(timeout = 30000): Promise<void> {
    const loading = this.page.locator(this.selectors.loading);
    const isVisible = await loading.isVisible().catch(() => false);

    if (isVisible) {
      await loading.waitFor({ state: 'hidden', timeout });
    }
  }

  /**
   * Modal を閉じる（Phase B パターン - ブラウザ別処理）
   * @param timeout - タイムアウト時間（デフォルト: 5000ms）
   */
  async closeModal(timeout = 5000): Promise<void> {
    const modal = this.page.locator(this.selectors.modal);
    const isVisible = await modal.isVisible().catch(() => false);

    if (!isVisible) {
      return; // Modal が既に閉じている
    }

    const browserName = this.page.context().browser()?.browserType().name();

    if (browserName === 'firefox') {
      // Firefox の場合: Escape キーを2回押す（Phase 1 の知見）
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(100);
      await this.page.keyboard.press('Escape');
    } else {
      // Chrome/WebKit の場合: Close ボタンをクリック
      const closeButton = this.page.locator(this.selectors.modalClose);
      await closeButton.click();
    }

    await modal.waitFor({ state: 'hidden', timeout });
  }

  /**
   * フォームに値を入力（data-testid ベース）
   * @param data - { fieldName: value } の形式
   */
  async fillForm(data: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(data)) {
      const input = this.page.locator(`[data-testid="input-${field}"]`);
      await input.fill(value);
    }
  }

  /**
   * API レスポンスを待つ（Phase B パターン - Promise.all）
   * @param urlPattern - URL パターン（例: '/api/materials'）
   * @param action - API をトリガーするアクション
   * @param timeout - タイムアウト時間（デフォルト: 30000ms）
   */
  async waitForApiResponse(
    urlPattern: string,
    action: () => Promise<void>,
    timeout = 30000,
  ): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (response) => response.url().includes(urlPattern) && response.ok(),
        { timeout },
      ),
      action(),
    ]);
  }

  /**
   * サイドバーのリンクをクリック
   * @param linkName - リンク名（例: 'materials', 'dashboard'）
   */
  async navigateToSidebarLink(linkName: string): Promise<void> {
    const link = this.page.locator(`[data-testid="sidebar-link-${linkName}"]`);
    await link.click();
    await this.waitForLoadingComplete();
  }

  /**
   * ページが読み込まれたことを確認
   * @param url - 期待されるURL（部分一致）
   * @param timeout - タイムアウト時間（デフォルト: 5000ms）
   */
  async waitForPageLoad(url: string, timeout = 5000): Promise<void> {
    await this.page.waitForURL(`**${url}**`, { timeout });
    await this.waitForLoadingComplete();
  }

  /**
   * Year-aware セレクター（Phase C パターン）
   * @param elementType - 要素タイプ（例: 'calendar-month'）
   * @param year - 年
   * @param value - 値（例: 月番号）
   */
  getYearAwareElement(elementType: string, year: number, value: string | number): Locator {
    return this.page.locator(`[data-testid="${elementType}-${year}-${value}"]`);
  }

  /**
   * 柔軟な検証パターン（Phase C パターン - OR条件）
   * @param locators - 確認する Locator のリスト
   * @param timeout - タイムアウト時間（デフォルト: 5000ms）
   * @returns 最初に見つかった Locator
   */
  async expectAnyVisible(locators: Locator[], timeout = 5000): Promise<Locator> {
    const visibilityChecks = locators.map((locator) =>
      locator.isVisible({ timeout }).catch(() => false),
    );

    const results = await Promise.all(visibilityChecks);
    const visibleIndex = results.findIndex((isVisible) => isVisible);

    if (visibleIndex === -1) {
      throw new Error('None of the provided locators are visible');
    }

    return locators[visibleIndex];
  }
}
