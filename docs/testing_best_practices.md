# テストのベストプラクティス

このドキュメントは、Phonicaプロジェクトの開発を通じて学んだテストに関する重要な教訓をまとめたものです。

## 1. テストの基本原則

### 1.1 ユーザー視点でテストを書く

**❌ 悪い例：実装の詳細をテスト**
```javascript
// URLパラメータ変更後のfetch呼び出しを詳細に検証
await waitFor(() => {
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch).toHaveBeenLastCalledWith(
    expect.stringContaining('title=Forest')
  );
});
```

**✅ 良い例：ユーザーが体験する結果をテスト**
```javascript
// フィルター適用後の表示内容を検証
await waitFor(() => {
  expect(screen.getByText('Forest Recording')).toBeInTheDocument();
  expect(screen.queryByText('City Ambience')).not.toBeInTheDocument();
});
```

### 1.2 適切な抽象化レベルでテストする

- **ユニットテスト**: 個々の関数やコンポーネントの独立した動作を検証
- **統合テスト**: 複数のコンポーネントの連携を検証（ただし、ブラウザAPIの完全なシミュレーションは避ける）
- **E2Eテスト**: ブラウザAPIとの実際の連携を検証

## 2. React Testing Libraryでの注意点

### 2.1 Next.jsのルーティングとの統合

**問題**: `useSearchParams`のモックを変更してもコンポーネントが自動的に再レンダリングされない

**解決策**:
1. URLパラメータの変更が正しく要求されることを確認
2. 特定のパラメータでの初期表示をテスト

```javascript
// URLパラメータの変更を確認
expect(mockRouter.replace).toHaveBeenCalledWith(
  expect.stringContaining('title=Forest')
);

// 特定のパラメータでの表示を確認
const searchParams = new URLSearchParams({ title: 'Forest' });
(useSearchParams as jest.Mock).mockReturnValue(searchParams);
render(<MaterialsPage />);
```

### 2.2 モックの適切な使用

**原則**: モックは最小限に留め、テストの意図を明確にする

```javascript
// モーダルコンポーネントの初期レンダリングをクリア
(MaterialDetailModal as jest.Mock).mockClear();

// クリック後の呼び出しを検証
await user.click(screen.getByText('Forest Recording'));
expect(MaterialDetailModal).toHaveBeenLastCalledWith(
  expect.objectContaining({
    isOpen: true,
    materialSlug: 'material-1',
  }),
  {}
);
```

## 3. TDDアプローチの実践

### 3.1 段階的な実装

1. **基本機能のテストから開始**
   - ローディング状態
   - データ表示
   - エラーハンドリング

2. **インタラクションを追加**
   - ユーザー操作（クリック、入力）
   - 状態の変化

3. **エッジケースを考慮**
   - 空のデータ
   - エラー状態
   - 境界値

### 3.2 リファクタリング時の注意

- テストが実装の詳細に依存していると、リファクタリングが困難になる
- 外部から観察可能な動作に焦点を当てることで、内部実装を自由に変更できる

## 4. 実装例：MaterialsPageのテスト改善

### 4.1 問題のあったアプローチ

複雑な状態管理とURLパラメータの同期をテストしようとして、以下の問題が発生：

- `jest.isolateModules`でのモジュール状態管理の複雑さ
- `router.replace`とuseSearchParamsの連携のシミュレーション困難
- テストが脆弱で保守が困難

### 4.2 改善後のアプローチ

1. **実装をシンプルに**
   - 不要な状態管理を削除
   - URLパラメータを信頼できる唯一の情報源として使用

2. **テストをユーザー中心に**
   - フィルター入力とボタンクリックの動作を確認
   - 表示結果の検証に焦点

3. **モックを最小限に**
   - fetchのレスポンスのみモック
   - ルーティング関数の呼び出しを検証

## 5. フォームテストのベストプラクティス

### 5.1 HTML5フォームバリデーションとJSDOM

**問題**: JSDOMではHTML5のフォームバリデーション（required属性など）が完全にサポートされていない

**解決策**:
```javascript
// フォーム送信を直接シミュレート
const submitForm = async () => {
  const form = screen.getByTestId('form-id') as HTMLFormElement;
  const submitEvent = new Event('submit', { 
    bubbles: true, 
    cancelable: true 
  });
  fireEvent(form, submitEvent);
};
```

### 5.2 FormDataオブジェクトのモック検証

**問題**: jest-fetch-mockではFormDataがモックオブジェクトとして扱われる

**解決策**:
```javascript
// ❌ 悪い例
expect(fetchMock).toHaveBeenCalledWith('/api/endpoint', {
  method: 'POST',
  body: expect.any(FormData), // FormDataコンストラクタが認識されない
});

// ✅ 良い例
expect(fetchMock).toHaveBeenCalledWith('/api/endpoint', {
  method: 'POST',
  body: expect.objectContaining({
    append: expect.any(Function), // FormDataのメソッドで検証
  }),
});
```

### 5.3 日付入力フィールドのテスト

**問題**: datetime-local型のinputは不正な値を受け付けない

**解決策**:
```javascript
// fireEventで直接値を設定
fireEvent.input(dateInput, { target: { value: 'invalid-date' } });

// または、valueプロパティを直接操作
Object.defineProperty(dateInput, 'value', {
  writable: true,
  value: 'invalid-date'
});
```

## 6. チェックリスト

テストを書く前に確認すること：

- [ ] このテストは何を検証しようとしているか明確か？
- [ ] ユーザーの視点から見て意味のあるテストか？
- [ ] 実装の詳細に依存しすぎていないか？
- [ ] モックは最小限に留められているか？
- [ ] テストが失敗した時、何が問題かすぐに理解できるか？
- [ ] フォームテストの場合、JSDOMの制限を考慮しているか？

## 7. 参考リンク

- [Testing Library - Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds - Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- [Next.js - Testing](https://nextjs.org/docs/testing)

## 8. E2Eテストのベストプラクティス

### 8.1 E2Eテストの目的

E2Eテストは、実際のユーザーの操作フローを検証し、システム全体が正しく動作することを確認します。

### 8.2 Playwrightを使用したE2Eテスト

**テストの構成**:
```typescript
// e2e/tests/materials/materials-list.spec.ts
import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';

test.describe('素材一覧ページ', () => {
  test('素材一覧ページが正しく表示される', async ({ page }) => {
    // ユーザーの操作をシミュレート
    await page.goto('/materials');
    
    // ユーザーが見る内容を検証
    await expect(page.locator('h1')).toHaveText('素材一覧');
  });
});
```

### 8.3 E2Eテストの原則

1. **ユーザー視点での記述**
   - 実装の詳細ではなく、ユーザーの操作と期待される結果に焦点

2. **独立性の確保**
   - 各テストは他のテストに依存しない
   - テストデータの作成と削除を各テストで管理

3. **適切な待機処理**
   ```typescript
   // ❌ 悪い例：固定時間の待機
   await page.waitForTimeout(3000);
   
   // ✅ 良い例：条件ベースの待機
   await page.waitForSelector('h1:has-text("素材一覧")');
   await page.waitForLoadState('networkidle');
   ```

4. **ヘルパー関数の活用**
   ```typescript
   // 再利用可能なヘルパーを作成
   class NavigationHelper {
     async goToMaterialsPage() {
       await this.page.goto('/materials');
       await this.page.waitForLoadState('networkidle');
     }
   }
   ```

### 8.4 E2Eテストとユニットテストの使い分け

- **ユニットテスト**: 個々の関数やコンポーネントの動作
- **統合テスト**: 複数のコンポーネントの連携
- **E2Eテスト**: ユーザーの実際の操作フロー全体

### 8.5 CI/CDでのE2Eテスト

GitHub Actionsでの実行:
- PRごとにスモークテストを実行
- メインブランチへのマージ前に全E2Eテストを実行
- 失敗時はスクリーンショットとトレースを保存

### 8.6 E2Eテストの保守

**画面変更時の対応**:
- UIやフローの変更時は、必ず関連するE2Eテストも更新
- セレクターの変更に追従
- 新機能には対応するE2Eテストを追加
- 削除された機能のテストは削除

### 8.7 E2Eテストの実行時間短縮戦略

**問題**: 全テストを一度に実行すると時間がかかりすぎ、開発効率が低下する

**解決策**: タグベースの段階的実行

```typescript
// テストにタグを付ける
test.describe('@smoke @critical Equipment Master', () => {
  test('基本動作確認', async ({ page }) => {
    // スモークテスト
  });
});

test.describe('@master Equipment Master', () => {
  test('機材の登録・編集・削除', async ({ page }) => {
    // 機能テスト
  });
});
```

**実行戦略**:
```bash
# 開発時（1-2分）
npm run e2e:smoke        # 基本動作のみ確認

# コミット前（2-4分）
npm run e2e:materials    # 変更した機能のみ

# PR作成前（5-10分）
npm run e2e:smoke        # スモークテスト
npm run e2e:cross-browser -- --grep "@critical"  # 重要機能のクロスブラウザ確認
```

### 8.8 react-hook-formのバリデーションテスト

**問題**: react-hook-formの'onSubmit'モードでは、フィールドのfocus/blur操作ではバリデーションが発火しない

**解決策**:
```typescript
// ❌ 悪い例：フィールド操作でバリデーションを期待
await nameInput.focus();
await nameInput.fill('');
await nameInput.blur();
await expect(page.getByText('Name is required')).toBeVisible(); // 失敗する

// ✅ 良い例：フォーム送信でバリデーションを発火
await page.click('button[type="submit"]');
await page.waitForTimeout(500); // バリデーション表示を待つ
await expect(page.locator('[role="dialog"]').getByText('Name is required.')).toBeVisible();
```

### 8.9 ダミーファイルアップロードのテスト

**Playwrightでのファイルアップロード方法**:
```typescript
// 実ファイルを使用する場合
const testFilePath = path.join(process.cwd(), 'test-files', 'test.wav');
await page.locator('input[type="file"]').setInputFiles(testFilePath);

// ダミーファイルを生成する場合
const fileContent = Buffer.from('dummy audio content');
await page.locator('input[type="file"]').setInputFiles({
  name: 'test-audio.wav',
  mimeType: 'audio/wav',
  buffer: fileContent
});
```

### 8.10 動的UIのテスト戦略

**問題**: モーダルやドロップダウンなど、動的に表示される要素のテストが不安定

**解決策**:
```typescript
// モーダルの開閉をヘルパーで管理
class ModalHelper {
  async waitForOpen() {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
  }
  
  async waitForClose() {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  }
}

// 使用例
await modal.waitForOpen();
await expect(modal.getTitle()).resolves.toBe('Edit Equipment');
await modal.clickButton('Save');
await modal.waitForClose();
```

### 8.11 テストデータ管理のベストプラクティス

**マルチ言語対応のテストデータ**:
```typescript
// シードデータに多様なコンテンツを含める
const testMaterials = [
  { title: '🌄 森の朝', location: '東京都' },        // 絵文字 + 日本語
  { title: 'Ocean Waves', location: 'California' }, // 英語
  { title: 'カフェの午後 ☕', location: 'Kyoto' },   // 混在
];
```

**テストの独立性を保つ**:
- 各テスト実行でE2Eデータベースを再作成
- テストごとに必要なデータのみを作成
- テスト終了時のクリーンアップは不要（次回実行時に再作成）

### 8.12 E2Eテストのデバッグテクニック

**1. 特定のテストのみ実行**:
```bash
# grepパターンで絞り込み
npm run e2e:chrome -- --grep "Equipment.*validation"
```

**2. ヘッドレスモードを無効化**:
```bash
npm run e2e:chrome -- --headed
```

**3. デバッグポイントの挿入**:
```typescript
test('デバッグが必要なテスト', async ({ page }) => {
  await page.goto('/materials');
  await page.pause(); // ここで一時停止してDevToolsで確認
  await page.click('button');
});
```

**4. スクリーンショットの活用**:
```typescript
// 失敗時に自動的にスクリーンショットが保存される設定
use: {
  screenshot: 'only-on-failure',
  trace: 'on-first-retry',
}
```

### 8.13 パフォーマンスを考慮したE2Eテスト設計

**並列実行の最適化**:
- 独立したテストは並列実行可能
- データベース操作を伴うテストは順次実行
- ブラウザコンテキストの適切な分離

**待機時間の最適化**:
```typescript
// ❌ 悪い例：固定の待機時間
await page.waitForTimeout(5000);

// ✅ 良い例：条件ベースの待機
await page.waitForResponse(response => 
  response.url().includes('/api/materials') && 
  response.status() === 200
);
```

### 8.14 E2Eテストのアンチパターン

**1. 実装の詳細に依存したテスト**:
- CSSクラス名に依存しない
- 内部の状態管理に依存しない
- APIの呼び出し回数を検証しない

**2. 脆弱なセレクター**:
```typescript
// ❌ 悪い例
await page.click('.MuiButton-root.MuiButton-containedPrimary');

// ✅ 良い例
await page.click('button:has-text("Save")');
await page.click('[role="button"][aria-label="Save"]');
```

**3. テスト間の依存関係**:
- 前のテストの結果に依存しない
- 共有状態を作らない
- 各テストで必要なセットアップを行う

---

最終更新日: 2025年6月2日