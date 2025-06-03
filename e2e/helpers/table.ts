import { Page, Locator } from '@playwright/test';

/**
 * テーブル操作用ヘルパー関数
 */
export class TableHelper {
  constructor(private page: Page) {}

  /**
   * テーブルの特定の行を取得
   */
  async getRowByText(text: string): Promise<Locator> {
    return this.page.locator(`tbody tr:has-text("${text}")`).first();
  }

  /**
   * テーブルの特定の行のセルを取得
   */
  async getCellInRow(row: Locator, columnIndex: number): Promise<string> {
    const cell = row.locator('td').nth(columnIndex);
    return await cell.textContent() || '';
  }

  /**
   * テーブルの行数を取得
   */
  async getRowCount(): Promise<number> {
    return await this.page.locator('tbody tr').count();
  }

  /**
   * テーブルヘッダーのテキストを取得
   */
  async getHeaders(): Promise<string[]> {
    const headers = await this.page.locator('thead th').allTextContents();
    return headers.map(h => h.trim());
  }

  /**
   * 特定の行のアクションボタンをクリック
   */
  async clickActionInRow(rowText: string, actionText: string) {
    const row = await this.getRowByText(rowText);
    await row.locator(`button:has-text("${actionText}")`).click();
  }

  /**
   * ページネーション操作
   */
  async goToPage(pageNumber: number) {
    await this.page.click(`nav[aria-label="pagination"] button:has-text("${pageNumber}")`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 次のページへ移動
   */
  async goToNextPage() {
    await this.page.click('nav[aria-label="pagination"] button:has-text("Next")');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 前のページへ移動
   */
  async goToPreviousPage() {
    await this.page.click('nav[aria-label="pagination"] button:has-text("Previous")');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * ソート可能な列をクリック
   */
  async sortByColumn(columnText: string) {
    await this.page.click(`thead th:has-text("${columnText}")`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * フィルター入力
   */
  async filterTable(filterText: string) {
    const filterInput = this.page.locator('input[placeholder*="Search"], input[placeholder*="Filter"]').first();
    await filterInput.fill(filterText);
    await this.page.waitForLoadState('networkidle');
  }
}