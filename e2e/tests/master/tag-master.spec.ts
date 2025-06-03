import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper, FormHelper, TableHelper, ModalHelper, WaitHelper } from '../../helpers';

test.describe('@master Tag Master', () => {
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

  test('displays tag master page correctly', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Tag Management');

    // 新規登録ボタンは現在コメントアウトされているのでスキップ

    // テーブルヘッダーの確認
    const headers = await table.getHeaders();
    expect(headers).toContain('Name');
    expect(headers).toContain('Slug');
    expect(headers).toContain('Material Count');
    expect(headers).toContain('Actions');
  });

  test.skip('can create a new tag', async ({ page }) => {
    // 新規登録ボタンが現在実装されていないためスキップ
  });

  test('can rename a tag via dropdown menu', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初の行のドロップダウンメニューをクリック
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has(.sr-only:text("Open menu"))').click();

      // メニューが表示されるまで待つ
      await page.waitForSelector('[role="menuitem"]:has-text("Rename")', { timeout: 5000 });

      // アラートダイアログのハンドラーを設定（ダイアログをクリックする前に設定）
      let dialogHandled = false;
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Rename:');
        await dialog.accept();
        dialogHandled = true;
      });

      // Renameをクリック
      await page.click('[role="menuitem"]:has-text("Rename")');
      
      // ダイアログが処理されるのを待つ
      await expect.poll(() => dialogHandled, { timeout: 3000 }).toBe(true);
    }
  });

  test('can delete a tag via dropdown menu', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初の行のドロップダウンメニューをクリック
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has(.sr-only:text("Open menu"))').click();

      // メニューが表示されるまで待つ
      await page.waitForSelector('[role="menuitem"]:has-text("Delete")', { timeout: 5000 });

      // アラートダイアログのハンドラーを設定（ダイアログをクリックする前に設定）
      let dialogHandled = false;
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Delete:');
        await dialog.accept();
        dialogHandled = true;
      });

      // Deleteをクリック
      await page.click('[role="menuitem"]:has-text("Delete")');
      
      // ダイアログが処理されるのを待つ
      await expect.poll(() => dialogHandled, { timeout: 3000 }).toBe(true);
    }
  });

  test.skip('table filtering works correctly', async ({ page }) => {
    // フィルター機能は現在実装されていないためスキップ
  });

  test.skip('pagination works correctly', async ({ page }) => {
    // ページネーション機能は現在実装されていないためスキップ
  });
});