import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';
import { FormHelper } from '../../helpers/form';
import { ToastHelper } from '../../helpers/toast';
import path from 'path';

test.describe('@materials Duplicate Title Error Handling', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;
  let toast: ToastHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    toast = new ToastHelper(page);
  });

  test('should display specific error message for duplicate title on create', async ({ page }) => {
    await page.goto('/materials/new');

    // まず1つ目の素材を作成
    const uniqueTitle = `Test Material ${Date.now()}`;
    await form.fillByLabel('Title', uniqueTitle);

    const now = new Date();
    const dateTimeLocal = now.toISOString().slice(0, 16);
    await form.fillByLabel('Recorded At', dateTimeLocal);

    // テスト用の音声ファイルをセット
    const testAudioPath = path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await page.locator('input[type="file"]').setInputFiles(testAudioPath);

    // ファイルのアップロードと分析を待つ
    await page.waitForSelector('text=/File uploaded and analyzed successfully/', {
      timeout: 30000,
    });

    // 保存ボタンが有効になるまで待つ
    await expect(page.getByRole('button', { name: 'Save Material' })).toBeEnabled({
      timeout: 10000,
    });

    // 1つ目の素材を保存
    await page.getByRole('button', { name: 'Save Material' }).click();

    // 保存成功を確認
    await toast.expectSuccessToast('素材を登録しました。');
    await page.waitForURL('/materials');

    // 新規作成画面に戻る
    await page.goto('/materials/new');

    // 同じタイトルで2つ目の素材を作成しようとする
    await form.fillByLabel('Title', uniqueTitle);
    await form.fillByLabel('Recorded At', dateTimeLocal);
    await page.locator('input[type="file"]').setInputFiles(testAudioPath);

    // ファイルのアップロードと分析を待つ
    await page.waitForSelector('text=/File uploaded and analyzed successfully/', {
      timeout: 30000,
    });

    // 保存ボタンが有効になるまで待つ
    await expect(page.getByRole('button', { name: 'Save Material' })).toBeEnabled({
      timeout: 10000,
    });

    // 2つ目の素材を保存しようとする
    await page.getByRole('button', { name: 'Save Material' }).click();

    // 重複エラーメッセージがトーストに表示されることを確認
    await toast.expectErrorToast('そのタイトルの素材は既に存在しています');

    // ページがリダイレクトしていないことを確認
    await expect(page).toHaveURL('/materials/new');
  });

  test('should display specific error message for duplicate title on edit', async ({
    page,
    browserName,
  }) => {
    // 素材一覧ページへ
    await navigation.goToMaterialsPage();
    await page.waitForLoadState('networkidle');

    // テストに使用する特定の素材を探す
    const targetMaterials = ['New York Subway', '温泉の音 ♨️'];
    const materialButtons = page.locator('tbody tr button.text-blue-600');
    const count = await materialButtons.count();

    let sourceMaterial: string | null = null;
    let targetMaterial: string | null = null;

    // 既知の素材を探す
    for (let i = 0; i < count; i++) {
      const title = await materialButtons.nth(i).textContent();
      if (title && targetMaterials.includes(title)) {
        if (!sourceMaterial) {
          sourceMaterial = title;
        } else if (!targetMaterial && title !== sourceMaterial) {
          targetMaterial = title;
          break;
        }
      }
    }

    if (!sourceMaterial || !targetMaterial) {
      // 必要な素材が見つからない場合はスキップ
      test.skip();
      return;
    }

    console.log(`Source material: ${sourceMaterial}`);
    console.log(`Target material: ${targetMaterial}`);

    // 編集対象の素材（sourceMaterial）をクリックしてモーダルを開く
    await page.locator(`tbody tr button.text-blue-600:has-text("${sourceMaterial}")`).click();

    // モーダルが開くのを待つ
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Editボタンをクリック
    await modal.locator('button:has-text("Edit")').click();

    // 編集ページに遷移するのを待つ
    await page.waitForURL(/\/materials\/[^/]+\/edit/);
    await page.waitForLoadState('networkidle');

    // タイトルを別の素材（targetMaterial）と同じに変更
    const titleInput = page.locator('input#title');
    await titleInput.clear();
    await titleInput.fill(targetMaterial!);

    // 入力が正しく反映されたことを確認
    await expect(titleInput).toHaveValue(targetMaterial!);

    // フォーム送信
    await form.submitForm();

    // フォーム送信後の処理を待つ
    await page.waitForTimeout(1000);

    // Firefoxでは追加の待機が必要
    if (browserName === 'firefox') {
      await page.waitForTimeout(500);
    }

    // エラートーストが表示されることを確認
    await toast.expectErrorToast('そのタイトルの素材は既に存在しています');

    // ページがリダイレクトされないことを確認（編集ページに留まる）
    await expect(page).toHaveURL(/\/materials\/[^/]+\/edit/);
  });
});
