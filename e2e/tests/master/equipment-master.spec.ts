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
    await expect(page.locator('h1')).toHaveText('機材マスタ');

    // 新規登録ボタン
    await expect(page.locator('button:has-text("新規登録")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = ['名前', 'タイプ', 'メーカー', '作成日', '操作'];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('新規機材を登録できる', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("新規登録")');

    // モーダルが開くことを確認
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('機材登録');

    // フォームに入力
    await form.fillByLabel('名前', 'E2Eテストマイク');
    await form.fillByLabel('タイプ', 'Microphone');
    await form.fillByLabel('メーカー', 'TestManufacturer');

    // 保存ボタンをクリック
    await modal.locator('button:has-text("保存")').click();

    // モーダルが閉じることを確認
    await expect(modal).not.toBeVisible();

    // 新しい機材がテーブルに表示されることを確認
    await expect(page.locator('td:has-text("E2Eテストマイク")')).toBeVisible({ timeout: 10000 });
  });

  test('機材を編集できる', async ({ page }) => {
    // テーブルに機材が存在する場合のみテスト
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 最初の行の編集ボタンをクリック
      await rows.first().locator('button:has-text("編集")').click();

      // モーダルが開くことを確認
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('h2')).toHaveText('機材編集');

      // 名前を変更
      const nameInput = modal.locator('input[name="name"]');
      await nameInput.clear();
      await nameInput.fill('編集済み機材名');

      // 保存
      await modal.locator('button:has-text("保存")').click();

      // モーダルが閉じることを確認
      await expect(modal).not.toBeVisible();

      // 変更が反映されることを確認
      await expect(page.locator('td:has-text("編集済み機材名")')).toBeVisible({ timeout: 10000 });
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
      await rows.first().locator('button:has-text("削除")').click();

      // 確認ダイアログが表示されることを確認
      const confirmDialog = page.locator('[role="alertdialog"]');
      await expect(confirmDialog).toBeVisible();

      // 削除を確認
      await confirmDialog.locator('button:has-text("削除")').click();

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
    await page.click('button:has-text("新規登録")');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // 何も入力せずに保存
    await modal.locator('button:has-text("保存")').click();

    // エラーメッセージまたはモーダルが閉じないことを確認
    await expect(modal).toBeVisible();
    
    // バリデーションエラーの確認（実装によって調整が必要）
    const hasNameError = await modal.locator('text="名前は必須です"').isVisible();
    const hasTypeError = await modal.locator('text="タイプは必須です"').isVisible();
    const hasManufacturerError = await modal.locator('text="メーカーは必須です"').isVisible();
    
    expect(hasNameError || hasTypeError || hasManufacturerError).toBeTruthy();
  });

  test('モーダルをキャンセルできる', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("新規登録")');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // キャンセルボタンをクリック
    await modal.locator('button:has-text("キャンセル")').click();

    // モーダルが閉じることを確認
    await expect(modal).not.toBeVisible();
  });
});