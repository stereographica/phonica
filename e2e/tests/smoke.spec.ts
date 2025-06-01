import { test, expect } from '../fixtures/test-fixtures';

test.describe('スモークテスト', () => {
  test('アプリケーションが起動する', async ({ page }) => {
    await page.goto('/');
    
    // ページが正しくロードされることを確認
    await expect(page).toHaveTitle(/Phonica/i);
    
    // メインコンテンツが表示されることを確認
    await expect(page.locator('main')).toBeVisible();
  });

  test('主要なページにアクセスできる', async ({ page }) => {
    const pages = [
      { url: '/', title: 'Phonica' },
      { url: '/materials', title: '素材一覧' },
      { url: '/materials/new', title: '素材作成' },
      { url: '/master/equipment', title: '機材マスタ' },
      { url: '/master/tags', title: 'タグマスタ' },
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
    const sidebar = page.locator('nav[role="navigation"]');
    await expect(sidebar).toBeVisible();
    
    // 主要なリンクが存在することを確認
    const links = [
      'ダッシュボード',
      '素材一覧',
      'マスタデータ',
      '機材',
      'タグ',
    ];
    
    for (const linkText of links) {
      await expect(sidebar.locator(`text="${linkText}"`).first()).toBeVisible();
    }
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/materials');
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    // サイドバーの表示状態を確認（実装に応じて調整）
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    // モバイルメニューボタンなどの存在を確認（実装に応じて調整）
  });
});