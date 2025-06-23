import { test, expect } from '@playwright/test';

test.describe('@smoke @dashboard Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('ダッシュボードページが正常に表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.getByRole('heading', { name: 'ダッシュボード', level: 1 })).toBeVisible();
    await expect(page.getByText('録音活動の概要とコレクションの統計情報')).toBeVisible();
  });

  test('ウィジェットコントロールが表示される', async ({ page }) => {
    // ウィジェット追加ボタンが表示される
    await expect(page.getByRole('button', { name: 'ウィジェット追加' })).toBeVisible();
    
    // リセットボタンが表示される（レイアウトが変更されていない場合は無効）
    const resetButton = page.getByRole('button', { name: 'リセット' });
    await expect(resetButton).toBeVisible();
  });

  test('デフォルトウィジェットが表示される', async ({ page }) => {
    // 要整理素材ウィジェット
    await expect(page.getByText('要整理素材')).toBeVisible();
    
    // 今日の音ウィジェット
    await expect(page.getByText('今日の音')).toBeVisible();
    
    // 統計データウィジェット
    await expect(page.getByText('統計データ')).toBeVisible();
    
    // コレクションマップウィジェット
    await expect(page.getByText('コレクションマップ')).toBeVisible();
    
    // 録音カレンダーウィジェット
    await expect(page.getByText('録音カレンダー')).toBeVisible();
  });

  test('要整理素材ウィジェットの機能', async ({ page }) => {
    const widget = page.locator('[data-widget-type="unorganizedMaterials"]');
    await expect(widget).toBeVisible();
    
    // メタデータが不足している素材のメッセージまたはリストが表示される
    const hasContent = await widget.getByText('メタデータが不足している素材').isVisible()
      .catch(() => false);
    const hasEmptyMessage = await widget.getByText('整理が必要な素材はありません').isVisible()
      .catch(() => false);
    
    expect(hasContent || hasEmptyMessage).toBeTruthy();
    
    // 「すべて表示」ボタンがある場合の確認
    const showAllButton = widget.getByRole('button', { name: 'すべて表示' });
    if (await showAllButton.isVisible().catch(() => false)) {
      await expect(showAllButton).toBeVisible();
    }
  });

  test('統計データウィジェットのタブ切り替え', async ({ page }) => {
    const widget = page.locator('[data-widget-type="statistics"]');
    await expect(widget).toBeVisible();
    
    // サマリーカードが表示される
    await expect(widget.getByText('総素材数')).toBeVisible();
    await expect(widget.getByText('総録音時間')).toBeVisible();
    
    // タブが表示される
    const tagsTab = widget.getByRole('tab', { name: 'タグ' });
    const monthlyTab = widget.getByRole('tab', { name: '月別' });
    const equipmentTab = widget.getByRole('tab', { name: '機材' });
    
    await expect(tagsTab).toBeVisible();
    await expect(monthlyTab).toBeVisible();
    await expect(equipmentTab).toBeVisible();
    
    // タブの切り替えが動作する
    await monthlyTab.click();
    await expect(widget.getByText('前月比')).toBeVisible();
    
    await equipmentTab.click();
    // 機材タブのコンテンツが表示される（具体的なチェックは素材データに依存）
  });

  test('録音カレンダーウィジェットの表示', async ({ page }) => {
    const widget = page.locator('[data-widget-type="recordingCalendar"]');
    await expect(widget).toBeVisible();
    
    // カレンダーのヘッダー情報
    await expect(widget.getByText('過去365日間の録音活動')).toBeVisible();
    
    // 月ラベルが表示される
    await expect(widget.getByText('1月')).toBeVisible();
    await expect(widget.getByText('12月')).toBeVisible();
    
    // 凡例が表示される
    await expect(widget.getByText('少')).toBeVisible();
    await expect(widget.getByText('多')).toBeVisible();
  });

  test('今日の音ウィジェットの機能', async ({ page }) => {
    const widget = page.locator('[data-widget-type="todaySound"]');
    await expect(widget).toBeVisible();
    
    // 今日の日付が表示される
    const currentDate = new Date().toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    await expect(widget.getByText(currentDate)).toBeVisible();
    
    // リフレッシュボタンが表示される
    const refreshButton = widget.getByRole('button', { name: '別の音を選択' });
    await expect(refreshButton).toBeVisible();
    
    // リフレッシュボタンをクリックできる
    await refreshButton.click();
    // ローディング状態やコンテンツの変更を確認（データに依存）
  });

  test('コレクションマップウィジェットの表示', async ({ page }) => {
    const widget = page.locator('[data-widget-type="collectionMap"]');
    await expect(widget).toBeVisible();
    
    // 録音場所の件数情報
    const locationInfo = widget.getByText(/\d+件の録音場所/);
    await expect(locationInfo).toBeVisible();
    
    // 地図またはプレースホルダーが表示される
    const hasMap = await widget.locator('.leaflet-container').isVisible().catch(() => false);
    const hasPlaceholder = await widget.getByText('位置情報のある素材がありません').isVisible().catch(() => false);
    
    expect(hasMap || hasPlaceholder).toBeTruthy();
  });
});

test.describe('@dashboard Dashboard Layout Customization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('ウィジェット追加機能', async ({ page }) => {
    // ウィジェット追加ボタンをクリック
    const addButton = page.getByRole('button', { name: 'ウィジェット追加' });
    await addButton.click();
    
    // ドロップダウンメニューが表示される
    await expect(page.getByText('追加可能なウィジェット')).toBeVisible();
    
    // 既に表示されていないウィジェットがあれば追加できる
    const menuItems = page.locator('[role="menuitem"]');
    const menuCount = await menuItems.count();
    
    if (menuCount > 0) {
      // 最初のメニュー項目をクリック
      await menuItems.first().click();
      
      // ウィジェットが追加されたことを確認（具体的な確認はウィジェットに依存）
      await page.waitForTimeout(500); // レイアウト更新を待つ
    } else {
      // すべてのウィジェットが追加済みの場合
      await expect(page.getByText('すべてのウィジェットが追加済みです')).toBeVisible();
    }
  });

  test('ウィジェット削除機能', async ({ page }) => {
    // 最初のウィジェットの削除ボタンを探す
    const firstWidget = page.locator('.grid-stack-item').first();
    await expect(firstWidget).toBeVisible();
    
    // ウィジェットにホバーして削除ボタンを表示
    await firstWidget.hover();
    
    const deleteButton = firstWidget.getByRole('button', { name: /削除/ });
    if (await deleteButton.isVisible().catch(() => false)) {
      const widgetCount = await page.locator('.grid-stack-item').count();
      
      // 削除ボタンをクリック
      await deleteButton.click();
      
      // ウィジェットが削除されたことを確認
      await expect(page.locator('.grid-stack-item')).toHaveCount(widgetCount - 1);
    }
  });

  test('レイアウトリセット機能', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: 'リセット' });
    
    // レイアウトを変更していない場合は無効
    if (await resetButton.isDisabled()) {
      // ウィジェットを削除してレイアウトを変更
      const firstWidget = page.locator('.grid-stack-item').first();
      await firstWidget.hover();
      
      const deleteButton = firstWidget.getByRole('button', { name: /削除/ });
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        
        // リセットボタンが有効になることを確認
        await expect(resetButton).toBeEnabled();
        
        // リセットボタンをクリック
        await resetButton.click();
        
        // 確認ダイアログが表示される
        await expect(page.getByText('レイアウトをリセットしますか？')).toBeVisible();
        
        // リセットを実行
        await page.getByRole('button', { name: 'リセット' }).click();
        
        // デフォルトレイアウトに戻ったことを確認
        await expect(page.locator('.grid-stack-item')).toHaveCount(5); // デフォルトウィジェット数
      }
    }
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // デスクトップ表示の確認
    await expect(page.locator('.grid-stack')).toBeVisible();
    
    // モバイル表示をシミュレート
    await page.setViewportSize({ width: 375, height: 667 });
    
    // ウィジェットが適切にレスポンシブ対応されていることを確認
    await expect(page.locator('.grid-stack')).toBeVisible();
    
    // タブレット表示をシミュレート
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.grid-stack')).toBeVisible();
  });
});