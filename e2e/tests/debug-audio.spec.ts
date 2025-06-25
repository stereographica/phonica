import { test, expect } from '../fixtures/test-fixtures';
import { MaterialHelper } from '../helpers/material-helper';
import { WaitHelper } from '../helpers/wait';
import { ModalHelper } from '../helpers/modal';

test.describe('Audio Player Debug', () => {
  let materialHelper: MaterialHelper;
  let waitHelper: WaitHelper;
  let modalHelper: ModalHelper;

  test.beforeEach(async ({ page }) => {
    materialHelper = new MaterialHelper(page);
    waitHelper = new WaitHelper(page);
    modalHelper = new ModalHelper(page);

    await page.goto('/dashboard');
    await waitHelper.waitForNetworkStable();
  });

  test('Debug: Audio要素の存在確認', async ({ page }) => {
    // 1. 素材詳細モーダルを開く
    await materialHelper.navigateToExistingMaterial('温泉の音 ♨️');
    await modalHelper.waitForOpen();

    // 2. AudioPlayerコンテナの存在確認
    const audioPlayerContainer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayerContainer).toBeVisible({ timeout: 10000 });
    console.log('✅ AudioPlayerコンテナが表示されました');

    // 3. Playボタンの存在確認
    const playButton = page.locator('button[title="Play"]');
    await expect(playButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Playボタンが表示されました');

    // 4. audio要素の存在確認
    const audioExists = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return {
        exists: !!audio,
        src: audio?.src || null,
        readyState: audio?.readyState || null,
        paused: audio?.paused || null,
        duration: audio?.duration || null,
      };
    });
    console.log('🔍 Audio要素の状態:', audioExists);

    // 5. WaveSurferの状態確認
    const wavesurferState = await page.evaluate(() => {
      const waveform = document.querySelector('[id^="wavesurfer"]');
      const canvas = document.querySelector('canvas');
      return {
        waveformExists: !!waveform,
        canvasExists: !!canvas,
        waveformId: waveform?.id || null,
      };
    });
    console.log('🔍 WaveSurfer要素の状態:', wavesurferState);

    // 6. エラーメッセージの確認
    const errorMessage = page.locator('.text-destructive');
    const hasError = await errorMessage.isVisible().catch(() => false);
    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log('❌ エラーメッセージ:', errorText);
    } else {
      console.log('✅ エラーメッセージはありません');
    }

    // 7. ネットワークリクエストの確認
    const audioRequests = await page.evaluate(() => {
      const requests = performance
        .getEntriesByType('resource')
        .filter(
          (entry) => entry.name.includes('/api/materials/') && entry.name.includes('download'),
        );
      return requests.map((req) => ({
        url: req.name,
        duration: req.duration,
        status: (req as unknown as Record<string, unknown>).responseStatus || 'unknown',
      }));
    });
    console.log('🔍 音声ファイルのリクエスト:', audioRequests);
  });

  test('Debug: Playボタンクリック後の状態', async ({ page }) => {
    // 素材詳細モーダルを開く
    await materialHelper.navigateToExistingMaterial('温泉の音 ♨️');
    await modalHelper.waitForOpen();

    // AudioPlayerコンテナを待つ
    const audioPlayerContainer = page.locator('[data-testid="audio-player"]');
    await expect(audioPlayerContainer).toBeVisible({ timeout: 10000 });

    // Playボタンをクリック
    const playButton = page.locator('button[title="Play"]');
    await playButton.click();
    console.log('✅ Playボタンをクリックしました');

    // クリック後の状態を確認
    await page.waitForTimeout(2000); // 2秒待機

    // audio要素の状態
    const audioStateAfterClick = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return {
        exists: !!audio,
        paused: audio?.paused || null,
        currentTime: audio?.currentTime || null,
        playing: audio ? !audio.paused && !audio.ended : null,
      };
    });
    console.log('🔍 クリック後のaudio要素の状態:', audioStateAfterClick);

    // data-playing属性の確認
    const dataPlaying = await audioPlayerContainer.getAttribute('data-playing');
    console.log('🔍 data-playing属性:', dataPlaying);

    // ボタンのtitle属性の確認
    const buttonTitle = await playButton.getAttribute('title').catch(() => null);
    const pauseButton = page.locator('button[title="Pause"]');
    const pauseButtonExists = await pauseButton.isVisible().catch(() => false);
    console.log('🔍 ボタンの状態:', {
      playButtonTitle: buttonTitle,
      pauseButtonExists: pauseButtonExists,
    });
  });
});
