import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';
import { FormHelper } from '../../helpers/form';

test.describe('機材マスタ', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    await navigation.goToEquipmentMasterPage();
  });

  test('機材マスタページが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Equipment Master');

    // 新規登録ボタン
    await expect(page.locator('button:has-text("Register New")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = ['Name', 'Type', 'Manufacturer', 'Created', 'Actions'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('新規機材を登録できる', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Register New")');

    // モーダルが開くことを確認
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('Register Equipment');

    // フォームに入力
    await form.fillByLabel('Name', 'E2E Test Microphone');
    await form.fillByLabel('Type', 'Microphone');
    await form.fillByLabel('Manufacturer', 'TestManufacturer');

    // 保存ボタンをクリック
    await modal.locator('button:has-text("Save")').click();

    // モーダルが閉じることを確認
    await expect(modal).not.toBeVisible();

    // 新しい機材がテーブルに表示されることを確認
    await expect(page.locator('td:has-text("E2E Test Microphone")')).toBeVisible({ timeout: 10000 });
  });

  test('機材を編集できる', async ({ page }) => {
    // テーブルに機材が存在する場合のみテスト
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 最初の行の編集ボタンをクリック
      await rows.first().locator('button:has-text("Edit")').click();

      // モーダルが開くことを確認
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h2')).toHaveText('Edit Equipment');

      // 名前を変更
      const nameInput = modal.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill('Edited Equipment Name');

      // 保存
      await modal.locator('button:has-text("Save")').click();

      // モーダルが閉じることを確認
      await expect(modal).not.toBeVisible();

      // 変更が反映されることを確認
      await expect(page.locator('td:has-text("Edited Equipment Name")')).toBeVisible({ timeout: 10000 });
    }
  });

  test('機材を削除できる', async ({ page }) => {
    // テーブルに機材が存在する場合のみテスト
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 最初の行の機材名を取得
      const firstEquipmentName = await rows.first().locator('td').first().textContent();

      // 削除ボタンをクリック
      await rows.first().locator('button:has-text("Delete")').click();

      // 確認ダイアログが表示されることを確認
      const confirmDialog = page.locator('[role="alertdialog"]');
      await expect(confirmDialog).toBeVisible();

      // 削除を確認
      await confirmDialog.locator('button:has-text("Delete")').click();

      // ダイアログが閉じることを確認
      await expect(confirmDialog).not.toBeVisible();

      // 削除された機材が表示されなくなることを確認
      if (firstEquipmentName) {
        await expect(page.locator(`td:has-text("${firstEquipmentName}")`)).not.toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('必須フィールドが空の場合エラーが表示される', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Register New")');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // 何も入力せずに保存
    await modal.locator('button:has-text("Save")').click();

    // エラーメッセージまたはモーダルが閉じないことを確認
    await expect(modal).toBeVisible();
    
    // バリデーションエラーの確認（実装によって調整が必要）
    const hasNameError = await modal.locator('text="Name is required"').isVisible();
    const hasTypeError = await modal.locator('text="Type is required"').isVisible();
    const hasManufacturerError = await modal.locator('text="Manufacturer is required"').isVisible();
    
    expect(hasNameError || hasTypeError || hasManufacturerError).toBeTruthy();
  });

  test('モーダルをキャンセルできる', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Register New")');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // キャンセルボタンをクリック
    await modal.locator('button:has-text("Cancel")').click();

    // モーダルが閉じることを確認
    await expect(modal).not.toBeVisible();
  });
});