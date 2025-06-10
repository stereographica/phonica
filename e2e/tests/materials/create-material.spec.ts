import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';
import { FormHelper } from '../../helpers/form';
import path from 'path';

test.describe('@materials Create Material', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    await navigation.goToNewMaterialPage();
  });

  test('displays create material form correctly', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('New Material');

    // 必須フィールドの存在確認
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Select Audio File")')).toBeVisible();
    // DescriptionフィールドはNew Materialページには存在しない
    await expect(page.locator('label:has-text("Memo")')).toBeVisible();

    // 位置情報フィールド
    await expect(page.locator('label:has-text("Latitude")')).toBeVisible();
    await expect(page.locator('label:has-text("Longitude")')).toBeVisible();

    // 技術仕様フィールドは自動抽出になったため、表示されない
    await expect(page.locator('label:has-text("Sample Rate (Hz)")')).not.toBeVisible();
    await expect(page.locator('label:has-text("Bit Depth")')).not.toBeVisible();

    // 送信ボタン
    await expect(page.locator('button[type="submit"]')).toHaveText('Save Material');
  });

  test('shows errors when required fields are empty', async ({ page, browserName }) => {
    // WebKitではFormDataのboundaryエラーがあるため、このテストをスキップ
    test.skip(browserName === 'webkit', 'WebKitではFormDataのboundaryエラーのためスキップ');
    // テスト用の音声ファイルをアップロード（ボタンを有効にするため）
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await page.locator('input[type="file"]').setInputFiles(testAudioPath);

    // メタデータ抽出が完了するまで待つ
    await expect(page.locator('text=✓ File uploaded and analyzed successfully')).toBeVisible({
      timeout: 15000,
    });

    // タイトルフィールドを空のままにする（必須フィールドのバリデーションテスト）
    // 録音日時も空のままにする

    // 保存ボタンが有効になるまで待つ
    await expect(page.locator('button[type="submit"]:not([disabled])')).toBeVisible({
      timeout: 5000,
    });

    // HTML5ネイティブバリデーションを無効化
    await page.evaluate(() => {
      const form = document.querySelector(
        'form[data-testid="new-material-form"]',
      ) as HTMLFormElement;
      if (form) {
        form.noValidate = true;
      }
    });

    // フォームを送信
    await form.submitForm();

    // エラーメッセージの確認（role="alert"として表示される）
    const errorAlert = page.locator('p[role="alert"]');

    // エラーメッセージが表示されるまで待機（最大5秒）
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // タイトルが必須であることを示すエラーメッセージ
    await expect(errorAlert).toContainText('Title is required.');
  });

  test('uploads file and extracts metadata automatically', async ({ page, browserName }) => {
    // WebKitではFormDataのboundaryエラーがあるため、このテストをスキップ
    test.skip(browserName === 'webkit', 'WebKitではFormDataのboundaryエラーのためスキップ');
    // テスト用の音声ファイルを使用
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await page.locator('input[type="file"]').setInputFiles(testAudioPath);

    // アップロード成功メッセージを確認（処理が速い場合は中間状態が表示されないことがある）
    await expect(page.locator('text=✓ File uploaded and analyzed successfully')).toBeVisible({
      timeout: 15000,
    });

    // 自動抽出されたメタデータが表示されることを確認
    await expect(page.locator('h2:has-text("Technical Metadata (Auto-extracted)")')).toBeVisible();

    // メタデータの内容を確認（例：WAVファイルの場合）
    await expect(page.locator('text=WAV').first()).toBeVisible();
    await expect(page.locator('text=/\\d+,?\\d* Hz/').first()).toBeVisible(); // Sample Rate
  });

  test('can create a valid material', async ({ page, browserName }) => {
    // WebKitとFirefoxではFormDataのboundaryエラーがあるため、このテストをスキップ
    test.skip(
      browserName === 'webkit' || browserName === 'firefox',
      'WebKit/FirefoxではFormDataのboundaryエラーのためスキップ',
    );
    // フォームに入力
    await form.fillByLabel('Title', 'E2E Test Material');
    await form.fillTextareaByLabel('Memo', 'Test memo');

    // 録音日時を入力（必須フィールド）
    const now = new Date();
    const dateTimeLocal = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM形式
    await form.fillByLabel('Recorded At', dateTimeLocal);

    // 位置情報
    await form.fillByLabel('Latitude', '35.6762');
    await form.fillByLabel('Longitude', '139.6503');

    // テスト用の音声ファイルを使用
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await page.locator('input[type="file"]').setInputFiles(testAudioPath);

    // メタデータ抽出が完了するまで待つ
    await expect(page.locator('text=✓ File uploaded and analyzed successfully')).toBeVisible({
      timeout: 15000,
    });

    // 保存ボタンが有効になるまで待つ
    await expect(page.locator('button[type="submit"]:not([disabled])')).toBeVisible({
      timeout: 5000,
    });

    // フォーム送信
    await form.submitForm();

    // フォーム送信後の処理を待つ（material-testsでは特に遅延がある）
    await page.waitForTimeout(1000);

    // Toast通知の代わりにページ遷移を待つ
    // Server Actionの実行とリダイレクトを待つ
    await page.waitForURL('/materials', { timeout: 20000 });

    // リダイレクト後の確認
    await expect(page.locator('h1')).toHaveText('Materials');

    // 作成した素材が一覧に表示されることを確認（最初の要素を確認）
    await expect(page.locator('text=E2E Test Material').first()).toBeVisible({ timeout: 5000 });
  });

  test('location input validation works correctly', async ({ page, browserName }) => {
    // WebKitではFormDataのboundaryエラーがあるため、このテストをスキップ
    test.skip(browserName === 'webkit', 'WebKitではFormDataのboundaryエラーのためスキップ');
    // 無効な緯度を入力
    await form.fillByLabel('Latitude', '91'); // 緯度は-90〜90の範囲
    await form.fillByLabel('Longitude', '180');

    // 必須フィールドも入力（他のバリデーションを回避）
    await form.fillByLabel('Title', 'E2E Location Validation Test');
    const now = new Date();
    const dateTimeLocal = now.toISOString().slice(0, 16);
    await form.fillByLabel('Recorded At', dateTimeLocal);

    // テスト用の音声ファイルをセット
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await page.locator('input[type="file"]').setInputFiles(testAudioPath);

    // メタデータ抽出が完了するまで待つ
    await expect(page.locator('text=✓ File uploaded and analyzed successfully')).toBeVisible({
      timeout: 15000,
    });

    // フォーム送信
    await form.submitForm();

    // エラーメッセージの確認
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });

    // デバッグ: アラートの中身の構造を確認
    const alertHTML = await errorAlert.innerHTML();
    console.log('API validation error HTML:', alertHTML);

    // エラーが表示されていることを確認
    // APIレベルのバリデーションエラーが表示されていることの確認
    expect(await errorAlert.isVisible()).toBe(true);
  });

  test('shows error when metadata extraction fails', async ({ page, browserName }) => {
    // WebKitではFormDataのboundaryエラーがあるため、このテストをスキップ
    test.skip(browserName === 'webkit', 'WebKitではFormDataのboundaryエラーのためスキップ');
    // 無効なファイル（非音声ファイル）をアップロード
    const invalidFilePath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-fixtures.ts');
    await page.locator('input[type="file"]').setInputFiles(invalidFilePath);

    // エラーメッセージを確認
    await expect(page.locator('text=✗ Failed to process file. Please try again.')).toBeVisible({
      timeout: 15000,
    });

    // 保存ボタンが無効になっていることを確認
    await expect(page.locator('button[type="submit"][disabled]')).toBeVisible();
  });

  test('cancel button returns to materials list', async ({ page }) => {
    // キャンセルボタンをクリック
    await page.click('button:has-text("Cancel"), a:has-text("Cancel")');

    // 素材一覧ページに戻ることを確認
    await expect(page).toHaveURL('/materials');
    await expect(page.locator('h1')).toHaveText('Materials');
  });
});
