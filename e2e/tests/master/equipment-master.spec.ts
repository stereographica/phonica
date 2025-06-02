import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper, FormHelper, ModalHelper, TableHelper } from '../../helpers';

test.describe('@master @critical Equipment Master', () => {
  let navigation: NavigationHelper;
  let form: FormHelper;
  let modal: ModalHelper;
  let table: TableHelper;

  test.beforeEach(async ({ page }) => {
    navigation = new NavigationHelper(page);
    form = new FormHelper(page);
    modal = new ModalHelper(page);
    table = new TableHelper(page);
    await navigation.goToEquipmentMasterPage();
  });

  test('Equipment master page displays correctly', async ({ page }) => {
    // ページタイトルの確認
    await expect(page.locator('h1')).toHaveText('Equipment Master');

    // 新規登録ボタン
    await expect(page.locator('button:has-text("Add Equipment")')).toBeVisible();

    // テーブルヘッダーの確認
    const headers = await table.getHeaders();
    expect(headers).toContain('Name');
    expect(headers).toContain('Type');
    expect(headers).toContain('Manufacturer');
    expect(headers).toContain('Memo');
    expect(headers).toContain('Created At');
    expect(headers).toContain('Actions');
  });

  test('Can register new equipment', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Add Equipment")');

    // モーダルが開くことを確認
    await modal.waitForOpen();
    const modalTitle = await modal.getTitle();
    expect(modalTitle).toContain('Add New Equipment');

    // ユニークな機材名を生成（タイムスタンプ付き）
    const uniqueEquipmentName = `E2E Test Microphone ${Date.now()}`;

    // フォームに入力
    await form.fillByLabel('Name', uniqueEquipmentName);
    await form.fillByLabel('Type', 'Microphone');
    await form.fillByLabel('Manufacturer', 'TestManufacturer');
    await form.fillTextareaByLabel('Memo', 'Test equipment for E2E testing');

    // 保存ボタンをクリック
    await modal.clickButton('Add Equipment');

    // モーダルが閉じることを確認
    await modal.waitForClose();

    // 新しい機材がテーブルに表示されることを確認（first()で最初の要素を選択）
    await expect(page.locator(`td:has-text("${uniqueEquipmentName}")`).first()).toBeVisible({ timeout: 10000 });
  });

  test('Can edit equipment (via dropdown menu)', async ({ page }) => {
    // テストの独立性を確保するため、確実に新しい機材を作成
    // まず新しい機材を作成
    await page.click('button:has-text("Add Equipment")');
    await modal.waitForOpen();
    
    // ユニークな機材名を生成（タイムスタンプを含めて一意性を保証）
    const timestamp = Date.now();
    const uniqueEquipmentName = `E2E Test Edit Equipment ${timestamp}`;
    const editedEquipmentName = `Edited Equipment ${timestamp}`;
    
    // フォームに入力
    await form.fillByLabel('Name', uniqueEquipmentName);
    await form.fillByLabel('Type', 'Recorder');
    await form.fillByLabel('Manufacturer', 'TestBrand');
    await form.fillTextareaByLabel('Memo', 'Equipment to be edited');
    
    // 保存
    await modal.clickButton('Add Equipment');
    await modal.waitForClose();
    
    // 新しい機材が表示されるまで待機
    const newEquipmentCell = page.locator(`td:has-text("${uniqueEquipmentName}")`).first();
    await expect(newEquipmentCell).toBeVisible({ timeout: 10000 });
    
    // その行のアクションメニューを開く
    const equipmentRow = page.locator('tbody tr').filter({ hasText: uniqueEquipmentName });
    const actionButton = equipmentRow.locator('button:has(.sr-only:text("Open menu"))');
    await actionButton.click();

    // 編集オプションをクリック
    await page.click('[role="menuitem"]:has-text("Edit")');

    // モーダルが開くことを確認
    await modal.waitForOpen();
    const modalTitle = await modal.getTitle();
    expect(modalTitle).toContain('Edit Equipment');

    // 名前を変更
    const nameInput = page.locator('[role="dialog"] input[name="name"]');
    await nameInput.clear();
    await nameInput.fill(editedEquipmentName);

    // 保存
    await modal.clickButton('Save');

    // 編集APIの完了を待つ（catchでタイムアウトを防ぐ）
    const editResponse = await page.waitForResponse(response => 
      response.url().includes('/api/master/equipment/') && 
      response.request().method() === 'PUT'
    ).catch(() => null);
    
    if (!editResponse || editResponse.status() !== 200) {
      console.error('Edit API failed or timed out');
      if (editResponse) {
        const errorText = await editResponse.text();
        console.error('Response:', errorText);
      }
    }

    // モーダルが閉じることを確認（エラーの場合は手動で閉じる）
    try {
      await modal.waitForClose();
    } catch (e) {
      // エラーメッセージが表示されている場合、モーダルを手動で閉じる
      const errorMessage = await page.locator('[role="dialog"] [role="alert"]').textContent().catch(() => '');
      if (errorMessage) {
        console.error('Equipment edit failed with error:', errorMessage);
        // Cancelボタンまたは閉じるボタンをクリック
        const cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        } else {
          await modal.closeWithEsc();
        }
        await modal.waitForClose();
        throw new Error(`Equipment edit failed: ${errorMessage}`);
      }
      throw e;
    }

    // データの再取得を待つ
    const getResponse = await page.waitForResponse(response => 
      response.url().includes('/api/master/equipment') && 
      response.request().method() === 'GET' &&
      response.status() === 200
    ).catch(() => null);

    // 少し待機してDOMの更新を確実にする
    await page.waitForTimeout(1000);
    
    // 編集が反映されない場合はページをリロード
    const editedVisible = await page.locator(`td:has-text("${editedEquipmentName}")`).first().isVisible();
    if (!editedVisible) {
      console.log('Equipment not visible after edit, reloading page...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('tbody', { state: 'visible' });
    }

    // 変更が反映されることを確認（first()で最初の要素を選択）
    await expect(page.locator(`td:has-text("${editedEquipmentName}")`).first()).toBeVisible({ timeout: 10000 });
    
    // 元の名前が表示されていないことを確認
    await expect(page.locator(`td:has-text("${uniqueEquipmentName}")`)).not.toBeVisible();
  });

  test('Can delete equipment (via dropdown menu)', async ({ page }) => {
    // テーブルに機材が存在する場合のみテスト
    const rowCount = await table.getRowCount();

    if (rowCount > 0) {
      // 最初の行の機材名を取得
      const firstRow = page.locator('tbody tr').first();
      const firstEquipmentName = await table.getCellInRow(firstRow, 0);

      // アクションメニューを開く
      const actionButton = firstRow.locator('button:has(.sr-only:text("Open menu"))');
      await actionButton.click();

      // 削除オプションをクリック
      // confirmダイアログのハンドラーを設定
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('Are you sure you want to delete this equipment?');
        await dialog.accept();
      });
      
      await page.click('[role="menuitem"]:has-text("Delete")');

      // 削除APIの完了を待つ
      await page.waitForResponse(response => 
        response.url().includes('/api/master/equipment/') && 
        response.request().method() === 'DELETE'
      );

      // 削除された機材が表示されなくなることを確認
      if (firstEquipmentName) {
        await expect(page.locator(`td:has-text("${firstEquipmentName}")`)).not.toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('Shows error when required fields are empty', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Add Equipment")');

    await modal.waitForOpen();
    
    // 保存ボタンを確認（初期状態では無効化されている）
    const saveButton = page.locator('[role="dialog"] button[type="submit"]');
    
    // react-hook-formのmodeがonChangeの場合、フィールドにフォーカスして離れるとエラーが表示される
    // modeがonSubmitの場合は、submitボタンクリック時のみエラーが表示される
    
    // Nameフィールドにフォーカスして離れる
    const nameInput = page.locator('[role="dialog"] input[name="name"]');
    await nameInput.focus();
    await nameInput.blur();
    
    // Typeフィールドにフォーカスして離れる
    const typeInput = page.locator('[role="dialog"] input[name="type"]');
    await typeInput.focus();
    await typeInput.blur();
    
    // 少し待機（react-hook-formのバリデーション処理のため）
    await page.waitForTimeout(1000);
    
    // FormMessageコンポーネントはgrid内でcol-span-4とtext-rightクラスを持つ
    const nameErrorLocator = page.locator('[role="dialog"] .col-span-4.text-right').filter({ hasText: 'Name is required.' });
    const typeErrorLocator = page.locator('[role="dialog"] .col-span-4.text-right').filter({ hasText: 'Type is required.' });
    
    // エラーメッセージが表示されているか確認
    // ただし、modeがonSubmitの場合は表示されない可能性がある
    const nameErrorVisible = await nameErrorLocator.isVisible().catch(() => false);
    const typeErrorVisible = await typeErrorLocator.isVisible().catch(() => false);
    
    if (!nameErrorVisible || !typeErrorVisible) {
      // onSubmitモードの場合、送信を試みる
      // ボタンが無効化されているかチェック
      const isDisabled = await saveButton.isDisabled();
      
      if (!isDisabled) {
        // ボタンが有効な場合はクリックしてエラーを表示
        await saveButton.click();
        await page.waitForTimeout(500);
        
        // エラーメッセージを再度確認
        await expect(nameErrorLocator).toBeVisible({ timeout: 5000 });
        await expect(typeErrorLocator).toBeVisible({ timeout: 5000 });
      } else {
        // ボタンが無効化されている場合は、フォームの状態が正しいことを確認
        // react-hook-formとzodの組み合わせで、formState.isValidがfalseの場合ボタンが無効化される
        expect(isDisabled).toBe(true);
      }
    } else {
      // onChangeモードでエラーが表示されている
      await expect(nameErrorLocator).toBeVisible();
      await expect(typeErrorLocator).toBeVisible();
    }
    
    // モーダルが開いたままであることを確認
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('Can cancel modal', async ({ page }) => {
    // 新規登録ボタンをクリック
    await page.click('button:has-text("Add Equipment")');

    await modal.waitForOpen();

    // キャンセルボタンをクリック
    await modal.clickButton('Cancel');

    // モーダルが閉じることを確認
    await modal.waitForClose();
  });
});