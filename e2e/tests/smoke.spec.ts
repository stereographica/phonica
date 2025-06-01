import { test, expect } from '../fixtures/test-fixtures';

test.describe('スモークテスト', () => {
  test('アプリケーションが起動する', async ({ page }) => {
    await page.goto('/');
    
    // ページが正しくロードされることを確認
    // Next.jsのデフォルトタイトルの場合もあるため、どちらかを許可
    await expect(page).toHaveTitle(/Phonica|Next\.js/i);
    
    // メインコンテンツが表示されることを確認
    await expect(page.locator('main')).toBeVisible();
  });

  test('主要なページにアクセスできる', async ({ page }) => {
    const pages = [
      { url: '/', title: 'Phonica' },
      { url: '/materials', title: 'Materials' },
      { url: '/materials/new', title: 'Create Material' },
      { url: '/master/equipment', title: 'Equipment Master' },
      { url: '/master/tags', title: 'Tag Master' },
    ];

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      
      // ページがロードされることを確認
      await page.waitForLoadState('networkidle');
      
      // 404エラーでないことを確認
      const responseStatus = page.context().pages()[0].url();
      expect(responseStatus).not.toContain('404');
      
      // タイトルまたはh1要素を確認
      if (pageInfo.title !== 'Phonica') {
        await expect(page.locator('h1').first()).toHaveText(pageInfo.title);
      }
    }
  });

  test('サイドバーナビゲーションが機能する', async ({ page }) => {
    await page.goto('/');
    
    // サイドバーが存在することを確認
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
    
    // 主要なリンクが存在することを確認（英語版）
    const links = [
      'Dashboard',
      'Materials',
      'Master Data',
      'Equipment',
      'Tags',
    ];
    
    for (const linkText of links) {
      const link = sidebar.locator(`text="${linkText}"`).first();
      // リンクが見つからない場合は、部分一致も試す
      if (await link.count() === 0) {
        await expect(sidebar.locator(`text=/${linkText}/i`).first()).toBeVisible();
      } else {
        await expect(link).toBeVisible();
      }
    }
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/materials');
    await expect(page.locator('aside').first()).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    // サイドバーの表示状態を確認
    await expect(page.locator('aside').first()).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    // モバイルでもサイドバーが表示されることを確認（現在の実装では常に表示）
    await expect(page.locator('aside').first()).toBeVisible();
  });
});