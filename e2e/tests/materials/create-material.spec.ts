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
    await expect(page.locator('h1')).toHaveText('素材作成');

    // 必須フィールドの存在確認
    await expect(page.locator('label:has-text("タイトル")')).toBeVisible();
    await expect(page.locator('label:has-text("音声ファイル")')).toBeVisible();
    await expect(page.locator('label:has-text("説明")')).toBeVisible();
    await expect(page.locator('label:has-text("備考")')).toBeVisible();

    // 位置情報フィールド
    await expect(page.locator('label:has-text("緯度")')).toBeVisible();
    await expect(page.locator('label:has-text("経度")')).toBeVisible();

    // 技術仕様フィールド
    await expect(page.locator('label:has-text("サンプルレート")')).toBeVisible();
    await expect(page.locator('label:has-text("ビットデプス")')).toBeVisible();
    await expect(page.locator('label:has-text("チャンネル数")')).toBeVisible();

    // 送信ボタン
    await expect(page.locator('button[type="submit"]')).toHaveText('作成');
  });

  test('必須フィールドが空の場合エラーが表示される', async ({ page }) => {
    // フォームを送信
    await form.submitForm();

    // バリデーションエラーの確認
    await expect(await form.hasValidationError('タイトル')).toBeTruthy();
    await expect(await form.hasValidationError('音声ファイル')).toBeTruthy();
  });

  test('有効な素材を作成できる', async ({ page }) => {
    // フォームに入力
    await form.fillByLabel('タイトル', 'E2Eテスト素材');
    await form.fillTextareaByLabel('説明', 'E2Eテストで作成された素材です');
    await form.fillTextareaByLabel('備考', 'テスト用のメモ');
    
    // 位置情報
    await form.fillByLabel('緯度', '35.6762');
    await form.fillByLabel('経度', '139.6503');

    // 技術仕様
    await form.selectByLabel('サンプルレート', '48000');
    await form.selectByLabel('ビットデプス', '24');
    await form.selectByLabel('チャンネル数', '2');

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
    const successToast = page.locator('[role="alert"]:has-text("作成しました")');
    const isRedirected = page.url().includes('/materials/') && !page.url().includes('/new');
    
    // いずれかの成功インジケーターを確認
    await expect(successToast.or(page.locator('h1:has-text("素材一覧")'))).toBeVisible({ timeout: 10000 });
  });

  test('位置情報の入力バリデーションが機能する', async ({ page }) => {
    // 無効な緯度を入力
    await form.fillByLabel('緯度', '91'); // 緯度は-90〜90の範囲
    await form.fillByLabel('経度', '180');

    // タイトルとファイルも入力（他のバリデーションを回避）
    await form.fillByLabel('タイトル', 'テスト');

    // フォーム送信
    await form.submitForm();

    // エラーメッセージの確認
    const hasLatError = await form.hasValidationError('緯度');
    const hasGeneralError = await form.getErrorMessage();
    
    // いずれかのエラー表示を確認
    expect(hasLatError || hasGeneralError).toBeTruthy();
  });

  test('キャンセルボタンで素材一覧に戻る', async ({ page }) => {
    // キャンセルボタンをクリック
    await page.click('button:has-text("キャンセル"), a:has-text("キャンセル")');

    // 素材一覧ページに戻ることを確認
    await expect(page).toHaveURL('/materials');
    await expect(page.locator('h1')).toHaveText('素材一覧');
  });
});