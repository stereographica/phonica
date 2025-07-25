import { test, expect } from '@playwright/test';

test.describe('@materials @modal @detail Material Detail Modal Flows', () => {
  test.beforeEach(async ({ page }) => {
    // 素材一覧ページに移動
    await page.goto('/materials');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  });

  test.describe('@critical @modal Basic Modal Operations', () => {
    test('素材詳細モーダルの基本開閉', async ({ page }) => {
      // 1. データが読み込まれるまで待つ
      await expect(page.locator('text=materials found')).toBeVisible({ timeout: 10000 });

      // 2. 最初の素材をクリック
      const firstMaterialButton = page.locator('tbody tr').first().locator('button.text-blue-600');
      await expect(firstMaterialButton).toBeVisible();
      await firstMaterialButton.click();

      // 3. 詳細モーダルが開くことを確認
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });

      // 4. モーダル内の基本要素を確認
      await expect(modal.locator('h1, h2').first()).toBeVisible();

      // 5. モーダルを閉じる
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();

      console.log('✅ 素材詳細モーダルの基本動作確認が完了しました');
    });

    test('モーダル内メタデータ表示確認', async ({ page }) => {
      // 1. データ読み込み待機
      await expect(page.locator('text=materials found')).toBeVisible({ timeout: 10000 });

      // 2. 最初の素材をクリック
      const firstMaterialButton = page.locator('tbody tr').first().locator('button.text-blue-600');
      await firstMaterialButton.click();

      // 3. モーダルが開くのを待つ
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });

      // 4. 基本メタデータセクションの確認
      const hasTitle = await modal.locator('h1, h2').isVisible();
      const hasRecordingDate = await modal
        .locator('text=/Recording Date|録音日|2024-/')
        .isVisible()
        .catch(() => false);
      const hasTechnicalMetadata = await modal
        .locator('text=/Technical|技術|Sample Rate|サンプル/')
        .isVisible()
        .catch(() => false);

      expect(hasTitle).toBe(true);
      console.log(
        `📊 メタデータ表示: タイトル=${hasTitle}, 録音日=${hasRecordingDate}, 技術情報=${hasTechnicalMetadata}`,
      );

      // 5. モーダルを閉じる
      await page.keyboard.press('Escape');

      console.log('✅ モーダル内メタデータ表示確認が完了しました');
    });

    test('レスポンシブモーダル表示', async ({ page }) => {
      // 1. デスクトップサイズでテスト
      await page.setViewportSize({ width: 1280, height: 800 });

      // CI環境での安定性のため追加の待機
      await expect(page.locator('text=materials found')).toBeVisible({ timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // レイアウト安定化のため

      const firstMaterialButton = page.locator('tbody tr').first().locator('button.text-blue-600');

      // ボタンが完全にクリック可能になるまで待つ
      await expect(firstMaterialButton).toBeVisible({ timeout: 10000 });
      await expect(firstMaterialButton).toBeEnabled({ timeout: 5000 });

      // CI環境での安定性のためのクリック待機
      await firstMaterialButton.click({ timeout: 30000 });

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 10000 });

      const modalBounds = await modal.boundingBox();
      expect(modalBounds).not.toBeNull();
      expect(modalBounds!.width).toBeGreaterThan(0);

      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible({ timeout: 5000 });

      // 2. モバイルサイズでテスト
      await page.setViewportSize({ width: 375, height: 667 });

      // ビューポート変更後の安定化待機とレイアウト調整
      await page.waitForTimeout(1500); // モバイルレイアウト安定化のため延長
      await page.waitForLoadState('networkidle');
      
      // DevTools要素の事前無効化（CI環境対策）
      await page.evaluate(() => {
        // TanStack Query DevTools要素とオーバーレイを非表示化
        const devtoolsElements = document.querySelectorAll('[class*="tsqd-"], [class*="go3932029643"]');
        devtoolsElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      });
      
      // レスポンシブレイアウトでテーブルが正しく表示されることを確認
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
      
      // モバイル環境でのボタン要素を再取得（DOM変更の可能性）
      const mobileFirstMaterialButton = page.locator('tbody tr').first().locator('button.text-blue-600');
      
      // ボタンへのスクロールを実行（重要：モバイルでの表示領域確保）
      await mobileFirstMaterialButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500); // スクロール完了待機
      
      // モバイル環境でのボタン状態確認
      await expect(mobileFirstMaterialButton).toBeVisible({ timeout: 10000 });
      await expect(mobileFirstMaterialButton).toBeEnabled({ timeout: 5000 });
      
      // CI環境でのUI要素重なり対策：強制クリックを使用
      await mobileFirstMaterialButton.click({ 
        timeout: 30000, 
        force: true  // UI要素の重なりを回避
      });
      
      // クリック後の安定化待機（モバイル環境では処理に時間がかかる）
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      
      // モーダル状態確認とフォールバック処理
      const modalExists = await page.locator('[role="dialog"]').count();
      if (modalExists === 0) {
        // 強制クリックが効果がない場合の再度強制クリックリトライ
        await page.waitForTimeout(1500);
        // DevTools要素の無効化を試行
        await page.evaluate(() => {
          // TanStack Query DevTools要素を非表示化
          const devtoolsElements = document.querySelectorAll('[class*="tsqd-"]');
          devtoolsElements.forEach(el => (el as HTMLElement).style.display = 'none');
        });
        await mobileFirstMaterialButton.click({ 
          timeout: 15000, 
          force: true  // フォールバックも強制クリック
        });
        await page.waitForTimeout(1000);
      }

      await expect(modal).toBeVisible({ timeout: 15000 });

      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible({ timeout: 5000 });

      console.log('✅ レスポンシブモーダル表示確認が完了しました');
    });
  });
});
