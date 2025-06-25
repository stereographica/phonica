import { Page } from '@playwright/test';

export class MaterialPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/materials');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForMaterialsToLoad() {
    await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
  }

  getCheckbox(rowIndex: number = 0) {
    return this.page.locator('tbody tr').nth(rowIndex).locator('input[type="checkbox"]');
  }

  getSelectAllCheckbox() {
    return this.page.locator('thead input[type="checkbox"]');
  }

  getBulkToolbar() {
    return this.page.getByTestId('bulk-operation-toolbar');
  }
}
