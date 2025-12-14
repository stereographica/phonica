# 開発ワークフロー

## 1. タスクの選択と分析

### GitHub Issues から選択

```bash
# 優先度順に確認
# priority: critical > high > medium > low
```

- 優先度の高いissueから選択
- issue の内容を詳しく分析
- 要件と制約を特定
- 実装ステップを計画

### ドキュメント確認

必ず `/docs/` ディレクトリ内のドキュメントを確認：

- `docs/claude/` - 開発ガイドライン
- `docs/development_process.md` - 開発プロセス詳細
- 関連する技術ドキュメント

## 2. ブランチ作成

```bash
# mainブランチを最新に更新
git checkout main
git pull origin main

# 作業ブランチ作成
git checkout -b feature/issue-123-description
```

### ブランチ命名規則

- `feature/issue-{番号}-{説明}` - 新機能
- `fix/issue-{番号}-{説明}` - バグ修正
- `test/issue-{番号}-{説明}` - テスト追加
- `refactor/issue-{番号}-{説明}` - リファクタリング

## 3. Issue ステータス更新

GitHub issue のステータスを `status: in progress` に更新

## 4. TDD による実装

### テスト駆動開発サイクル

1. **テスト作成** - 失敗するテストを書く
2. **実装** - テストをパスする最小限のコードを書く
3. **リファクタリング** - コードを改善
4. **確認** - `npm test` でテストがパスすることを確認

### 実装時の注意点

- [ ] 既存の類似機能を確認（重複実装を避ける）
- [ ] 同名または類似名の関数・コンポーネントをチェック
- [ ] 重複するAPIエンドポイントがないか確認
- [ ] 共通化可能な処理を特定
- [ ] パスエイリアス `@/` を使用
- [ ] TypeScript strict モードに準拠
- [ ] Prettier/ESLint ルールに従う

### UI/フロー変更時の追加作業

UI やユーザーフローを変更した場合：

1. **E2Eテストの更新**
   - セレクターの更新（HTML構造変更時）
   - テストステップの更新（フロー変更時）
   - 新機能のE2Eテスト追加（適切なタグ付き）
   - 削除した機能のE2Eテスト削除

2. **ヘルパークラスの更新**
   - `/e2e/helpers/` のヘルパークラスを更新（共通パターン変更時）

3. **データモデル変更時**
   - シードデータの更新
   - ワークフローテストの更新

## 5. コミット前のチェック

**重要**: 以下のすべてをパスしない限りコミットしない

```bash
# 1. テスト実行
npm test

# 2. Lint チェック
npm run lint

# 3. 型チェック
npx tsc --noEmit

# 4. 開発サーバー起動確認
npm run dev
```

- [ ] 全テストがパス
- [ ] カバレッジ80%以上（全指標）
- [ ] lintエラーなし
- [ ] 型エラーなし
- [ ] console.log削除
- [ ] 未使用のインポート削除

## 6. コミット

```bash
# ステージング
git add .

# コミット（pre-commitフックが自動実行される）
git commit -m "feat: Add feature description"
```

**注意**: pre-commit フックで全テストとE2Eテストが実行されます。失敗した場合はコミットできません。

### Pre-commit フックのタイムアウト対応

- **通常実行時間**: 5-10分
- **最大タイムアウト**: 15分
- タイムアウトした場合はユーザーに報告し、指示を待つ

## 7. プッシュ前のチェック（CI相当）

**必須**: プッシュ前に以下をすべて実行

```bash
# 1. CI環境テスト
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false

# 2. ビルド確認
DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build

# 3. Lint & 型チェック
npm run lint && npx tsc --noEmit

# 4. セキュリティ監査
npm audit --audit-level=moderate

# 5. E2Eテスト（必須）
npm run e2e

# または、変更した機能のみ（高速化）
npm run e2e:smoke      # 基本動作（必須）
npm run e2e:master     # マスターデータ変更時
npm run e2e:materials  # 素材管理変更時
npm run e2e:workflows  # ワークフロー変更時
```

## 8. プッシュ

```bash
git push origin feature/issue-123-description
```

## 9. Pull Request 作成

### PR 本文フォーマット

```markdown
# {タスク名}

## 概要

[簡潔な要約]

## 実装ステップ

1. [ステップと結果]
2. [ステップと結果]
   ...

## 最終成果物

[作成・変更内容の詳細]

## 課題対応（該当する場合）

- 発生した問題と解決策
- 今後の注意点

## 関連issue

- Closes #[issue番号]
```

### PR作成前のチェック

- [ ] ブランチ名が規則に従っている
- [ ] 全テストがパス
- [ ] E2Eテストがパス
- [ ] カバレッジ80%以上
- [ ] CI相当のチェックがすべてパス
- [ ] ドキュメント更新済み（必要な場合）
- [ ] `Closes #[issue番号]` を記載

## 10. レビュー対応

### ユーザーレビュー

- 指摘事項を確認
- 必要な修正を実施
- 修正後は再度全チェック実行
- 追加のコミット・プッシュ

### バグ報告への対応

1. バグを修正
2. 修正内容をテストに追加（エッジケース）
3. 全チェックを再実行
4. プッシュ

## 11. マージ後

- ユーザーがPRをマージ（Claudeはマージしない）
- 実装レポート作成（`/impl_reports/`）
- 発見した問題をissue化

## 12. 問題の起票

開発中に発見した改善点や問題：

### Issue テンプレート

```markdown
## 対象箇所

[ファイルパス、関数名等]

## 問題点

[具体的な問題の説明]

## 対応方針

[提案する解決策]

## 関連情報

[参考URL、関連issue等]

## 受け入れ条件

- [ ] [完了条件1]
- [ ] [完了条件2]
```

### ラベル付与

適切なラベルを選択：

- `priority: {critical|high|medium|low}`
- `type: {bug|enhancement|feature}`
- `area: {frontend|backend|database|e2e}`

## 重要な原則

### ゼロトレランスポリシー

- ❌ テスト失敗でのコミット禁止
- ❌ main ブランチへの直接プッシュ禁止
- ❌ CI失敗の放置禁止
- ❌ `--no-verify` の無断使用禁止

### ベストプラクティス

- ✅ TDD を実践
- ✅ 小さく頻繁なコミット
- ✅ CI失敗は即座に修正
- ✅ 重複実装を避ける
- ✅ ドキュメントを常に最新に保つ
- ✅ UI変更時はE2Eテストを必ず更新

## トラブルシューティング

### よくある問題と解決策

1. **useSearchParams エラー**
   - Suspense boundary で囲む

2. **FormData パースエラー**
   - Server Actions を使用
   - multipart/form-data ヘッダーを確認

3. **日付フォーマットエラー**
   - 柔軟なパターンを使用
   - ロケールに依存しない実装

4. **E2Eテストタイムアウト**
   - 10分タイムアウトを使用
   - 特定のテストのみ実行して問題を特定

5. **カバレッジ不足**
   - `npm test -- --coverage` で確認
   - 未カバーの分岐を特定
   - テストケースを追加
