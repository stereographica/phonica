import { test, expect } from '@playwright/test';
import { ToastHelper } from '../helpers';

test.describe('エラーハンドリング機能', () => {
  // テストごとに一意のIDを生成（ブラウザ名とタイムスタンプ）
  const getUniqueId = (browserName: string) => {
    return `${browserName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  test.describe('Toast通知', () => {
    test('素材削除成功時にToast通知が表示される', async ({ page, browserName }) => {
      const uniqueId = getUniqueId(browserName);
      const materialTitle = `削除テスト素材 ${uniqueId}`;
      
      // テスト用の素材を作成
      await page.goto('/materials/new');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 30000 });
      
      // ダミーファイルをアップロード
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-audio.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('dummy audio content')
      });
      
      // フォームフィールドを入力
      await page.fill('input#title', materialTitle);
      await page.fill('textarea#memo', 'テスト用素材の説明');
      await page.fill('input#locationName', 'テスト場所');
      // 必須フィールドの録音日時を入力
      const recordedAt = new Date().toISOString().slice(0, 16);
      await page.fill('input[type="datetime-local"]', recordedAt);
      
      // 保存
      await page.click('button:has-text("Save Material")');
      await page.waitForURL('/materials');
      await page.waitForLoadState('networkidle');
      
      // 作成した素材を検索
      await page.fill('input[placeholder="Search by title"]', materialTitle);
      await page.click('button:has-text("Search")');
      await page.waitForTimeout(1000);
      
      // 素材の詳細モーダルを開く
      const materialButton = page.locator(`tbody tr:has-text("${materialTitle}")`).locator('button').first();
      await materialButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });

      // 削除ボタンをクリック
      await page.click('button:has-text("Delete")');

      // 確認ダイアログで削除を実行
      await page.click('[role="alertdialog"] button:has-text("Delete")');

      // 成功Toast通知が表示されることを確認
      const toastHelper = new ToastHelper(page);
      await toastHelper.expectSuccessToast('素材を削除しました');
    });

    test('機材削除成功時にToast通知が表示される', async ({ page, browserName }) => {
      const uniqueId = getUniqueId(browserName);
      const equipmentName = `テスト機材 ${uniqueId}`;
      
      // window.confirmを自動的に承認する設定
      page.on('dialog', dialog => dialog.accept());
      
      // 機材マスターページへ移動
      await page.goto('/master/equipment');
      await page.waitForLoadState('networkidle');

      // 新しい機材を作成（削除テスト用）
      await page.click('button:has-text("Add Equipment")');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // フォームフィールドを入力（一意の名前を使用）
      await page.fill('[role="dialog"] input[name="name"]', equipmentName);
      await page.fill('[role="dialog"] input[name="type"]', 'Microphone');
      await page.fill('[role="dialog"] input[name="manufacturer"]', 'テストメーカー');
      await page.click('[role="dialog"] button[type="submit"]');
      
      // 一覧が更新されるのを待つ
      await page.waitForTimeout(1000);

      // 作成した機材の削除ボタンをクリック
      const equipmentRow = page.locator(`tr:has-text("${equipmentName}")`);
      await expect(equipmentRow).toBeVisible({ timeout: 10000 });
      
      // アクションボタンをクリック（role="button"を使わずに直接buttonを指定）
      await equipmentRow.locator('button').last().click();
      await page.waitForSelector('[role="menuitem"]:has-text("Delete")', { state: 'visible' });
      await page.click('[role="menuitem"]:has-text("Delete")');

      // 成功Toast通知が表示されることを確認
      const toastHelper = new ToastHelper(page);
      await toastHelper.expectSuccessToast('機材を削除しました');
    });

    test('素材更新成功時にToast通知が表示される', async ({ page, browserName }) => {
      const uniqueId = getUniqueId(browserName);
      const materialTitle = `更新テスト素材 ${uniqueId}`;
      const updatedTitle = `更新済み ${uniqueId}`;
      
      // テスト用の素材を作成
      await page.goto('/materials/new');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[type="file"]', { state: 'visible', timeout: 30000 });
      
      // ダミーファイルをアップロード
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-audio.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('dummy audio content')
      });
      
      // フォームフィールドを入力
      await page.fill('input#title', materialTitle);
      await page.fill('textarea#memo', 'テスト用素材の説明');
      await page.fill('input#locationName', 'テスト場所');
      // 必須フィールドの録音日時を入力
      const recordedAt = new Date().toISOString().slice(0, 16);
      await page.fill('input[type="datetime-local"]', recordedAt);
      
      // 保存
      await page.click('button:has-text("Save Material")');
      await page.waitForURL('/materials');
      await page.waitForLoadState('networkidle');
      
      // 作成した素材を検索
      await page.fill('input[placeholder="Search by title"]', materialTitle);
      await page.click('button:has-text("Search")');
      await page.waitForTimeout(1000);
      
      // 素材の詳細モーダルを開く
      const materialButton = page.locator(`tbody tr:has-text("${materialTitle}")`).locator('button').first();
      await materialButton.click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // Editボタンをクリックして編集ページへ移動
      const editButton = page.locator('[role="dialog"] button:has-text("Edit")');
      await editButton.click();
      await page.waitForURL(/\/materials\/.*\/edit/);
      await page.waitForLoadState('networkidle');

      // タイトルを変更
      const titleInput = page.locator('input#title');
      await titleInput.clear();
      await titleInput.fill(updatedTitle);

      // 保存ボタンをクリック
      await page.click('button:has-text("Update Material")');

      // 成功Toast通知が表示されることを確認
      const toastHelper = new ToastHelper(page);
      await toastHelper.expectSuccessToast('素材を更新しました');

      // リダイレクトされることを確認
      await page.waitForURL('/materials');
    });
  });

  test.describe('エラー処理', () => {
    test('APIエラー時にToast通知でエラーメッセージが表示される', async ({ page, browserName }) => {
      const uniqueId = getUniqueId(browserName);
      const equipmentName = `エラーテスト機材 ${uniqueId}`;
      
      // window.confirmを自動的に承認する設定
      page.on('dialog', dialog => dialog.accept());
      
      // 機材マスターページへ移動
      await page.goto('/master/equipment');
      await page.waitForLoadState('networkidle');
      
      // テスト用の機材を作成
      await page.click('button:has-text("Add Equipment")');
      await page.waitForSelector('[role="dialog"]', { state: 'visible' });
      
      // フォームフィールドを入力
      await page.fill('[role="dialog"] input[name="name"]', equipmentName);
      await page.fill('[role="dialog"] input[name="type"]', 'Recorder');
      await page.fill('[role="dialog"] input[name="manufacturer"]', 'エラーテスト');
      await page.click('[role="dialog"] button[type="submit"]');
      
      // 一覧が更新されるのを待つ
      await page.waitForTimeout(1000);
      
      // 削除APIをモックしてエラーを返すように設定（特定の機材名のみ）
      await page.route('**/api/master/equipment/*', (route, request) => {
        // DELETEリクエストのみエラーを返す
        if (request.method() === 'DELETE') {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Equipment not found' }),
          });
        } else {
          route.continue();
        }
      });

      // 作成した機材の削除を試みる（エラーが発生する）
      const equipmentRow = page.locator(`tr:has-text("${equipmentName}")`);
      await expect(equipmentRow).toBeVisible({ timeout: 10000 });
      
      // アクションボタンをクリック
      await equipmentRow.locator('button').last().click();
      await page.waitForSelector('[role="menuitem"]:has-text("Delete")', { state: 'visible' });
      await page.click('[role="menuitem"]:has-text("Delete")');

      // エラーToast通知が表示されることを確認
      const toastHelper = new ToastHelper(page);
      await toastHelper.expectErrorToast('機材の削除に失敗しました');
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
      const toastHelper = new ToastHelper(page);
      await toastHelper.expectToastWithText('エラー', 'error');
    });
  });
});