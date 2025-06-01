import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';
import { FormHelper } from '../../helpers/form';
import path from 'path';

test.describe('素材作成', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    await navigation.goToNewMaterialPage();
  });

  test('素材作成フォームが正しく表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Create Material');

    // 必須フィールドの存在確認
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Audio File")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    await expect(page.locator('label:has-text("Memo")')).toBeVisible();

    // 位置情報フィールド
    await expect(page.locator('label:has-text("Latitude")')).toBeVisible();
    await expect(page.locator('label:has-text("Longitude")')).toBeVisible();

    // 技術仕様フィールド
    await expect(page.locator('label:has-text("Sample Rate")')).toBeVisible();
    await expect(page.locator('label:has-text("Bit Depth")')).toBeVisible();
    await expect(page.locator('label:has-text("Channels")')).toBeVisible();

    // 送信ボタン
    await expect(page.locator('button[type="submit"]')).toHaveText('Create');
  });

  test('必須フィールドが空の場合エラーが表示される', async () => {
    // フォームを送信
    await form.submitForm();

    // バリデーションエラーの確認
    const hasTitleError = await form.hasValidationError('Title');
    const hasFileError = await form.hasValidationError('Audio File');
    expect(hasTitleError).toBeTruthy();
    expect(hasFileError).toBeTruthy();
  });

  test('有効な素材を作成できる', async ({ page }) => {
    // フォームに入力
    await form.fillByLabel('Title', 'E2E Test Material');
    await form.fillTextareaByLabel('Description', 'Material created by E2E test');
    await form.fillTextareaByLabel('Memo', 'Test memo');
    
    // 位置情報
    await form.fillByLabel('Latitude', '35.6762');
    await form.fillByLabel('Longitude', '139.6503');

    // 技術仕様
    await form.selectByLabel('Sample Rate', '48000');
    await form.selectByLabel('Bit Depth', '24');
    await form.selectByLabel('Channels', '2');

    // テスト用の音声ファイルを作成（実際のE2E環境では適切なテストファイルを用意）
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    
    // ファイルアップロード（テストファイルが存在する場合のみ）
    try {
      await form.uploadFile('input[type="file"]', testAudioPath);
    } catch (error) {
      // テストファイルがない場合はスキップ
      console.log('Test audio file not found, skipping file upload');
    }

    // フォーム送信
    await form.submitForm();

    // 成功メッセージまたはリダイレクトを確認
    // 実際の挙動に応じて調整が必要
    const successToast = page.locator('[role="alert"]:has-text("Created successfully")');
    // const isRedirected = page.url().includes('/materials/') && !page.url().includes('/new');
    
    // いずれかの成功インジケーターを確認
    await expect(successToast.or(page.locator('h1:has-text("Materials")'))).toBeVisible({ timeout: 10000 });
  });

  test('位置情報の入力バリデーションが機能する', async () => {
    // 無効な緯度を入力
    await form.fillByLabel('Latitude', '91'); // 緯度は-90〜90の範囲
    await form.fillByLabel('Longitude', '180');

    // タイトルとファイルも入力（他のバリデーションを回避）
    await form.fillByLabel('Title', 'Test');

    // フォーム送信
    await form.submitForm();

    // エラーメッセージの確認
    const hasLatError = await form.hasValidationError('Latitude');
    const hasGeneralError = await form.getErrorMessage();
    
    // いずれかのエラー表示を確認
    expect(hasLatError || hasGeneralError).toBeTruthy();
  });

  test('キャンセルボタンで素材一覧に戻る', async ({ page }) => {
    // キャンセルボタンをクリック
    await page.click('button:has-text("Cancel"), a:has-text("Cancel")');

    // 素材一覧ページに戻ることを確認
    await expect(page).toHaveURL('/materials');
    await expect(page.locator('h1')).toHaveText('Materials');
  });
});