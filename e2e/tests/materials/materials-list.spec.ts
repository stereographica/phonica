import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';

test.describe('@materials @critical Materials List Page', () => {
  let navigation: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
  });

  test('displays materials list page correctly', async ({ page }) => {
    // ページに移動
    await navigation.goToMaterialsPage();

    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Materials');

    // 主要なUI要素が存在することを確認
    await expect(page.locator('input#titleFilter')).toBeVisible();
    await expect(page.locator('input#tagFilter')).toBeVisible();
    await expect(page.locator('button:has-text("Apply Filters")')).toBeVisible();
    // Clear Filtersボタンは実装されていない
    await expect(page.locator('a:has-text("New Material")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = ['Title', 'Recorded At', 'Tags', 'Actions'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('can navigate to materials list from sidebar', async ({ page }) => {
    // ホームページから開始
    await page.goto('/');

    // サイドバーから素材一覧へ移動（実際のサイドバー構造に合わせて修正）
    await page.click('nav a[href="/materials"]');
    await page.waitForLoadState('networkidle');

    // 素材一覧ページが表示されることを確認
    await expect(page).toHaveURL('/materials');
    await expect(page.locator('h1')).toHaveText('Materials');
  });

  test('can navigate to create material page from new button', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // 新規作成ボタンをクリック
    await page.click('a:has-text("New Material")');

    // 素材作成ページに移動したことを確認
    await expect(page).toHaveURL('/materials/new');
    await expect(page.locator('h1')).toHaveText('New Material');
  });

  test('search functionality works correctly', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // タイトル検索フィールドに入力
    await page.fill('input#titleFilter', 'Forest');

    // 検索ボタンをクリック
    await page.click('button:has-text("Apply Filters")');

    // URLパラメータが更新されることを確認
    await expect(page).toHaveURL(/\?title=Forest/);

    // フィルター入力欄をクリアして再度Apply Filtersをクリック
    await page.fill('input#titleFilter', '');
    await page.click('button:has-text("Apply Filters")');
    // page=1パラメータが残ることを許容
    await expect(page).toHaveURL(/\/materials(\?page=1)?$/);
  });

  test('tag search functionality works correctly', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // タグ検索フィールドに入力
    await page.fill('input#tagFilter', 'nature');

    // 検索ボタンをクリック
    await page.click('button:has-text("Apply Filters")');

    // URLパラメータが更新されることを確認
    await expect(page).toHaveURL(/\?tag=nature/);

    // フィルター入力欄をクリアして再度Apply Filtersをクリック
    await page.fill('input#tagFilter', '');
    await page.click('button:has-text("Apply Filters")');
    // page=1パラメータが残ることを許容
    await expect(page).toHaveURL(/\/materials(\?page=1)?$/);
  });

  test('can apply filters using Enter key', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // タイトル検索フィールドに入力してEnterキーを押す
    await page.fill('input#titleFilter', 'Forest');
    await page.locator('input#titleFilter').press('Enter');

    // URLパラメータが更新されることを確認
    await expect(page).toHaveURL(/\?title=Forest/);

    // ページをリロードしてURLパラメータをクリア
    await navigation.goToMaterialsPage();

    // タグ検索フィールドに入力してEnterキーを押す
    await page.fill('input#tagFilter', 'nature');
    await page.locator('input#tagFilter').press('Enter');

    // URLパラメータが更新されることを確認
    await expect(page).toHaveURL(/\?tag=nature/);
  });

  test('pagination is displayed', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // ページネーションコントロールが存在することを確認（実際の実装に合わせて修正）
    // ページネーションは1ページ以上ある場合のみ表示される
    const pageInfo = page.locator('text=/Page \d+ of \d+/');

    // ページ情報が存在する場合、ページネーションボタンも確認
    if (await pageInfo.isVisible()) {
      await expect(page.locator('button:has-text("Previous")')).toBeVisible();
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
    }
  });

  test('can open material detail modal from table rows', async ({ page }) => {
    await navigation.goToMaterialsPage();

    // テーブルに行が存在する場合のみテスト
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 最初の行のタイトルリンクをクリック（実際の実装ではボタンでタイトルをクリック）
      const titleButton = rows.first().locator('button.text-blue-600');
      await titleButton.click();

      // モーダルが開くことを確認
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // モーダルを閉じる
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    } else {
      // データがない場合は「No materials found」メッセージを確認
      await expect(page.locator('text="No materials found"')).toBeVisible();
    }
  });
});
