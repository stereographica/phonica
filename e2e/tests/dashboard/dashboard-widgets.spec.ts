import { test, expect } from '@playwright/test';

test.describe('@smoke @dashboard Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');

    // GridStackの初期化を待つ（初期化には350ms以上かかる）
    await page.waitForTimeout(500);

    // ウィジェットが表示されるまで待機
    await page.waitForSelector('.grid-stack-item', {
      state: 'visible',
      timeout: 10000,
    });
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
    const hasContent = await widget
      .getByText('メタデータが不足している素材')
      .isVisible()
      .catch(() => false);
    const hasEmptyMessage = await widget
      .getByText('整理が必要な素材はありません')
      .isVisible()
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
    await expect(widget.getByText('1月', { exact: true })).toBeVisible();
    await expect(widget.getByText('12月', { exact: true })).toBeVisible();

    // 凡例が表示される
    await expect(widget.getByText('少')).toBeVisible();
    await expect(widget.getByText('多')).toBeVisible();
  });

  test('今日の音ウィジェットの機能', async ({ page }) => {
    const widget = page.locator('[data-widget-type="todaySound"]');
    await expect(widget).toBeVisible();

    // 今日の日付が表示される（yyyy年MM月dd日フォーマット）
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const expectedDateFormat = `${year}年${month}月${day}日`;
    await expect(widget.getByText(expectedDateFormat)).toBeVisible();

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

    // 地図の読み込みを待機（動的インポートで時間がかかる可能性）
    await page.waitForTimeout(3000);

    // 地図またはプレースホルダーが表示される
    const hasMap = await widget
      .locator('.leaflet-container')
      .isVisible()
      .catch(() => false);
    const hasPlaceholder = await widget
      .getByText('位置情報のある素材がありません')
      .isVisible()
      .catch(() => false);
    const hasLoading = await widget
      .getByText('地図を読み込み中...')
      .isVisible()
      .catch(() => false);

    expect(hasMap || hasPlaceholder || hasLoading).toBeTruthy();
  });
});

test.describe('@dashboard Dashboard Layout Customization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');

    // GridStackの初期化を待つ
    await page.waitForTimeout(500);

    // ウィジェットが表示されるまで待機
    await page.waitForSelector('.grid-stack-item', {
      state: 'visible',
      timeout: 10000,
    });
  });

  test('ウィジェット追加機能', async ({ page }) => {
    // 初期状態のウィジェット数を確認（デフォルトで5つ）
    await page.waitForSelector('.grid-stack-item', { state: 'visible' });
    const initialWidgetCount = await page.locator('.grid-stack-item').count();
    expect(initialWidgetCount).toBe(5);

    // 最初のウィジェットの情報を取得
    const firstWidget = page.locator('.grid-stack-item').first();
    const firstWidgetTitle = await firstWidget.locator('.text-base').textContent();
    await firstWidget.hover();

    const deleteButton = firstWidget.getByRole('button', { name: /削除/ });
    await deleteButton.click();

    // 削除されたウィジェットのタイトルが消えるのを待つ
    await page.waitForTimeout(1000);

    // ウィジェット追加ボタンをクリック
    const addButton = page.getByRole('button', { name: 'ウィジェット追加' });
    await addButton.click();

    // ドロップダウンメニューが表示される
    await expect(page.getByText('追加可能なウィジェット')).toBeVisible();

    // 削除したウィジェットのタイトルがメニューに表示されていることを確認
    if (firstWidgetTitle) {
      await expect(
        page.locator('[role="menuitem"]').filter({ hasText: firstWidgetTitle }),
      ).toBeVisible();

      // そのメニュー項目をクリックして追加
      await page.locator('[role="menuitem"]').filter({ hasText: firstWidgetTitle }).click();
    } else {
      // タイトルが取得できない場合は、最初のメニュー項目をクリック
      const menuItems = page
        .locator('[role="menuitem"]')
        .filter({ hasNotText: 'すべてのウィジェットが追加済みです' });
      await menuItems.first().click();
    }

    // 少し待ってから確認（GridStackの更新を待つ）
    await page.waitForTimeout(1000);

    // ウィジェットが再度表示されていることを確認
    await page.waitForSelector('.grid-stack-item', { state: 'visible' });
    const finalCount = await page.locator('.grid-stack-item').count();
    expect(finalCount).toBe(5);
  });

  test('ウィジェット削除機能', async ({ page }) => {
    // 初期状態のウィジェット数を確認
    await page.waitForSelector('.grid-stack-item', { state: 'visible' });
    const initialCount = await page.locator('.grid-stack-item').count();
    expect(initialCount).toBe(5);

    // 最初のウィジェットのタイトルを取得（削除確認用）
    const firstWidget = page.locator('.grid-stack-item').first();
    const firstWidgetTitle = await firstWidget.locator('.text-base').textContent();
    await expect(firstWidget).toBeVisible();

    // ウィジェットにホバーして削除ボタンを表示
    await firstWidget.hover();

    const deleteButton = firstWidget.getByRole('button', { name: /削除/ });
    await expect(deleteButton).toBeVisible();

    // 削除ボタンをクリック
    await deleteButton.click();

    // 削除処理が完了するまで待つ
    await page.waitForTimeout(2000); // GridStackとReactの同期を待つ

    // 削除されたウィジェットのタイトルが画面に存在しないことを確認
    if (firstWidgetTitle) {
      await expect(page.getByText(firstWidgetTitle)).not.toBeVisible();
    }

    // ウィジェット数が減っていることを確認
    await page.waitForFunction(
      (expectedCount) => {
        const items = document.querySelectorAll('.grid-stack-item');
        return items.length === expectedCount;
      },
      initialCount - 1,
      { timeout: 5000 },
    );

    // 最終的なウィジェット数を確認
    const finalCount = await page.locator('.grid-stack-item').count();
    expect(finalCount).toBe(initialCount - 1);

    // 残りのウィジェットが正常に表示されていることを確認
    const remainingWidgets = await page.locator('.grid-stack-item').all();
    for (const widget of remainingWidgets) {
      await expect(widget).toBeVisible();
    }
  });

  test('レイアウトリセット機能', async ({ page }) => {
    // 初期状態を確認
    await page.waitForSelector('.grid-stack-item', { state: 'visible' });
    const initialCount = await page.locator('.grid-stack-item').count();
    expect(initialCount).toBe(5);

    // 最初のウィジェットのタイトルを取得
    const firstWidget = page.locator('.grid-stack-item').first();
    const firstWidgetTitle = await firstWidget.locator('.text-base').textContent();
    await firstWidget.hover();

    const deleteButton = firstWidget.getByRole('button', { name: /削除/ });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 削除後、少し待つ
    await page.waitForTimeout(1000);

    // リセットボタンが有効になることを確認
    const resetButton = page.getByRole('button', { name: 'リセット' });
    await expect(resetButton).toBeEnabled();

    // リセットボタンをクリック
    await resetButton.click();

    // 確認ダイアログが表示されるのを待つ
    await page.waitForSelector('text=レイアウトをリセットしますか？', { timeout: 5000 });
    await expect(page.getByText('レイアウトをリセットしますか？')).toBeVisible();

    // AlertDialogのアクションボタンを見つけてクリック
    // AlertDialogActionは[role="alertdialog"]内のボタンとして実装される
    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();

    // ダイアログ内のリセットボタンをクリック
    const confirmResetButton = dialog.locator('button:has-text("リセット")');
    await expect(confirmResetButton).toBeVisible();
    await confirmResetButton.click();

    // リセット後、GridStackの再初期化を待つ
    await page.waitForTimeout(2000);

    // デフォルトレイアウトに戻ったことを確認
    await page.waitForSelector('.grid-stack-item', { state: 'visible' });

    // 削除したウィジェットが復元されていることを確認
    if (firstWidgetTitle) {
      await expect(page.getByText(firstWidgetTitle)).toBeVisible();
    }

    // ウィジェット数が5つに戻っていることを確認
    const finalCount = await page.locator('.grid-stack-item').count();
    expect(finalCount).toBe(5);
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
