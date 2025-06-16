import { test, expect } from '../../fixtures/test-fixtures';
import { FormHelper, ModalHelper } from '../../helpers';

test.describe.skip('@projects @smoke Project CRUD Operations', () => {
  let form: FormHelper;
  let modal: ModalHelper;

  test.beforeEach(async ({ page }) => {
    form = new FormHelper(page);
    modal = new ModalHelper(page);
  });

  test('プロジェクトの一覧表示', async ({ page }) => {
    // プロジェクト一覧ページへ移動
    await page.goto('/projects');
    await expect(page.locator('h1')).toHaveText('Projects');

    // 新規プロジェクトボタンが表示されることを確認
    await expect(page.getByTestId('new-project-button')).toBeVisible();

    // フィルタとソートのUIが表示されることを確認
    await expect(page.locator('label:has-text("Filter by Name")')).toBeVisible();
    await expect(page.getByRole('button', { name: /Sort by/i })).toBeVisible();
  });

  test('新規プロジェクトの作成', async ({ page }) => {
    await page.goto('/projects');

    // 新規プロジェクトボタンをクリック
    await page.getByTestId('new-project-button').click();
    await await modal.waitForOpen();

    // フォームに入力
    const timestamp = Date.now();
    const projectName = `Test Project ${timestamp}`;
    const projectDescription = 'This is a test project created by E2E test';

    await form.fillByLabel('Name', projectName);
    await form.fillTextareaByLabel('Description (Optional)', projectDescription);

    // 保存
    await modal.clickButton('Create Project');
    await modal.waitForClose();

    // トースト通知を確認
    await expect(
      page.locator('[role="alert"]').filter({ hasText: 'created successfully' }),
    ).toBeVisible({
      timeout: 5000,
    });

    // プロジェクトがリストに表示されることを確認
    await expect(page.getByTestId(`project-card-test-project-${timestamp}`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByText(projectDescription)).toBeVisible();
  });

  test('プロジェクトの編集', async ({ page }) => {
    await page.goto('/projects');

    // まず新規プロジェクトを作成
    await page.getByTestId('new-project-button').click();
    await await modal.waitForOpen();

    const timestamp = Date.now();
    const originalName = `Original Project ${timestamp}`;

    await form.fillByLabel('Name', originalName);
    await modal.clickButton('Create Project');
    await modal.waitForClose();

    // 作成されたプロジェクトをクリックして詳細ページへ
    await page.getByTestId(`project-card-original-project-${timestamp}`).click();
    await page.waitForURL(/\/projects\/original-project-/);

    // 編集メニューを開く
    const moreButton = page
      .locator('button')
      .filter({ has: page.locator('[class*="lucide-ellipsis-vertical"]') });
    await moreButton.click();

    // 編集をクリック
    await page.getByRole('menuitem', { name: /Edit Project/i }).click();
    await await modal.waitForOpen();

    // プロジェクト情報を更新
    const updatedName = `Updated Project ${timestamp}`;
    const updatedDescription = 'This description has been updated';

    await form.fillByLabel('Name', updatedName);
    await form.fillTextareaByLabel('Description (Optional)', updatedDescription);

    await modal.clickButton('Save Changes');
    await modal.waitForClose();

    // 更新が反映されていることを確認
    await expect(page.locator('h1')).toHaveText(updatedName);
    await expect(page.getByText(updatedDescription)).toBeVisible();
  });

  test('プロジェクトへの素材追加', async ({ page }) => {
    await page.goto('/projects');

    // 新規プロジェクトを作成
    await page.getByTestId('new-project-button').click();
    await await modal.waitForOpen();

    const timestamp = Date.now();
    const projectName = `Material Test Project ${timestamp}`;

    await form.fillByLabel('Name', projectName);
    await modal.clickButton('Create Project');
    await modal.waitForClose();

    // プロジェクト詳細ページへ
    await page.getByTestId(`project-card-material-test-project-${timestamp}`).click();
    await page.waitForURL(/\/projects\/material-test-project-/);

    // 初期状態では素材がないことを確認
    await expect(page.getByText('No materials in this project yet')).toBeVisible();

    // 素材追加ボタンが表示されることを確認
    await expect(page.getByRole('link', { name: /Add Materials/i })).toBeVisible();
  });

  test('プロジェクトの削除', async ({ page }) => {
    await page.goto('/projects');

    // 削除用のプロジェクトを作成
    await page.getByTestId('new-project-button').click();
    await await modal.waitForOpen();

    const timestamp = Date.now();
    const projectName = `Delete Test Project ${timestamp}`;

    await form.fillByLabel('Name', projectName);
    await modal.clickButton('Create Project');
    await modal.waitForClose();

    // プロジェクト詳細ページへ
    await page.getByTestId(`project-card-delete-test-project-${timestamp}`).click();
    await page.waitForURL(/\/projects\/delete-test-project-/);

    // 削除メニューを開く
    const moreButton = page
      .locator('button')
      .filter({ has: page.locator('[class*="lucide-ellipsis-vertical"]') });
    await moreButton.click();

    // 削除をクリック
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to delete this project?');
      await dialog.accept();
    });

    await page.getByRole('menuitem', { name: /Delete Project/i }).click();

    // プロジェクト一覧ページにリダイレクトされることを確認
    await page.waitForURL('/projects');

    // 削除されたプロジェクトが表示されないことを確認
    await expect(
      page.getByTestId(`project-card-delete-test-project-${timestamp}`),
    ).not.toBeVisible();
  });

  test('プロジェクトのフィルタリング', async ({ page }) => {
    await page.goto('/projects');

    // 複数のプロジェクトを作成
    const timestamp = Date.now();
    const projects = [
      { name: `Alpha Project ${timestamp}`, description: 'First test project' },
      { name: `Beta Project ${timestamp}`, description: 'Second test project' },
      { name: `Gamma Project ${timestamp}`, description: 'Third test project' },
    ];

    for (const project of projects) {
      await page.getByTestId('new-project-button').click();
      await await modal.waitForOpen();

      await form.fillByLabel('Name', project.name);
      await form.fillTextareaByLabel('Description (Optional)', project.description);
      await modal.clickButton('Create Project');
      await modal.waitForClose();

      // 作成後の待機
      await page.waitForTimeout(500);
    }

    // フィルタを適用
    await form.fillByLabel('Filter by Name', 'Beta');
    await page.getByRole('button', { name: /Apply Filters/i }).click();
    await page.waitForLoadState('networkidle');

    // Betaプロジェクトのみ表示されることを確認
    await expect(page.getByText(`Beta Project ${timestamp}`)).toBeVisible();
    await expect(page.getByText(`Alpha Project ${timestamp}`)).not.toBeVisible();
    await expect(page.getByText(`Gamma Project ${timestamp}`)).not.toBeVisible();
  });

  test('プロジェクトのソート', async ({ page }) => {
    await page.goto('/projects');

    // ソートメニューを開く
    await page.getByRole('button', { name: /Sort by/i }).click();

    // ソートオプションが表示されることを確認
    await expect(page.getByRole('menuitem', { name: /Updated \(Newest First\)/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Name \(A-Z\)/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Created \(Newest First\)/i })).toBeVisible();

    // 名前順でソート
    await page.getByRole('menuitem', { name: /Name \(A-Z\)/i }).click();
    await page.waitForLoadState('networkidle');

    // URLにソートパラメータが含まれることを確認
    expect(page.url()).toContain('sortBy=name');
    expect(page.url()).toContain('sortOrder=asc');
  });
});
