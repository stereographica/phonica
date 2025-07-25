import { test, expect } from '@playwright/test';

test.describe('@materials @bulk @detailed Bulk Operations Detailed Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 素材一覧ページに移動
    await page.goto('/materials');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  });

  test.describe('@critical Bulk Operations UI', () => {
    test('複数素材選択と一括操作ツールバー表示', async ({ page }) => {
      // 1. 素材行が存在することを確認
      const materialRows = page.locator('tbody tr');
      const materialCount = await materialRows.count();
      expect(materialCount).toBeGreaterThan(1);

      // 2. 最初の2つの素材を選択
      const firstCheckbox = materialRows.nth(0).locator('[role="checkbox"]');
      const secondCheckbox = materialRows.nth(1).locator('[role="checkbox"]');

      await firstCheckbox.click();
      await secondCheckbox.click();

      // 3. 選択数が表示されることを確認
      await expect(page.getByText('• 2 selected')).toBeVisible({ timeout: 5000 });

      // 4. 一括操作ツールバーが表示されることを確認
      const bulkToolbar = page.locator('text=2 materials selected');
      await expect(bulkToolbar).toBeVisible({ timeout: 5000 });

      // 5. 一括操作ボタンが表示されることを確認
      await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Tag/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Delete/i })).toBeVisible();

      // 6. 選択解除のテスト
      await firstCheckbox.click();
      await expect(page.getByText('• 1 selected')).toBeVisible({ timeout: 3000 });

      await secondCheckbox.click();
      await expect(page.getByText('selected')).not.toBeVisible();

      console.log('✅ 一括操作ツールバーの基本動作確認が完了しました');
    });

    test('一括タグ付与モーダル表示', async ({ page }) => {
      // 1. 素材を選択
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.click();

      // 2. 選択状態の確認
      await expect(page.getByText('• 1 selected')).toBeVisible({ timeout: 5000 });

      // 3. タグボタンをクリック
      const tagButton = page.getByRole('button', { name: /Tag/i });
      await tagButton.click();

      // 4. タグ選択モーダルが表示されることを確認
      const tagModal = page.locator('[role="dialog"]');
      await expect(tagModal).toBeVisible({ timeout: 5000 });

      // 5. モーダルを閉じる
      await page.keyboard.press('Escape');
      await expect(tagModal).not.toBeVisible();

      console.log('✅ 一括タグ付与モーダルの基本動作確認が完了しました');
    });

    test('選択状態管理とページ遷移', async ({ page }) => {
      // 1. 素材を選択
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.click();

      // 2. 選択状態の確認
      await expect(page.getByText('• 1 selected')).toBeVisible({ timeout: 5000 });

      // 3. 別のページに移動
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // 4. 素材ページに戻る
      await page.goto('/materials');
      await page.waitForSelector('table tbody tr', { timeout: 10000 });

      // 5. 選択状態がクリアされていることを確認
      await expect(page.getByText('selected')).not.toBeVisible();

      console.log('✅ ページ遷移時の選択状態管理確認が完了しました');
    });
  });
});
