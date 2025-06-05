import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper, FormHelper, TableHelper, ModalHelper, WaitHelper } from '../../helpers';

test.describe('@master @smoke Tag Master', () => {
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

    // 新規登録ボタンの確認
    await expect(page.locator('button:has-text("New Tag")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = await table.getHeaders();
    expect(headers).toContain('Name');
    expect(headers).toContain('Slug');
    expect(headers).toContain('Material Count');
    expect(headers).toContain('Actions');
  });

  test('can create a new tag', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("New Tag")');

    // モーダルが表示されるまで待つ
    await modal.waitForOpen();
    await expect(modal.getTitle()).resolves.toContain('Add New Tag');

    // フォームに入力
    await form.fillByLabel('Name', 'Test Tag ' + Date.now());

    // 保存ボタンをクリック
    await modal.clickButton('Add Tag');

    // モーダルが閉じるまで待つ
    await modal.waitForClose();

    // 成功メッセージの確認
    await wait.waitForToast();
  });

  test('can rename a tag via dropdown menu', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初の行を取得
      const firstRow = page.locator('tbody tr').first();

      // 最初の行のドロップダウンメニューをクリック
      await firstRow.locator('button:has(.sr-only:text("Open menu"))').click();

      // メニューが表示されるまで待つ
      await page.waitForSelector('[role="menuitem"]:has-text("Rename")', { timeout: 5000 });

      // Renameをクリック
      await page.click('[role="menuitem"]:has-text("Rename")');

      // モーダルが表示されるまで待つ
      await modal.waitForOpen();
      await expect(modal.getTitle()).resolves.toContain('Edit Tag');

      // フォームをクリアして新しい名前を入力
      const nameInput = page
        .locator('label:has-text("Name") + input, label:has-text("Name") input')
        .first();
      await nameInput.clear();
      await form.fillByLabel('Name', 'Renamed Tag ' + Date.now());

      // 保存ボタンをクリック
      await modal.clickButton('Save Changes');

      // モーダルが閉じるまで径つ
      await modal.waitForClose();

      // 成功メッセージの確認
      await wait.waitForToast();
    }
  });

  test('can delete a tag via dropdown menu', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 未使用のタグを探す（Material Countが0のタグ）
      let targetRow = null;
      const rows = await page.locator('tbody tr').all();

      for (const row of rows) {
        const materialCount = await row.locator('td').nth(2).textContent();
        if (materialCount === '0') {
          targetRow = row;
          break;
        }
      }

      if (targetRow) {
        // ドロップダウンメニューをクリック
        await targetRow.locator('button:has(.sr-only:text("Open menu"))').click();

        // メニューが表示されるまで待つ
        await page.waitForSelector('[role="menuitem"]:has-text("Delete")', { timeout: 5000 });

        // Deleteをクリック
        await page.click('[role="menuitem"]:has-text("Delete")');

        // 確認ダイアログが表示されるまで待つ
        await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
        await expect(page.locator('[role="alertdialog"] h2')).toHaveText('Are you sure?');

        // 削除ボタンをクリック
        const browserName = page.context().browser()?.browserType().name() || 'unknown';
        const deleteConfirmButton = page.locator('[role="alertdialog"] button:has-text("Delete")');

        // WebKitの場合は force オプションを使用
        if (browserName === 'webkit') {
          await deleteConfirmButton.click({ force: true });
        } else {
          await deleteConfirmButton.click();
        }

        // 成功メッセージの確認
        await wait.waitForToast();
      } else {
        // 削除可能なタグがない場合はスキップ
        test.skip();
      }
    }
  });

  test('merge functionality shows not implemented message', async ({ page }) => {
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初の行のドロップダウンメニューをクリック
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has(.sr-only:text("Open menu"))').click();

      // メニューが表示されるまで待つ
      await page.waitForSelector('[role="menuitem"]:has-text("Merge")', { timeout: 5000 });

      // アラートダイアログのハンドラーを設定
      let dialogHandled = false;
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('will be implemented in a future update');
        await dialog.accept();
        dialogHandled = true;
      });

      // Mergeをクリック
      await page.click('[role="menuitem"]:has-text("Merge")');

      // ダイアログが処理されるのを待つ
      await expect.poll(() => dialogHandled, { timeout: 3000 }).toBe(true);
    }
  });

  test.skip('table filtering works correctly', async () => {
    // フィルター機能は現在実装されていないためスキップ
  });

  test.skip('pagination works correctly', async () => {
    // ページネーション機能は現在実装されていないためスキップ
  });
});
