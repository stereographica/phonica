import { test, expect } from '../fixtures/test-fixtures';

test.describe('@smoke Simple Functionality Check', () => {
  test('Application starts up', async ({ page }) => {
    await page.goto('/');
    
    // ページが正しくロードされることを確認
    await expect(page).toHaveTitle(/Phonica/i);
    
    // メインコンテンツが表示されることを確認
    await expect(page.locator('main')).toBeVisible();
  });

  test('Materials list page is displayed', async ({ page }) => {
    await page.goto('/materials');
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Materials');
    
    // 新規作成リンクの確認
    await expect(page.locator('a:has-text("New Material")')).toBeVisible();
  });

  test('Equipment master page is displayed', async ({ page }) => {
    await page.goto('/master/equipment');
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Equipment Master');
    
    // 追加ボタンの確認
    await expect(page.locator('button:has-text("Add Equipment")')).toBeVisible();
  });
});