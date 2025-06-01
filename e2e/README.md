# E2Eテスト

このディレクトリには、Playwrightを使用したEnd-to-End（E2E）テストが含まれています。

## セットアップ

```bash
# Playwrightのインストール（初回のみ）
npm install -D @playwright/test playwright

# ブラウザのインストール（初回のみ）
npx playwright install

# テストデータの投入
npm run seed:test
# または特定のデータベースに投入
DATABASE_URL=postgresql://user:pass@localhost:5432/test_db npm run seed:test
```

## テストの実行

```bash
# すべてのE2Eテストを実行
npm run e2e

# UIモードでテストを実行（デバッグに便利）
npm run e2e:ui

# デバッグモードでテストを実行
npm run e2e:debug

# テストレポートを表示
npm run e2e:report

# 特定のテストファイルを実行
npm run e2e tests/materials/materials-list.spec.ts

# ヘッドレスモードを無効にして実行
npm run e2e -- --headed
```

## ディレクトリ構造

```
e2e/
├── fixtures/          # テストフィクスチャとカスタム設定
│   └── test-fixtures.ts  # 基本的なテスト設定
├── helpers/           # 再利用可能なヘルパー関数
│   ├── form.ts       # フォーム操作ヘルパー
│   ├── modal.ts      # モーダル操作ヘルパー
│   ├── navigation.ts # ページナビゲーションヘルパー
│   ├── table.ts      # テーブル操作ヘルパー
│   ├── wait.ts       # 待機処理ヘルパー
│   └── index.ts      # ヘルパーのエクスポート
├── tests/            # テストファイル
│   ├── materials/    # 素材関連のテスト
│   │   ├── create-material.spec.ts
│   │   └── materials-list.spec.ts
│   ├── master/       # マスタデータ関連のテスト
│   │   ├── equipment-master.spec.ts
│   │   └── tag-master.spec.ts
│   └── smoke.spec.ts # スモークテスト
└── README.md         # このファイル
```

## テストの書き方

### 基本的なテスト

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test('テストの説明', async ({ page }) => {
  // ページに移動
  await page.goto('/materials');
  
  // 要素の存在を確認
  await expect(page.locator('h1')).toHaveText('Materials');
  
  // ユーザー操作
  await page.click('button:has-text("Create New")');
});
```

### ヘルパーの使用

```typescript
import { NavigationHelper, FormHelper, WaitHelper } from '../helpers';

test('フォームテスト', async ({ page }) => {
  const navigation = new NavigationHelper(page);
  const form = new FormHelper(page);
  const wait = new WaitHelper(page);
  
  await navigation.goToNewMaterialPage();
  await form.fillByLabel('Title', 'Test Material');
  await form.submitForm();
  
  // API呼び出しの完了を待機
  await wait.waitForApiResponse('/api/materials', 'POST');
  
  // トーストメッセージを確認
  await wait.waitForToast('Material created successfully');
});
```

### 高度なヘルパーの使用例

```typescript
import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper, TableHelper, ModalHelper } from '../../helpers';

test('テーブルとモーダルの操作', async ({ page }) => {
  const navigation = new NavigationHelper(page);
  const table = new TableHelper(page);
  const modal = new ModalHelper(page);
  
  await navigation.goToEquipmentMasterPage();
  
  // テーブルのヘッダーを確認
  const headers = await table.getHeaders();
  expect(headers).toContain('Name');
  
  // 特定の行でアクションを実行
  await table.clickActionInRow('Zoom H6', 'Edit');
  
  // モーダルの操作
  await modal.waitForOpen();
  expect(await modal.getTitle()).toBe('Edit Equipment');
  await modal.clickButton('Save');
  await modal.waitForClose();
});
```

## 環境変数

- `PLAYWRIGHT_BASE_URL`: テストのベースURL（デフォルト: http://localhost:3000）
- `DATABASE_URL`: テストデータ投入先のデータベースURL
- `REDIS_URL`: バックグラウンドジョブ用のRedis URL

## テストデータの管理

### テストデータの投入

```bash
# デフォルトのテストデータベースに投入
npm run seed:test

# 特定のデータベースに投入
DATABASE_URL=postgresql://user:pass@localhost:5432/e2e_test npm run seed:test
```

### テストデータの内容

- **タグ**: 自然音、都市音、環境音、水音
- **機材**: Zoom H6、Sony PCM-D100、Rode NTG3、Sennheiser MKH 416
- **プロジェクト**: 森林環境音プロジェクト、都市サウンドスケープ
- **素材**: 森の朝、渓流の音、新宿駅の喧騒、雨の日の街角

## CI/CD設定

GitHub Actionsでの実行例：

```yaml
e2e:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:14
      env:
        POSTGRES_PASSWORD: postgres
        POSTGRES_USER: postgres
        POSTGRES_DB: test_db
    redis:
      image: redis:7
      
  steps:
    - name: Setup test database
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      run: |
        npx prisma migrate deploy
        npm run seed:test

    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium

    - name: Run E2E tests
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
        REDIS_URL: redis://localhost:6379
      run: npm run e2e
```

## トラブルシューティング

### テストがタイムアウトする

- ネットワークが遅い場合は、`playwright.config.ts`でタイムアウトを調整
- `waitForLoadState('networkidle')`の使用を検討

### 要素が見つからない

- セレクターが正しいか確認
- 要素が動的に生成される場合は`waitFor`を使用
- UIモード（`npm run e2e:ui`）でセレクターを確認

### テストが不安定（flaky）

- 明示的な待機を追加（`waitForSelector`、`waitForLoadState`）
- テスト間の依存関係を排除
- テストデータのクリーンアップを確実に実行

## ベストプラクティス

1. **ユーザー視点でテストを書く**
   - 実装の詳細ではなく、ユーザーの操作フローをテスト
   - UIテキストは実際の表示と一致させる（英語版UI）

2. **セレクターの選択**
   - テキストベースのセレクター（`text=""`、`has-text=""`）を優先
   - `data-testid`属性の使用も検討
   - 役割ベースのセレクター（`role="dialog"`、`role="alert"`）を活用

3. **テストの独立性**
   - 各テストは他のテストに依存しない
   - テストデータは事前に`seed:test`で準備
   - 必要に応じてテスト内でデータを作成・削除

4. **適切な待機**
   - 固定の`wait`ではなく、条件ベースの待機を使用
   - ヘルパーの`WaitHelper`を活用
   - API呼び出しの完了を`waitForApiResponse`で待機

5. **ヘルパーの活用**
   - 共通操作は必ずヘルパーを使用
   - 新しい共通パターンはヘルパーに追加
   - ヘルパーの組み合わせで複雑な操作を実現

6. **デバッグ**
   - `page.screenshot()`でスクリーンショットを保存
   - `page.pause()`でテストを一時停止してデバッグ
   - UIモード（`npm run e2e:ui`）で視覚的にデバッグ

## 拡張ガイド

### 新しいヘルパーの追加

1. `e2e/helpers/`ディレクトリに新しいファイルを作成
2. Pageオブジェクトを受け取るクラスとして実装
3. `e2e/helpers/index.ts`からエクスポート

### カスタムアサーションの追加

```typescript
// e2e/fixtures/custom-matchers.ts
export async function toHaveToast(page: Page, text: string) {
  const toast = page.locator('[role="alert"]:has-text("' + text + '")');
  await expect(toast).toBeVisible({ timeout: 5000 });
}
```