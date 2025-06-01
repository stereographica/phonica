import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';

test.describe('素材一覧ページ', () => {
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
  });

  test('素材一覧ページが正しく表示される', async ({ page }) => {
    // ページに移動
    await navigation.goToMaterialsPage();

    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Materials');

    // 主要なUI要素が存在することを確認
    await expect(page.locator('input[placeholder="Search by title"]')).toBeVisible();
    await expect(page.locator('button:has-text("Search")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
    await expect(page.locator('a:has-text("Create New")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = ['Title', 'Duration', 'Sample Rate', 'Tags', 'Created'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('サイドバーから素材一覧ページに移動できる', async ({ page }) => {
    // ホームページから開始
    await page.goto('/');
    
    // サイドバーから素材一覧へ移動
    await navigation.navigateViaSidebar('Materials');

    // 素材一覧ページが表示されることを確認
    await expect(page).toHaveURL('/materials');
    await expect(page.locator('h1')).toHaveText('Materials');
  });

  test('新規作成ボタンから素材作成ページに移動できる', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // 新規作成ボタンをクリック
    await page.click('a:has-text("Create New")');

    // 素材作成ページに移動したことを確認
    await expect(page).toHaveURL('/materials/new');
    await expect(page.locator('h1')).toHaveText('Create Material');
  });

  test('検索機能が動作する', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // 検索フィールドに入力
    await page.fill('input[placeholder="Search by title"]', 'Forest');
    
    // 検索ボタンをクリック
    await page.click('button:has-text("Search")');

    // URLパラメータが更新されることを確認
    await expect(page).toHaveURL(/\?title=Forest/);

    // フィルタークリアボタンが機能することを確認
    await page.click('button:has-text("Clear Filters")');
    await expect(page).toHaveURL('/materials');
    await expect(page.locator('input[placeholder="Search by title"]')).toHaveValue('');
  });

  test('ページネーションが表示される', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // ページネーションコントロールが存在することを確認
    const pagination = page.locator('nav[aria-label="pagination"]');
    await expect(pagination).toBeVisible();

    // 「次へ」「前へ」ボタンの存在を確認
    await expect(pagination.locator('button:has-text("Previous")')).toBeVisible();
    await expect(pagination.locator('button:has-text("Next")')).toBeVisible();
  });

  test('テーブルの各行から素材詳細モーダルを開ける', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // テーブルに行が存在する場合のみテスト
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 最初の行をクリック
      await rows.first().click();

      // モーダルが開くことを確認
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // モーダルを閉じる
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });
});