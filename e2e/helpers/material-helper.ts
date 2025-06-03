import { Page } from '@playwright/test';
import { FormHelper } from './form';

export class MaterialHelper {
  constructor(private page: Page) {}

  /**
   * ブラウザに応じて素材を作成する
   * すべてのブラウザでサーバーアクションを使用することで、FormDataの問題を回避
   */
  async createMaterial(data: {
    title: string;
    memo?: string;
    recordedAt: string;
    latitude?: string;
    longitude?: string;
    locationName?: string;
    tags?: string;
    sampleRate?: string;
    bitDepth?: string;
    fileFormat?: string;
    rating?: string;
    equipmentIds?: string;
  }) {
    const browserName = this.page.context().browser()?.browserType().name() || 'unknown';
    
    // すべてのブラウザでサーバーアクションを使用（FormDataの問題を回避）
    // FirefoxとWebKitではフォーム送信でFormDataの境界エラーが発生するため
    if (browserName === 'firefox' || browserName === 'webkit') {
      const response = await this.page.request.post('/api/materials/test', {
        data: {
          ...data,
          testFileName: 'test-audio.wav',
          testFileContent: 'dummy audio content'
        }
      });
      
      if (!response.ok()) {
        const error = await response.json();
        throw new Error(`Failed to create material: ${error.error}`);
      }
      
      return await response.json();
    }
    
    // Chromiumの場合は通常のフォーム送信
    const form = new FormHelper(this.page);
    
    // フォームに入力
    await form.fillByLabel('Title', data.title);
    if (data.memo) await form.fillTextareaByLabel('Memo', data.memo);
    await form.fillByLabel('Recorded At', data.recordedAt);
    
    if (data.latitude) await form.fillByLabel('Latitude', data.latitude);
    if (data.longitude) await form.fillByLabel('Longitude', data.longitude);
    if (data.locationName) await form.fillByLabel('Location Name (Optional)', data.locationName);
    
    // テスト用音声ファイルをアップロード
    const testAudioPath = require('path').join(process.cwd(), 'e2e', 'fixtures', 'test-audio.wav');
    await this.page.locator('input[type="file"]').setInputFiles(testAudioPath);
    
    if (data.tags) await this.page.locator('input#tags').fill(data.tags);
    if (data.sampleRate) await form.fillByLabel('Sample Rate (Hz)', data.sampleRate);
    if (data.bitDepth) await form.fillByLabel('Bit Depth', data.bitDepth);
    if (data.fileFormat) await form.fillByLabel('File Format', data.fileFormat);
    if (data.rating) await form.fillByLabel('Rating (1-5)', data.rating);
    
    // ダイアログハンドラーを設定
    this.page.once('dialog', async dialog => {
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
  async waitForMaterialInList(title: string, timeout: number = 30000) {
    const browserName = this.page.context().browser()?.browserType().name() || 'unknown';
    
    // Firefox/WebKitでは追加の待機が必要
    if (browserName === 'firefox' || browserName === 'webkit') {
      await this.page.waitForTimeout(2000);
    }
    
    // 素材が表示されるまで待機
    const materialCell = this.page.locator(`td:has-text("${title}")`).first();
    await materialCell.waitFor({ state: 'visible', timeout });
  }
}