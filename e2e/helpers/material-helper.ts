import { Page } from '@playwright/test';
import { FormHelper } from './form';
import { WaitHelper } from './wait';
import { ModalHelper } from './modal';
import path from 'path';

export class MaterialHelper {
  private waitHelper: WaitHelper;
  private modalHelper: ModalHelper;

  constructor(private page: Page) {
    this.waitHelper = new WaitHelper(page);
    this.modalHelper = new ModalHelper(page);
  }

  /**
   * ブラウザに応じて素材を作成する
   * Server Actionsに移行したため、すべてのブラウザで通常のフォーム送信が可能
   */
  async createMaterial(data: {
    title: string;
    memo?: string;
    recordedAt: string;
    latitude?: string;
    longitude?: string;
    locationName?: string;
    tags?: string | string[];
    sampleRate?: string;
    bitDepth?: string;
    fileFormat?: string;
    rating?: string;
    equipmentIds?: string;
    audioFilePath?: string;
  }) {
    // 新しい素材作成ページに移動
    await this.navigateToCreateMaterial();

    // Server Actionsに移行したため、すべてのブラウザで通常のフォーム送信が可能
    const form = new FormHelper(this.page);

    // フォームに入力
    await form.fillByLabel('Title', data.title);
    if (data.memo) await form.fillTextareaByLabel('Memo', data.memo);
    await form.fillByLabel('Recorded At', data.recordedAt);

    if (data.latitude) await form.fillByLabel('Latitude', data.latitude);
    if (data.longitude) await form.fillByLabel('Longitude', data.longitude);
    if (data.locationName) await form.fillByLabel('Location Name (Optional)', data.locationName);

    // 音声ファイルをアップロード
    const audioPath =
      data.audioFilePath || path.join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await this.page.locator('input[type="file"]').setInputFiles(audioPath);

    if (data.tags) {
      const tagsString = Array.isArray(data.tags) ? data.tags.join(', ') : data.tags;
      await this.page.locator('input#tags').fill(tagsString);
    }
    if (data.sampleRate) await form.fillByLabel('Sample Rate (Hz)', data.sampleRate);
    if (data.bitDepth) await form.fillByLabel('Bit Depth', data.bitDepth);
    if (data.fileFormat) await form.fillByLabel('File Format', data.fileFormat);
    if (data.rating) await form.fillByLabel('Rating (1-5)', data.rating);

    // ダイアログハンドラーを設定
    this.page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // フォームを送信
    await this.page.click('button[type="submit"]:has-text("Save Material")');

    // リダイレクトを待つ
    await this.page.waitForURL('/materials', { timeout: 10000 });
  }

  /**
   * 素材一覧ページで特定の素材が表示されるまで待機
   */
  async waitForMaterialInList(title: string, timeout: number = 10000) {
    // 素材が表示されるまで待機
    const materialCell = this.page.locator(`td:has-text("${title}")`).first();
    await materialCell.waitFor({ state: 'visible', timeout });
  }

  /**
   * 既存の素材に移動して詳細モーダルを開く
   * 検索機能を活用して確実に素材を見つけます
   */
  async navigateToExistingMaterial(title: string) {
    // 既存のモーダルが開いている場合は先に閉じる
    if (await this.modalHelper.isOpen()) {
      console.log('既存のモーダルが開いているため、先に閉じます');
      try {
        await this.modalHelper.close();
        await this.modalHelper.waitForClose();
      } catch (error) {
        console.log('モーダルを閉じるのに失敗しました。ESCキーで再試行:', error);
        await this.modalHelper.closeWithEsc();
        await this.page.waitForTimeout(1000);
      }
    }

    // 素材一覧ページに移動
    await this.page.goto('/materials');
    await this.waitHelper.waitForNetworkStable();

    // 検索フィルターを活用して素材を確実に見つける
    const searchQuery = title.split(' ')[0]; // タイトルの最初の単語で検索

    try {
      // フィルターフィールドを特定（複数の可能性に対応）
      const filterInput = this.page
        .locator('input[placeholder*="Filter"], input[placeholder*="title"], input[type="text"]')
        .first();
      if (await filterInput.isVisible({ timeout: 2000 })) {
        await filterInput.fill(searchQuery);

        // フィルター適用ボタンを探してクリック
        const applyButton = this.page.locator(
          'button:has-text("Apply"), button:has-text("Filter")',
        );
        if (await applyButton.isVisible({ timeout: 2000 })) {
          await applyButton.click();
          await this.waitHelper.waitForNetworkStable();
        }
      }
    } catch (error) {
      console.log('検索フィルターが見つからないため、直接素材を検索します:', error);
    }

    // 素材カードをクリックして詳細モーダルを開く
    // より具体的なセレクターを試行し、フォールバック戦略を使用
    let modalOpened = false;

    // CI環境では追加の待機時間を設定
    if (process.env.CI) {
      console.log('CI環境検出: 追加の待機時間を設定');
      await this.page.waitForTimeout(2000);
    }

    try {
      // 方法1: テーブル内の素材タイトルボタンを探す（最も具体的）
      const materialButton = this.page.locator('button.text-blue-600').filter({ hasText: title });

      if ((await materialButton.count()) > 0) {
        console.log(`方法1: テーブル内の素材ボタンをクリック（"${title}"）`);
        await materialButton.first().click();
        await this.modalHelper.waitForOpen(); // デフォルトタイムアウトを使用
        modalOpened = true;
      }
    } catch (error) {
      console.log('方法1失敗:', error);
    }

    if (!modalOpened) {
      try {
        // 方法2: テーブル行内のリンクまたはボタンを探す
        const materialInTable = this.page
          .locator(`tbody tr:has-text("${title}") td a, tbody tr:has-text("${title}") button`)
          .first();
        if (await materialInTable.isVisible({ timeout: 2000 })) {
          console.log(`方法2: テーブル内の素材リンクをクリック`);
          await materialInTable.click();
          await this.modalHelper.waitForOpen(); // デフォルトタイムアウトを使用
          modalOpened = true;
        }
      } catch (error) {
        console.log('方法2失敗:', error);
      }
    }

    if (!modalOpened) {
      try {
        // 方法3: テキストによる素材リンクを探す
        const materialLink = this.page.locator(`text="${title}"`).first();
        await materialLink.waitFor({ state: 'visible', timeout: 3000 });
        console.log(`方法3: テキストリンクをクリック`);
        await materialLink.click();
        await this.modalHelper.waitForOpen(); // デフォルトタイムアウトを使用
        modalOpened = true;
      } catch (error) {
        console.log('方法3失敗:', error);
      }
    }

    if (!modalOpened) {
      try {
        // 方法4: より柔軟な検索（部分一致）
        const partialTitle = title.split(' ')[0]; // タイトルの最初の単語で検索
        const partialLink = this.page.locator(`button:has-text("${partialTitle}")`).first();
        await partialLink.waitFor({ state: 'visible', timeout: 3000 });
        console.log(`方法4: 部分一致でクリック（"${partialTitle}"）`);
        await partialLink.click();
        await this.modalHelper.waitForOpen(); // デフォルトタイムアウトを使用
        modalOpened = true;
      } catch (error) {
        console.log('方法4失敗:', error);
      }
    }

    if (!modalOpened) {
      throw new Error(
        `素材 "${title}" のモーダルを開くことができませんでした。すべての方法が失敗しました。`,
      );
    }
  }

  /**
   * 新しい素材作成ページに移動
   */
  async navigateToCreateMaterial() {
    await this.page.goto('/materials/new');
    await this.page.waitForLoadState('networkidle');

    // フォームが表示されるまで待機
    await this.page.waitForSelector('form, [data-testid="material-form"]', {
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * 素材編集ページに移動
   */
  async navigateToEditMaterial(slug: string) {
    await this.page.goto(`/materials/${slug}/edit`);
    await this.page.waitForLoadState('networkidle');

    // 編集フォームが表示されるまで待機
    await this.page.waitForSelector('form, [data-testid="material-edit-form"]', {
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * 素材を削除
   */
  async deleteMaterial(title: string) {
    await this.navigateToExistingMaterial(title);

    // 削除ボタンをクリック
    const deleteButton = this.page.locator('button:has-text("Delete")');
    await deleteButton.click();

    // 確認ダイアログで削除を確認
    const confirmButton = this.page.locator(
      'button:has-text("Delete"), button:has-text("Confirm")',
    );
    await confirmButton.click();

    // 一覧ページに戻るまで待機
    await this.page.waitForURL('/materials', { timeout: 10000 });
  }
}
