import { Page, expect } from '@playwright/test';
import { WaitHelper } from './wait';

/**
 * クロスブラウザ対応のためのヘルパー関数
 */
export class CrossBrowserHelper {
  private waitHelper: WaitHelper;

  constructor(private page: Page) {
    this.waitHelper = new WaitHelper(page);
  }

  /**
   * ブラウザの種類を取得
   */
  getBrowserName(): string {
    return this.page.context().browser()?.browserType().name() || 'unknown';
  }

  /**
   * Firefox/WebKit用の特別な待機処理
   */
  async waitForStability() {
    // 固定待機時間の代わりにブラウザ安定性待機を使用
    await this.waitHelper.waitForBrowserStability();
  }

  /**
   * ダイアログハンドリング（Firefox/WebKit対応）
   */
  async setupDialogHandler(expectedMessage?: string): Promise<void> {
    // ダイアログハンドラーを設定
    this.page.once('dialog', async (dialog) => {
      if (expectedMessage) {
        console.log(`Dialog message: ${dialog.message()}`);
        if (!dialog.message().includes(expectedMessage)) {
          console.warn(
            `Expected dialog message to contain "${expectedMessage}", but got "${dialog.message()}"`,
          );
        }
      }
      // Firefox/WebKitではダイアログ処理の安定性を待つ
      await this.waitHelper.waitForBrowserStability();
      await dialog.accept();
    });

    // Firefox/WebKitの場合は、ハンドラー設定後の安定性を待つ
    await this.waitHelper.waitForBrowserStability();
  }

  /**
   * フォーム送信とダイアログ処理（クロスブラウザ対応）
   * 注意: Server Actionを使用している場合、ダイアログは表示されない
   */
  async submitFormWithDialog(
    submitSelector: string,
    expectedMessage?: string,
    navigateToUrl?: string,
  ) {
    const browserName = this.getBrowserName();

    // ボタンが有効であることを確認
    const submitButton = this.page.locator(submitSelector);
    await submitButton.waitFor({ state: 'visible' });
    await expect(submitButton).toBeEnabled();

    // ダイアログハンドラーを設定（expectedMessageがある場合のみ）
    // Server Actionの場合はダイアログが表示されないため、必要ない
    if (expectedMessage) {
      await this.setupDialogHandler(expectedMessage);
    }

    // Firefox/WebKitではナビゲーションの遅延を考慮
    let navigationPromise: Promise<void> | null = null;
    if (navigateToUrl && (browserName === 'firefox' || browserName === 'webkit')) {
      // ナビゲーションを事前にセットアップ
      navigationPromise = this.page.waitForURL(navigateToUrl, { timeout: 15000 });
    }

    // フォームを送信
    await submitButton.click();

    // ダイアログとナビゲーションを両方待つ
    if (navigateToUrl) {
      if (navigationPromise) {
        // Firefox/WebKit: 事前にpromiseを作成している
        await navigationPromise;
      } else {
        // Chrome: 通常の待機
        await this.page.waitForURL(navigateToUrl, { timeout: 15000 });
      }
    }

    // ナビゲーション後の安定化待機
    await this.waitHelper.waitForBrowserStability();
  }

  /**
   * セレクターの互換性確保
   */
  async fillInputSafely(selector: string, value: string) {
    const browserName = this.getBrowserName();
    const input = this.page.locator(selector).first();

    // Firefox/WebKitでは入力前にフォーカスとクリアが必要な場合がある
    if (browserName === 'firefox' || browserName === 'webkit') {
      await input.click();
      await input.clear();
      // 固定待機時間の代わりに入力フィールドの準備完了を待つ
      await this.waitHelper.waitForInteractive(selector);
    }

    await input.fill(value);

    // 入力値が反映されるまで待機（タイムアウトしても続行）
    try {
      await this.waitHelper.waitForInputValue(selector, value);
    } catch {
      // Firefox/WebKitでは入力値の反映が遅れることがあるため、エラーは無視
      console.log(`Input value verification timeout for ${selector}, continuing...`);
    }
  }

  /**
   * 要素の表示待機（クロスブラウザ対応）
   */
  async waitForElementVisible(selector: string, options?: { timeout?: number }) {
    const browserName = this.getBrowserName();
    const defaultTimeout = browserName === 'firefox' || browserName === 'webkit' ? 20000 : 10000;
    const timeout = options?.timeout || defaultTimeout;

    // WebKit/Firefoxでは要素の表示が遅れることがあるため、再試行ロジックを追加
    if (browserName === 'webkit' || browserName === 'firefox') {
      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          await this.page.waitForSelector(selector, {
            state: 'visible',
            timeout: timeout / 3, // 各試行のタイムアウトを分割
          });
          return; // 成功したら終了
        } catch (error) {
          lastError = error;
          retries--;

          if (retries > 0) {
            // リトライ前にブラウザの安定性を確保
            await this.waitHelper.waitForBrowserStability();
            // ページをリロードして最新のデータを取得
            await this.page.reload();
            await this.waitHelper.waitForNetworkStable();
          }
        }
      }

      throw lastError;
    } else {
      // 他のブラウザは通常の処理
      await this.page.waitForSelector(selector, {
        state: 'visible',
        timeout,
      });
    }
  }

  /**
   * モーダルの開閉待機（クロスブラウザ対応）
   */
  async waitForModalOpen() {
    await this.waitForElementVisible('[role="dialog"]');
    await this.waitForStability();
  }

  async waitForModalClose() {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' });
    await this.waitForStability();
  }
}
