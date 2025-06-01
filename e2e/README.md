# E2Eテスト

このディレクトリには、Playwrightを使用したEnd-to-End（E2E）テストが含まれています。

## セットアップ

```bash
# Playwrightのインストール（初回のみ）
npm install -D @playwright/test playwright

# ブラウザのインストール（初回のみ）
npx playwright install
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
```

## ディレクトリ構造

```
e2e/
├── fixtures/          # テストフィクスチャとカスタム設定
├── helpers/           # 再利用可能なヘルパー関数
├── tests/            # テストファイル
│   ├── materials/    # 素材関連のテスト
│   ├── master/       # マスタデータ関連のテスト
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
  await expect(page.locator('h1')).toHaveText('素材一覧');
  
  // ユーザー操作
  await page.click('button:has-text("新規作成")');
});
```

### ヘルパーの使用

```typescript
import { NavigationHelper } from '../helpers/navigation';
import { FormHelper } from '../helpers/form';

test('フォームテスト', async ({ page }) => {
  const navigation = new NavigationHelper(page);
  const form = new FormHelper(page);
  
  await navigation.goToNewMaterialPage();
  await form.fillByLabel('タイトル', 'テスト素材');
  await form.submitForm();
});
```

## 環境変数

- `PLAYWRIGHT_BASE_URL`: テストのベースURL（デフォルト: http://localhost:3000）

## CI/CD設定

GitHub Actionsでの実行例：

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run e2e
  env:
    PLAYWRIGHT_BASE_URL: ${{ env.DEPLOY_URL }}
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

2. **セレクターの選択**
   - テキストベースのセレクター（`text=""`、`has-text=""`）を優先
   - `data-testid`属性の使用も検討

3. **テストの独立性**
   - 各テストは他のテストに依存しない
   - テストデータは各テストで作成・削除

4. **適切な待機**
   - 固定の`wait`ではなく、条件ベースの待機を使用
   - `waitForSelector`、`waitForLoadState`、`expect().toBeVisible()`など

5. **デバッグ**
   - `page.screenshot()`でスクリーンショットを保存
   - `page.pause()`でテストを一時停止してデバッグ