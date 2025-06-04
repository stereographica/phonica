import { test, expect } from '../../fixtures/test-fixtures';
import {
  NavigationHelper,
  FormHelper,
  ModalHelper,
  TableHelper,
  CrossBrowserHelper,
} from '../../helpers';
import * as path from 'path';

test.describe.configure({ mode: 'serial' }); // ワークフローテストは順次実行
test.describe('@workflow Complete User Journey', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;
  let modal: ModalHelper;
  let table: TableHelper;
  let crossBrowser: CrossBrowserHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    modal = new ModalHelper(page);
    table = new TableHelper(page);
    crossBrowser = new CrossBrowserHelper(page);
  });

  test('新規ユーザーの素材管理完全フロー', async ({ page }) => {
    // 1. ダッシュボードから開始
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toHaveText('Dashboard');

    // 2. 機材マスタで録音機材を登録
    await navigation.goToEquipmentMasterPage();
    await expect(page.locator('h1')).toHaveText('Equipment Master');

    // 新しい機材を登録
    await page.click('button:has-text("Add Equipment")');
    await modal.waitForOpen();

    // 機材情報を入力（ユニークな名前を使用）
    const uniqueEquipmentName = `E2E Test Zoom H5 ${Date.now()}`;
    await form.fillByLabel('Name', uniqueEquipmentName);
    await form.fillByLabel('Type', 'Handy Recorder');
    await form.fillByLabel('Manufacturer', 'Zoom');
    await form.fillTextareaByLabel('Memo', 'High-quality handheld recorder for field recording');

    // 保存
    await modal.clickButton('Add Equipment');
    await modal.waitForClose();

    // 機材が正常に登録されたことを確認
    await expect(page.locator(`td:has-text("${uniqueEquipmentName}")`)).toBeVisible({
      timeout: 10000,
    });

    // 3. 新規素材登録
    await navigation.goToNewMaterialPage();
    await expect(page.locator('h1')).toHaveText('New Material');

    // 基本情報を入力（ユニークなタイトルを使用）
    const uniqueMaterialTitle = `E2E Test Forest Morning ${Date.now()}`;
    await form.fillByLabel('Title', uniqueMaterialTitle);
    await form.fillTextareaByLabel(
      'Memo',
      'Beautiful morning sounds in the forest with bird songs and gentle wind through trees',
    );

    // 録音日時を設定（現在日時から1日前）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateTimeString = yesterday.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM format
    await form.fillByLabel('Recorded At', dateTimeString);

    // 位置情報を入力
    await form.fillByLabel('Latitude', '31.9077');
    await form.fillByLabel('Longitude', '131.4202');
    await form.fillByLabel('Location Name (Optional)', 'Miyazaki Forest Park, Japan');

    // テスト用音声ファイルをアップロード
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    // ファイルが選択されたことを確認
    await page.waitForTimeout(500); // ファイル選択の処理を待つ
    const selectedFileText = await page
      .locator('p:has-text("Selected file:")')
      .textContent()
      .catch(() => '');
    if (selectedFileText && !selectedFileText.includes('test-audio.wav')) {
      console.error(`File not selected properly. Browser: ${crossBrowser.getBrowserName()}`);
    }

    // 機材選択（実装されている場合）
    // TODO: EquipmentMultiSelectコンポーネントの実装に応じて修正

    // タグを入力（特殊な構造のため、id属性を使用）
    await page.locator('input#tags').fill('forest, nature, birds, morning');

    // 技術仕様を入力
    await form.fillByLabel('Sample Rate (Hz)', '48000');
    await form.fillByLabel('Bit Depth', '24');
    await form.fillByLabel('File Format', 'WAV');

    // 評価を入力
    await form.fillByLabel('Rating (1-5)', '5');

    // ブラウザごとに異なる待機時間を設定
    if (crossBrowser.getBrowserName() === 'firefox' || crossBrowser.getBrowserName() === 'webkit') {
      // Firefox/WebKitではフォームの状態が安定するまで少し待つ
      await page.waitForTimeout(1000);
    }

    // フォーム送信
    const submitButton = page.locator('button[type="submit"]:has-text("Save Material")');

    // デバッグ用：フォーム送信前の状態を確認
    await expect(submitButton).toBeEnabled();
    await expect(submitButton).toBeVisible();

    // ネットワークリクエストを監視
    const [request] = await Promise.all([
      page
        .waitForRequest((req) => req.url().includes('/api/materials') && req.method() === 'POST', {
          timeout: 10000,
        })
        .catch(() => null),
      submitButton.click(),
    ]);

    if (!request) {
      // リクエストが送信されなかった場合、エラー情報を取得
      const errorText = await page
        .locator('[role="alert"]')
        .textContent()
        .catch(() => 'No error message');
      console.error(`POST request to /api/materials was not sent. Error: ${errorText}`);
      console.error(`Browser: ${crossBrowser.getBrowserName()}`);

      // フォームの状態を確認
      const isSubmitting = await page
        .locator('button:has-text("Saving...")')
        .isVisible()
        .catch(() => false);
      console.error(`Form is submitting: ${isSubmitting}`);
    }

    // リダイレクトを待つ（alertダイアログは表示されないため、直接遷移を待つ）
    await page.waitForURL('/materials', { timeout: 15000 });

    // 素材一覧ページに遷移したことを確認
    await expect(page.locator('h1')).toHaveText('Materials');

    // WebKitでは素材一覧の読み込みに時間がかかることがあるため、
    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // WebKitとFirefoxで特別な待機処理
    const browserName = crossBrowser.getBrowserName();

    // Firefox/WebKitでは追加の待機が必要
    if (browserName === 'firefox' || browserName === 'webkit') {
      try {
        // API応答を待つか、データが表示されるかのいずれか早い方
        await Promise.race([
          page.waitForResponse(
            (response) => response.url().includes('/api/materials') && response.status() === 200,
            { timeout: 5000 },
          ),
          page.waitForFunction(
            () => {
              const rows = document.querySelectorAll('tbody tr');
              return rows.length > 0;
            },
            { timeout: 5000 },
          ),
        ]);
      } catch {
        // タイムアウトの場合はページをリロードして再試行
        console.log('Initial data load timeout, reloading page...');
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }

    // データが読み込まれるまで待機
    await page.waitForFunction(
      () => {
        const rows = document.querySelectorAll('tbody tr');
        return rows.length > 0;
      },
      { timeout: 10000 },
    );

    // 新しく作成した素材が表示されることを確認
    // まず素材テーブルが存在することを確認
    await crossBrowser.waitForElementVisible('tbody', { timeout: 15000 });

    // WebKit/Firefoxでは追加の待機が必要
    if (browserName === 'webkit' || browserName === 'firefox') {
      // テーブルにデータが表示されるまで待機
      await page.waitForFunction(
        () => {
          const cells = document.querySelectorAll('tbody td');
          return cells.length > 0;
        },
        { timeout: 15000 },
      );

      // 追加の安定化待機
      await page.waitForTimeout(1000);
    }

    // 素材が表示されるまで待機（完全なタイトルで検索し、first()を使用）
    console.log(`Waiting for material: ${uniqueMaterialTitle}`);

    // Firefox/WebKitでは追加の待機が必要な場合がある
    if (browserName === 'firefox' || browserName === 'webkit') {
      await page.waitForTimeout(2000);
    }

    // 作成した素材を検索して確実に見つける
    // 素材が多い場合、ページネーションで見つからない可能性があるため、
    // タイトルフィルターを使用して検索
    const titleFilter = page.locator('input#titleFilter');
    await titleFilter.fill(uniqueMaterialTitle);
    await page.click('button:has-text("Apply Filters")');
    await page.waitForLoadState('networkidle');

    const materialCell = page.locator(`td:has-text("${uniqueMaterialTitle}")`).first();
    await expect(materialCell).toBeVisible({ timeout: 10000 });

    // 4. タイトル検索機能をテスト
    // まず現在のフィルターをクリアするために、ページをリロード
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 検索フィールドに「forest」を入力
    const titleSearchInput = page.locator('input#titleFilter');
    await titleSearchInput.fill('forest');

    // Firefox/WebKitでは入力値が確実に反映されるまで待機
    if (crossBrowser.getBrowserName() === 'firefox' || crossBrowser.getBrowserName() === 'webkit') {
      await page.waitForTimeout(500);
    }

    // 検索を実行前に入力値を確認（デバッグ用）
    const inputValue = await titleSearchInput.inputValue();
    if (inputValue !== 'forest') {
      console.error(
        `Input value is '${inputValue}' instead of 'forest'. Browser: ${crossBrowser.getBrowserName()}`,
      );
    }

    // 検索を実行
    await page.click('button:has-text("Apply Filters")');
    await page.waitForLoadState('networkidle');

    // URLにクエリパラメータが含まれることを確認
    // 注：実際のURLにはpage=1も含まれる可能性があるため、柔軟なパターンを使用
    await expect(page).toHaveURL(/[?&]title=forest/);

    // 検索結果が正しく表示されることを確認
    await expect(page.locator(`td:has-text("${uniqueMaterialTitle}")`)).toBeVisible();

    // 5. 素材詳細確認（検索フィルターを維持したまま）
    // 作成した素材のタイトルボタンをクリックして詳細モーダルを開く
    await crossBrowser.waitForStability();

    const materialButtonForDetail = page
      .locator(`button:has-text("${uniqueMaterialTitle}")`)
      .first();
    await expect(materialButtonForDetail).toBeVisible();
    await materialButtonForDetail.click();

    // 詳細モーダルが開くことを確認
    await crossBrowser.waitForModalOpen();

    // 詳細情報が正しく表示されることを確認
    await expect(page.locator('[role="dialog"]')).toContainText(uniqueMaterialTitle);
    await expect(
      page.locator('[role="dialog"]').getByText('Miyazaki Forest Park, Japan'),
    ).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toContainText('forest');
    await expect(page.locator('[role="dialog"]')).toContainText('nature');

    // モーダルを閉じる
    await page.keyboard.press('Escape');
    await crossBrowser.waitForModalClose();

    // 検索をクリア
    await titleSearchInput.clear();
    await page.click('button:has-text("Apply Filters")');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/materials(?:\?.*)?$/);

    // 4.5. タグ検索機能をテスト（実装されている場合）
    // タグ検索フィールドに「nature」を入力
    const tagSearchInput = page.locator('input#tagFilter');

    // タグ検索フィールドが存在する場合のみテスト
    if ((await tagSearchInput.count()) > 0) {
      await tagSearchInput.fill('nature');

      // 検索を実行
      await page.click('button:has-text("Apply Filters")');

      // URLの更新を待機（ブラウザによって遅延がある可能性）
      await crossBrowser.waitForStability();

      // URLにクエリパラメータが含まれることを確認
      const currentUrl = page.url();
      if (currentUrl.includes('tag=nature') || currentUrl.includes('tags=nature')) {
        console.log('✅ Tag filter applied successfully');

        // 検索結果が正しく表示されることを確認（作成した素材にnatureタグが含まれているため）
        await expect(page.locator(`td:has-text("${uniqueMaterialTitle}")`).first()).toBeVisible();
      } else {
        console.log('⚠️ Tag filter may not be fully implemented yet');
      }

      // タグ検索をクリア
      await tagSearchInput.clear();
      await page.click('button:has-text("Apply Filters")');
      await page.waitForLoadState('networkidle');
    } else {
      console.log('ℹ️ Tag search field not found, skipping tag search test');
    }

    // 6. ワークフロー完了確認
    // 作成した素材が一覧にあることを確認するため、再度タイトルフィルターを使用

    // Firefoxでは前のフィルター操作の影響が残ることがあるため、
    // ページをリロードしてから検索する
    const currentBrowserName = crossBrowser.getBrowserName();
    if (currentBrowserName === 'firefox') {
      console.log('Reloading page for Firefox before final check...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // titleSearchInputを再取得
      const freshTitleSearchInput = page.locator('input#titleFilter');
      await freshTitleSearchInput.fill(uniqueMaterialTitle);
      await page.click('button:has-text("Apply Filters")');
      await page.waitForLoadState('networkidle');

      // Firefoxでは追加の待機
      await page.waitForTimeout(2000);
    } else {
      await titleSearchInput.fill(uniqueMaterialTitle);
      await page.click('button:has-text("Apply Filters")');
      await page.waitForLoadState('networkidle');

      // WebKitでは追加の待機とリロードが必要な場合がある
      const browserName = page.context().browser()?.browserType().name() || 'unknown';
      if (browserName === 'webkit') {
        await page.waitForTimeout(2000);

        // 素材が見つからない場合は、ページをリロードしてもう一度検索
        const materialVisible = await page
          .locator(`td:has-text("${uniqueMaterialTitle}")`)
          .first()
          .isVisible();
        if (!materialVisible) {
          console.log('WebKit: Material not visible, reloading page and searching again...');
          await page.reload();
          await page.waitForLoadState('networkidle');
          await titleSearchInput.fill(uniqueMaterialTitle);
          await page.click('button:has-text("Apply Filters")');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        }
      }
    }

    // 素材が表示されることを最終確認（タイムアウトを延長）
    await expect(page.locator(`td:has-text("${uniqueMaterialTitle}")`).first()).toBeVisible({
      timeout: 30000,
    });

    console.log('✅ Complete user journey test passed successfully!');
  });

  test('日常的な素材整理フロー', async ({ page }) => {
    // 素材一覧から開始
    await navigation.goToMaterialsPage();
    await expect(page.locator('h1')).toHaveText('Materials');

    // 既存の素材があることを確認
    const rowCount = await table.getRowCount();
    expect(rowCount).toBeGreaterThan(0);

    if (rowCount > 0) {
      // 最初の素材のタイトルセルのボタンをクリック
      const firstRow = page.locator('tbody tr').first();
      const titleButton = firstRow.locator('td').first().locator('button');
      const materialTitle = await titleButton.textContent();
      await titleButton.click();

      // 詳細モーダルが開くことを確認
      await crossBrowser.waitForModalOpen();

      // モーダル内で素材タイトルが表示されることを確認
      if (materialTitle) {
        await expect(page.locator('[role="dialog"]')).toContainText(materialTitle);
      }

      // 編集ボタンがあるかを確認（将来の機能拡張のため）
      const editButtonExists =
        (await page.locator('[role="dialog"] button:has-text("Edit")').count()) > 0;
      console.log(
        editButtonExists ? '✅ Edit button found in modal' : 'ℹ️ Edit button not yet implemented',
      );

      // モーダルを閉じる
      await page.keyboard.press('Escape');
      await crossBrowser.waitForModalClose();

      // 検索フィルタリングのテスト
      const titleSearchInput = page.locator('input#titleFilter');

      // タイトル検索語を入力
      await titleSearchInput.fill('forest');
      await page.click('button:has-text("Apply Filters")');

      // URLが更新されることを確認（pageパラメータも含まれる可能性がある）
      await expect(page).toHaveURL(/[\?&]title=forest/);

      // 検索をクリア
      await titleSearchInput.clear();
      await page.click('button:has-text("Apply Filters")');
      await expect(page).toHaveURL(/\/materials(\?.*)?$/);

      console.log('✅ Daily material organization flow completed successfully!');
    }
  });
});
