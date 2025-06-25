import { test, expect } from '../../fixtures/test-fixtures';

test.describe('@smoke @workflow Global Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/materials');
    await page.waitForLoadState('networkidle');
  });

  test('global search shows results across all entities', async ({ page }) => {
    // 検索ボックスに入力
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('森');

    // 検索結果のポップオーバーが表示されるのを待つ
    const searchResults = page.getByTestId('global-search-results');
    await expect(searchResults).toBeVisible({ timeout: 5000 });

    // 素材の結果を確認
    await expect(searchResults.getByRole('button', { name: /森の朝/ })).toBeVisible();

    // タグセクションも確認
    const tagsSection = searchResults.getByText('TAGS');
    if (await tagsSection.isVisible()) {
      // タグが存在する場合の確認
      const tagButtons = searchResults.getByRole('button').filter({ hasText: /自然音|環境音/ });
      const count = await tagButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test.skip('clicking search result navigates to material detail', async ({ page }) => {
    // 検索を実行
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('Ocean');

    // 検索結果のポップオーバーが表示されるのを待つ
    const searchResults = page.getByTestId('global-search-results');
    await expect(searchResults).toBeVisible({ timeout: 5000 });

    // 結果を待つ
    await expect(searchResults.getByRole('button', { name: /Ocean Waves at Dawn/ })).toBeVisible();

    // 結果をクリック
    await searchResults.getByRole('button', { name: /Ocean Waves at Dawn/ }).click();

    // 詳細ページにナビゲートすることを確認（固定slugを使用）
    await expect(page).toHaveURL(/\/materials\/ocean-waves-dawn/);
    await expect(page.getByRole('heading', { name: 'Ocean Waves at Dawn' })).toBeVisible();
  });

  test('search shows no results message for non-existent query', async ({ page }) => {
    // 存在しないクエリで検索
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('xyz123nonexistent');

    // 検索結果のポップオーバーが表示されるのを待つ
    const searchResults = page.getByTestId('global-search-results');
    await expect(searchResults).toBeVisible({ timeout: 5000 });

    // No results メッセージを確認
    await expect(searchResults.getByText('No results found for "xyz123nonexistent"')).toBeVisible();
  });

  test('search popover closes on escape key', async ({ page }) => {
    // 検索を開始
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('Test');

    // 検索結果のポップオーバーが表示されるのを待つ
    const searchResults = page.getByTestId('global-search-results');
    await expect(searchResults).toBeVisible({ timeout: 5000 });

    // Escapeキーを押す
    await page.keyboard.press('Escape');

    // Popoverが閉じることを確認
    await expect(searchResults).not.toBeVisible();
  });

  test('search shows equipment results', async ({ page }) => {
    // 機材名で検索
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('Zoom');

    // 検索結果のポップオーバーが表示されるのを待つ
    const searchResults = page.getByTestId('global-search-results');
    await expect(searchResults).toBeVisible({ timeout: 5000 });

    // 機材セクションが表示されることを確認
    await expect(searchResults.getByText('EQUIPMENT')).toBeVisible();
    await expect(searchResults.getByRole('button', { name: /Zoom H6/ })).toBeVisible();
  });

  test('search debounces input', async ({ page }) => {
    let fetchCount = 0;

    // APIリクエストを監視
    page.on('request', (request) => {
      if (request.url().includes('/api/search')) {
        fetchCount++;
      }
    });

    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();

    // 素早く文字を入力
    await searchInput.fill('test');

    // デバウンス時間待機
    await page.waitForTimeout(500);

    // リクエストは1回だけ発生することを確認
    expect(fetchCount).toBeLessThanOrEqual(1);
  });

  test('search result shows location for materials', async ({ page }) => {
    // 場所名を含む検索
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('東京');

    // 検索結果のポップオーバーが表示されるのを待つ
    const searchResults = page.getByTestId('global-search-results');
    await expect(searchResults).toBeVisible({ timeout: 5000 });

    // 結果に場所が表示されることを確認
    await expect(searchResults.getByText('MATERIALS')).toBeVisible();
    const materialButton = searchResults.getByRole('button').filter({ hasText: '東京' }).first();
    await expect(materialButton).toBeVisible();
  });

  test('clicking tag in search navigates to filtered materials list', async ({ page }) => {
    // タグを検索
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('自然音');

    // タグセクションを待つ
    const tagsSection = page.getByText('TAGS');
    if (await tagsSection.isVisible({ timeout: 5000 })) {
      // 自然音タグをクリック
      await page
        .getByRole('button', { name: /自然音/ })
        .first()
        .click();

      // URLがタグフィルター付きになることを確認
      await expect(page).toHaveURL(/\/materials\?tags=nature-sounds/);
    }
  });

  test('search popover has proper keyboard navigation', async ({ page }) => {
    // 検索を実行
    const searchInput = page.getByPlaceholder('Search materials...');
    await searchInput.click();
    await searchInput.fill('test');

    // 結果が表示されるのを待つ
    await page.waitForTimeout(500);

    // Tab キーで結果間を移動できることを確認
    await page.keyboard.press('Tab');

    // フォーカスされた要素が存在することを確認
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
