import { test, expect } from '@playwright/test';

test.describe('エラーハンドリング機能', () => {
  test.describe('Toast通知', () => {
    test('素材削除成功時にToast通知が表示される', async ({ page }) => {
      // 素材一覧ページへ移動
      await page.goto('/materials');
      await page.waitForLoadState('networkidle');

      // 最初の素材の詳細モーダルを開く
      const firstMaterialButton = page.locator('tbody tr').first().locator('button').first();
      await firstMaterialButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // 削除ボタンをクリック
      await page.click('button:has-text("Delete")');

      // 確認ダイアログで削除を実行
      await page.click('[role="alertdialog"] button:has-text("Delete")');

      // 成功Toast通知が表示されることを確認
      await page.waitForTimeout(500); // 削除処理とToast表示を待つ
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('成功');
      await expect(toast).toContainText('素材を削除しました');
    });

    test('機材削除成功時にToast通知が表示される', async ({ page }) => {
      // window.confirmを自動的に承認する設定
      page.on('dialog', dialog => dialog.accept());
      
      // 機材マスターページへ移動
      await page.goto('/master/equipment');
      await page.waitForLoadState('networkidle');

      // 新しい機材を作成（削除テスト用）
      await page.click('button:has-text("Add Equipment")');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // フォームフィールドを入力
      await page.fill('[role="dialog"] input[name="name"]', 'テスト機材');
      await page.fill('[role="dialog"] input[name="type"]', 'Microphone');
      await page.fill('[role="dialog"] input[name="manufacturer"]', 'テストメーカー');
      await page.click('[role="dialog"] button[type="submit"]');
      
      // 一覧が更新されるのを待つ
      await page.waitForTimeout(1000);

      // 作成した機材の削除ボタンをクリック
      const equipmentRow = page.locator('tr:has-text("テスト機材")');
      await equipmentRow.locator('button[role="button"]').click();
      await page.click('[role="menuitem"]:has-text("Delete")');

      // 成功Toast通知が表示されることを確認
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('成功');
      await expect(toast).toContainText('機材を削除しました');
    });

    test('素材更新成功時にToast通知が表示される', async ({ page }) => {
      // 素材一覧ページへ移動
      await page.goto('/materials');
      await page.waitForLoadState('networkidle');

      // 最初の素材の詳細モーダルを開く
      const firstMaterialButton = page.locator('tbody tr').first().locator('button').first();
      await firstMaterialButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Editボタンをクリックして編集ページへ移動
      const editButton = page.locator('[role="dialog"] button:has-text("Edit")');
      await editButton.click();
      await page.waitForURL(/\/materials\/.*\/edit/);
      await page.waitForLoadState('networkidle');

      // タイトルを変更
      const titleInput = page.locator('input#title');
      await titleInput.clear();
      await titleInput.fill('更新されたタイトル');

      // 保存ボタンをクリック（実際のボタンテキストに合わせる）
      await page.click('button:has-text("Update Material")');

      // 成功Toast通知が表示されることを確認
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('成功');
      await expect(toast).toContainText('素材を更新しました');

      // リダイレクトされることを確認
      await page.waitForURL('/materials');
    });
  });

  test.describe('エラー処理', () => {
    test('APIエラー時にToast通知でエラーメッセージが表示される', async ({ page }) => {
      // window.confirmを自動的に承認する設定
      page.on('dialog', dialog => dialog.accept());
      
      // APIをモックしてエラーを返すように設定
      await page.route('**/api/master/equipment/*', (route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Equipment not found' }),
        });
      });

      // 機材マスターページへ移動
      await page.goto('/master/equipment');
      await page.waitForLoadState('networkidle');
      
      // 機材一覧が表示されるのを待つ
      await page.waitForSelector('tbody tr', { timeout: 5000 });

      // 削除を試みる（エラーが発生する）
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button[role="button"]').click();
      await page.click('[role="menuitem"]:has-text("Delete")');

      // エラーToast通知が表示されることを確認
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('エラー');
      await expect(toast).toContainText('要求されたリソースが見つかりません');
    });

    test('素材作成時の必須フィールドエラー', async ({ page }) => {
      // 新規素材作成ページへ移動
      await page.goto('/materials/new');
      await page.waitForLoadState('networkidle');

      // 必須フィールドを空のまま送信
      await page.click('button:has-text("Save Material")');

      // エラーアラートが表示されることを確認（クライアントサイドバリデーション）
      await page.waitForTimeout(500); // フォーム処理を待つ
      const alert = page.locator('p[role="alert"]').filter({ hasText: /Please select an audio file|Title is required/ });
      await expect(alert).toBeVisible();
    });
  });

  test.describe('グローバルエラーハンドリング', () => {
    test('予期しないエラーが発生した場合のエラー画面', async ({ page }) => {
      // JavaScriptでエラーを発生させる
      await page.goto('/materials');
      
      // グローバルエラーハンドラーがエラーをキャッチしてToast通知を表示することを確認
      page.on('pageerror', error => {
        console.log('Page error captured:', error.message);
      });

      // 非同期エラーを発生させる（グローバルエラーハンドラーがキャッチする）
      await page.evaluate(() => {
        setTimeout(() => {
          throw new Error('テスト用の予期しないエラー');
        }, 100);
      });

      // グローバルエラーハンドラーがToast通知を表示することを確認
      await page.waitForTimeout(500); // エラー処理を待つ
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('エラー');
    });
  });
});