import { test, expect } from '@playwright/test';

test.describe('エラーハンドリング機能', () => {
  test.describe('Toast通知', () => {
    test.skip('素材削除成功時にToast通知が表示される', async ({ page }) => {
      // 素材一覧ページへ移動
      await page.goto('/materials');
      await page.waitForLoadState('networkidle');

      // 最初の素材の詳細モーダルを開く
      const firstMaterial = page.locator('tbody tr').first();
      await firstMaterial.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // 削除ボタンをクリック
      await page.click('button:has-text("Delete")');

      // 確認ダイアログで削除を実行
      await page.click('[role="alertdialog"] button:has-text("Delete")');

      // 成功Toast通知が表示されることを確認
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('成功');
      await expect(toast).toContainText('素材を削除しました');

      // Toastが自動的に消えることを確認（5秒後）
      await page.waitForTimeout(6000);
      await expect(toast).not.toBeVisible();
    });

    test.skip('機材削除成功時にToast通知が表示される', async ({ page }) => {
      // 機材マスターページへ移動
      await page.goto('/master/equipment');
      await page.waitForLoadState('networkidle');

      // 新しい機材を作成（削除テスト用）
      await page.click('button:has-text("Add Equipment")');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      await page.fill('input[name="name"]', 'テスト機材');
      await page.selectOption('select[name="type"]', 'Microphone');
      await page.fill('input[name="manufacturer"]', 'テストメーカー');
      await page.click('[role="dialog"] button:has-text("Save")');
      
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

    test.skip('素材更新成功時にToast通知が表示される', async ({ page }) => {
      // 素材一覧ページへ移動
      await page.goto('/materials');
      await page.waitForLoadState('networkidle');

      // 最初の素材の編集ページへ移動
      const firstRow = page.locator('tbody tr').first();
      const editButton = firstRow.locator('a:has-text("Edit")');
      await editButton.click();
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
    test.skip('APIエラー時にToast通知でエラーメッセージが表示される', async ({ page }) => {
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

    test.skip('素材作成時の必須フィールドエラー', async ({ page }) => {
      // 新規素材作成ページへ移動
      await page.goto('/materials/new');
      await page.waitForLoadState('networkidle');

      // 必須フィールドを空のまま送信
      await page.click('button:has-text("Save Material")');

      // エラーToast通知が表示されることを確認
      const toast = page.locator('[role="status"]');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('エラー');
    });
  });

  test.describe('グローバルエラーハンドリング', () => {
    test.skip('予期しないエラーが発生した場合のエラー画面', async ({ page }) => {
      // JavaScriptでエラーを発生させる
      await page.goto('/materials');
      
      // コンソールエラーをキャプチャ
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // 意図的にエラーを発生させる（実際のアプリケーションでは発生しないはず）
      await page.evaluate(() => {
        throw new Error('テスト用の予期しないエラー');
      });

      // エラー画面が表示されることを確認（ErrorBoundaryがキャッチする場合）
      const errorTitle = page.locator('text=予期しないエラーが発生しました');
      if (await errorTitle.isVisible({ timeout: 5000 })) {
        await expect(errorTitle).toBeVisible();
        await expect(page.locator('text=申し訳ございません')).toBeVisible();
        await expect(page.locator('button:has-text("ページを再読み込み")')).toBeVisible();
      } else {
        // グローバルエラーハンドラーがToast通知を表示する場合
        const toast = page.locator('[role="status"]');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('エラー');
      }
    });
  });
});