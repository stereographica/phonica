# タスク完了時のチェックリスト

## 🚨 コミット前の必須チェック

すべてのチェック項目をパスしない限り、コミットしてはいけません。

### 1. テスト実行

```bash
npm test
```

- [ ] 全テストがパス
- [ ] 新規ファイルには対応するテストファイルを作成済み
- [ ] 修正したコンポーネントのテストを更新済み
- [ ] カバレッジ（Statements, Branches, Functions, Lines）が全て80%以上

### 2. Lint チェック

```bash
npm run lint
```

- [ ] lint エラーなし
- [ ] 警告がある場合は修正または正当な理由を確認

### 3. 型チェック

```bash
npx tsc --noEmit
```

- [ ] 型エラーなし
- [ ] any 型の使用を最小限に抑えている

### 4. 開発サーバー起動確認

```bash
npm run dev
```

- [ ] コンパイルエラーなし
- [ ] ページが正常に表示される
- [ ] 変更箇所の動作確認完了

### 5. コード品質

- [ ] console.log やデバッグコードを削除済み
- [ ] 未使用のインポートを削除済み
- [ ] コメントが適切（不要なコメントは削除）
- [ ] 変数名・関数名が適切で分かりやすい

### 6. UI/E2Eテストの更新

UI や操作フローを変更した場合：

- [ ] 関連する E2E テストのセレクターを更新
- [ ] 操作フローが変更された場合はテストステップを更新
- [ ] 新機能には対応する E2E テストを追加（適切なタグ付き）
- [ ] 削除した機能の E2E テストを削除

## 🛡️ プッシュ前の必須チェック（CI相当）

CI で失敗すると手戻りが大きいため、以下を必ず実行してください。

### 1. CI環境テスト

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false
```

- [ ] CI環境と同じ条件でテストがパス

### 2. ビルド確認

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build
```

- [ ] ビルドエラーなし
- [ ] useSearchParams() が Suspense でラップされている
- [ ] 動的インポートが正しく動作

### 3. Lint & 型チェック

```bash
npm run lint && npx tsc --noEmit
```

- [ ] 両方ともエラーなし

### 4. セキュリティ監査

```bash
npm audit --audit-level=moderate
```

- [ ] moderate以上の脆弱性なし

### 5. E2Eテスト（必須）

```bash
npm run e2e
```

または、変更した機能のみ実行（高速化）：

```bash
npm run e2e:smoke      # 基本動作確認（必須）
npm run e2e:master     # マスターデータ変更時
npm run e2e:materials  # 素材管理変更時
npm run e2e:workflows  # ワークフロー変更時
```

- [ ] E2Eテストがパス（または関連するテストグループがパス）
- [ ] 新規テストには適切なタグを付与（@smoke, @master, @materials, @workflow, @critical）

## 📝 Pull Request 作成前

### 1. ブランチ確認

- [ ] ブランチ名が命名規則に従っている
  - `feature/issue-{番号}-{説明}`
  - `fix/issue-{番号}-{説明}`
  - `test/issue-{番号}-{説明}`
  - `refactor/issue-{番号}-{説明}`

### 2. コミットメッセージ

- [ ] 適切なプレフィックス使用（feat:, fix:, test:, refactor:, docs:, chore:）
- [ ] 変更内容が明確

### 3. ドキュメント更新

- [ ] CLAUDE.md の更新が必要な場合は更新済み
- [ ] 新機能の場合は関連ドキュメントを更新

### 4. Issue との関連付け

- [ ] PR 本文に `Closes #[issue番号]` を記載

### 5. テストカバレッジ

- [ ] 全カバレッジ指標（Statements, Branches, Functions, Lines）が80%超
- [ ] 新規ファイルには必ずテストファイルを作成

### 6. E2Eテストの完全実行

- [ ] `npm run e2e` で全E2Eテストがパス（推奨）
- [ ] または、全ての関連するテストグループがパス

## ⚠️ 禁止事項

絶対に行ってはいけないこと：

- ❌ テスト失敗状態でのコミット
- ❌ main ブランチへの直接コミット・プッシュ
- ❌ `--no-verify` フラグの無断使用
- ❌ カバレッジ80%未満でのマージ
- ❌ E2Eテスト失敗状態でのマージ
- ❌ CI失敗状態でのマージ
- ❌ デバッグコード（console.log等）の残留

## 🎯 ベストプラクティス

- ✅ TDD（Test Driven Development）を実践
- ✅ 小さく頻繁なコミット
- ✅ コミット前に必ず全チェック実行
- ✅ CI失敗時は即座に修正
- ✅ レビュー指摘事項は速やかに対応
- ✅ UI変更時は関連するE2Eテストを必ず更新

## 📊 Pre-commit フックについて

プロジェクトには pre-commit フックが設定されており、以下が自動実行されます：

- lint-staged による自動フォーマット・lint
- 全テストの実行
- E2Eテストの実行

**重要**: pre-commit フックが失敗した場合はコミットできません。必ず修正してからコミットしてください。

`--no-verify` フラグは明示的な指示がある場合を除き使用禁止です。
