import { Page } from '@playwright/test';

/**
 * 待機処理用ヘルパー関数
 */
export class WaitHelper {
  constructor(private page: Page) {}

  /**
   * API呼び出しが完了するまで待機
   */
  async waitForApiResponse(
    urlPattern: string | RegExp,
    method: string = 'GET',
    options?: {
      status?: number;
      timeout?: number;
    },
  ) {
    const { status, timeout = 30000 } = options || {};

    await this.page.waitForResponse(
      (response) => {
        const matches =
          typeof urlPattern === 'string'
            ? response.url().includes(urlPattern)
            : urlPattern.test(response.url());
        const statusMatch = status !== undefined ? response.status() === status : response.ok();
        return matches && response.request().method() === method && statusMatch;
      },
      { timeout },
    );
  }

  /**
   * 特定の要素が表示されるまで待機
   */
  async waitForElementVisible(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout,
    });
  }

  /**
   * 特定の要素が非表示になるまで待機
   */
  async waitForElementHidden(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, {
      state: 'hidden',
      timeout,
    });
  }

  /**
   * ローディングインジケーターが消えるまで待機
   */
  async waitForLoadingComplete() {
    // ローディングインジケーターのセレクタ（プロジェクトに応じて調整）
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[role="progressbar"]',
    ];

    for (const selector of loadingSelectors) {
      const element = this.page.locator(selector);
      if ((await element.count()) > 0) {
        await this.waitForElementHidden(selector);
      }
    }
  }

  /**
   * トーストメッセージが表示されるまで待機
   */
  async waitForToast(text?: string) {
    const toastSelector = '[role="status"][data-radix-collection-item]';
    await this.waitForElementVisible(toastSelector);

    if (text) {
      await this.page.waitForSelector(`${toastSelector}:has-text("${text}")`, {
        state: 'visible',
        timeout: 5000,
      });
    }
  }

  /**
   * ページナビゲーション完了まで待機
   */
  async waitForNavigation(url?: string | RegExp) {
    if (url) {
      await this.page.waitForURL(url, { timeout: 30000 });
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * データが読み込まれるまで待機
   * テーブルやリストなどのデータ表示を待つ
   */
  async waitForDataLoad(options?: { minRows?: number; selector?: string; timeout?: number }) {
    const { minRows = 1, selector = 'tbody tr', timeout = 10000 } = options || {};

    await this.page.waitForFunction(
      ({ selector, minRows }) => {
        const rows = document.querySelectorAll(selector);
        return rows.length >= minRows;
      },
      { selector, minRows },
      { timeout },
    );
  }

  /**
   * ネットワークアクティビティが安定するまで待機
   * networkidleよりも高速な代替手段
   */
  async waitForNetworkStable(options?: { maxInflightRequests?: number; timeout?: number }) {
    const { timeout = 10000 } = options || {};

    try {
      // まずDOMの読み込みを待つ
      await this.page.waitForLoadState('domcontentloaded');

      // 特定のAPIレスポンスを待つか、ネットワークが安定するまで待つ
      await Promise.race([
        this.page.waitForLoadState('networkidle', { timeout }),
        this.page.waitForTimeout(500), // 最小待機時間を短縮
      ]);
    } catch {
      // タイムアウトしても続行
    }
  }

  /**
   * フォームの入力値が反映されるまで待機
   * Firefox/WebKitでの入力遅延に対応
   */
  async waitForInputValue(
    selector: string,
    expectedValue: string,
    options?: {
      timeout?: number;
    },
  ) {
    const { timeout = 5000 } = options || {};

    await this.page.waitForFunction(
      ({ selector, expectedValue }) => {
        const input = document.querySelector(selector) as HTMLInputElement;
        return input && input.value === expectedValue;
      },
      { selector, expectedValue },
      { timeout },
    );
  }

  /**
   * 要素のテキストが表示されるまで待機
   * 動的に更新されるコンテンツに対応
   */
  async waitForText(
    selector: string,
    text: string,
    options?: {
      exact?: boolean;
      timeout?: number;
    },
  ) {
    const { exact = false, timeout = 10000 } = options || {};

    await this.page.waitForFunction(
      ({ selector, text, exact }) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const content = element.textContent || '';
        return exact ? content.trim() === text : content.includes(text);
      },
      { selector, text, exact },
      { timeout },
    );
  }

  /**
   * 要素がインタラクティブになるまで待機
   * クリック可能、入力可能な状態を待つ
   */
  async waitForInteractive(
    selector: string,
    options?: {
      timeout?: number;
    },
  ) {
    const { timeout = 10000 } = options || {};

    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });

    // 要素が有効かつクリック可能であることを確認
    await this.page.waitForFunction(
      ({ selector }) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (!el) return false;

        // disabled属性がないこと
        if (el.hasAttribute('disabled')) return false;

        // aria-disabledがfalseまたは未設定
        const ariaDisabled = el.getAttribute('aria-disabled');
        if (ariaDisabled === 'true') return false;

        // ボタンやリンクの場合、pointer-eventsがnoneでないこと
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none') return false;

        return true;
      },
      { selector },
      { timeout },
    );
  }

  /**
   * モーダルやダイアログの表示アニメーションが完了するまで待機
   */
  async waitForAnimation(
    selector: string,
    options?: {
      timeout?: number;
    },
  ) {
    const { timeout = 3000 } = options || {};

    // 要素が表示されるのを待つ
    await this.page.waitForSelector(selector, { state: 'visible', timeout });

    // CSSアニメーションまたはトランジションの完了を待つ
    await this.page
      .waitForFunction(
        ({ selector }) => {
          const element = document.querySelector(selector) as HTMLElement;
          if (!element) return false;

          const style = window.getComputedStyle(element);
          const animations = element.getAnimations?.() || [];

          // アニメーションが実行中でないこと
          if (animations.length > 0) {
            return animations.every(
              (animation) => animation.playState === 'finished' || animation.playState === 'idle',
            );
          }

          // トランジションが完了していること
          const transitionDuration = parseFloat(style.transitionDuration) || 0;
          const animationDuration = parseFloat(style.animationDuration) || 0;

          return transitionDuration === 0 && animationDuration === 0;
        },
        { selector },
        { timeout: 1000 }, // アニメーション待機は短めに
      )
      .catch(() => {
        // アニメーション検出に失敗しても続行
      });
  }

  /**
   * ブラウザ固有の安定性待機
   * Firefox/WebKitで発生する特有の問題に対処
   */
  async waitForBrowserStability() {
    const browserName = this.page.context().browser()?.browserType().name() || 'unknown';

    if (browserName === 'firefox' || browserName === 'webkit') {
      // DOM更新の反映を待つ
      await this.page.evaluate(() => {
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });
      });
    }
  }
}
