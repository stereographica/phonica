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

---

最終更新日: 2025年6月1日