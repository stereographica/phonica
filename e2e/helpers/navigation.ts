import { Page } from '@playwright/test';

/**
 * ページナビゲーション用ヘルパー関数
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  /**
   * 素材一覧ページに移動
   */
  async goToMaterialsPage() {
    await this.page.goto('/materials');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 素材作成ページに移動
   */
  async goToNewMaterialPage() {
    await this.page.goto('/materials/new');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 素材編集ページに移動
   */
  async goToEditMaterialPage(slug: string) {
    await this.page.goto(`/materials/${slug}/edit`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * 機材マスタページに移動
   */
  async goToEquipmentMasterPage() {
    await this.page.goto('/master/equipment');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * タグマスタページに移動
   */
  async goToTagMasterPage() {
    await this.page.goto('/master/tags');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * サイドバーからナビゲート
   */
  async navigateViaSidebar(linkText: string) {
    await this.page.click(`nav[role="navigation"] a:has-text("${linkText}")`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * ページが正しくロードされたか確認
   */
  async verifyPageLoaded(expectedTitle: string) {
    await this.page.waitForSelector(`h1:has-text("${expectedTitle}")`, { timeout: 10000 });
  }
}