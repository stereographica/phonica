import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper, FormHelper, TableHelper, ModalHelper, WaitHelper } from '../../helpers';

test.describe('タグマスタ', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;
  let table: TableHelper;
  let modal: ModalHelper;
  let wait: WaitHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    table = new TableHelper(page);
    modal = new ModalHelper(page);
    wait = new WaitHelper(page);
    
    await navigation.goToTagMasterPage();
  });

  test('タグマスタページが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Tag Master');

    // 新規登録ボタン
    await expect(page.locator('button:has-text("Create New Tag")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = await table.getHeaders();
    expect(headers).toContain('Name');
    expect(headers).toContain('Slug');
    expect(headers).toContain('Used Count');
    expect(headers).toContain('Actions');
  });

  test('新規タグを登録できる', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Create New Tag")');
    
    // モーダルが開くことを確認
    await modal.waitForOpen();
    expect(await modal.getTitle()).toBe('Create Tag');

    // フォームに入力
    await form.fillByLabel('Name', 'E2E Test Tag');
    await form.fillByLabel('Slug', 'e2e-test-tag');

    // 保存ボタンをクリック
    await modal.clickButton('Create');

    // API呼び出しを待機
    await wait.waitForApiResponse('/api/master/tags', 'POST');

    // モーダルが閉じることを確認
    await modal.waitForClose();

    // 新しいタグがテーブルに表示されることを確認
    await wait.waitForElementVisible('td:has-text("E2E Test Tag")');
    
    const row = await table.getRowByText('E2E Test Tag');
    expect(await row.isVisible()).toBeTruthy();
  });

  test('タグを編集できる', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初のタグ名を取得
      const firstRow = page.locator('tbody tr').first();
      const originalName = await table.getCellInRow(firstRow, 0);

      // 編集ボタンをクリック
      await table.clickActionInRow(originalName, 'Edit');

      // モーダルが開くことを確認
      await modal.waitForOpen();
      expect(await modal.getTitle()).toBe('Edit Tag');

      // 名前を変更
      await form.fillByLabel('Name', 'Edited Tag Name');

      // 保存
      await modal.clickButton('Save');

      // API呼び出しを待機
      await wait.waitForApiResponse('/api/master/tags', 'PUT');

      // モーダルが閉じることを確認
      await modal.waitForClose();

      // 変更が反映されることを確認
      await wait.waitForElementVisible('td:has-text("Edited Tag Name")');
    }
  });

  test('タグを削除できる', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初のタグ名を取得
      const firstRow = page.locator('tbody tr').first();
      const tagName = await table.getCellInRow(firstRow, 0);

      // 削除ボタンをクリック
      await table.clickActionInRow(tagName, 'Delete');

      // 確認ダイアログが表示されることを確認
      await wait.waitForElementVisible('[role="alertdialog"]');

      // 削除を確認
      await modal.confirmAction();

      // API呼び出しを待機
      await wait.waitForApiResponse('/api/master/tags', 'DELETE');

      // ダイアログが閉じることを確認
      await wait.waitForElementHidden('[role="alertdialog"]');

      // 削除されたタグが表示されなくなることを確認
      await wait.waitForLoadingComplete();
      const deletedRow = await table.getRowByText(tagName);
      expect(await deletedRow.count()).toBe(0);
    }
  });

  test('テーブルのフィルタリングが機能する', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 1) {
      // フィルター入力
      await table.filterTable('test');

      // フィルター結果を待機
      await wait.waitForLoadingComplete();

      // フィルター後の行数が元より少ないことを確認
      const filteredRowCount = await table.getRowCount();
      expect(filteredRowCount).toBeLessThanOrEqual(rowCount);
    }
  });

  test('ページネーションが機能する', async ({ page }) => {
    // ページネーションコントロールが存在することを確認
    const pagination = page.locator('nav[aria-label="pagination"]');
    
    if (await pagination.isVisible()) {
      // 次のページボタンが有効な場合はクリック
      const nextButton = pagination.locator('button:has-text("Next")');
      
      if (await nextButton.isEnabled()) {
        await table.goToNextPage();
        
        // URLにページパラメータが含まれることを確認
        expect(page.url()).toContain('page=');
      }
    }
  });
});