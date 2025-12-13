# 開発コマンド一覧

## 開発サーバー

```bash
# 開発サーバー起動（Next.js + Worker）
npm run dev

# Next.js のみ起動（Turbopack使用）
npm run dev:next

# Worker のみ起動
npm run dev:worker
```

## ビルド・デプロイ

```bash
# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# Worker（本番環境）
npm run worker:prod
```

## コード品質

```bash
# ESLint 実行
npm run lint

# ESLint 自動修正
npm run lint -- --fix

# TypeScript 型チェック
npx tsc --noEmit
```

## テスト

### ユニットテスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm test -- --watch

# カバレッジ確認
npm test -- --coverage

# 特定ファイルのテスト
npm test -- path/to/file.test.ts
```

### E2Eテスト（Chrome専用）

```bash
# 全E2Eテスト実行
npm run e2e

# UIモード（デバッグ用）
npm run e2e:ui

# デバッグモード
npm run e2e:debug

# レポート表示
npm run e2e:report

# タグ別実行
npm run e2e:smoke      # スモークテスト
npm run e2e:master     # マスターデータ機能
npm run e2e:materials  # 素材管理機能
npm run e2e:workflows  # ワークフロー

# CI環境用
npm run e2e:ci

# 特定テスト実行
npm run e2e -- --grep "test-name"

# ヘッドモード（ブラウザ表示）
npm run e2e -- --headed
```

### E2Eデータベース管理

```bash
# データベースセットアップ
npm run e2e:db:setup

# クリーンアップ
npm run e2e:db:cleanup

# 全データベースクリーンアップ
npm run e2e:db:cleanup-all

# 完全クリーンアップ
npm run e2e:db:full-cleanup

# テンプレートセットアップ
npm run e2e:db:template-setup

# テストファイルクリーンアップ
npm run e2e:cleanup-files
```

## データベース

```bash
# マイグレーション実行（開発環境）
npx prisma migrate dev

# マイグレーション実行（本番環境）
npx prisma migrate deploy

# Prisma Client 生成
npx prisma generate

# Prisma Studio 起動（DB確認）
npx prisma studio

# テストデータシード
npm run seed:test
```

## Git操作

```bash
# ステータス確認
git status

# ブランチ作成・切り替え
git checkout -b feature/issue-123-description

# 変更をステージング
git add .

# コミット（pre-commitフックが実行される）
git commit -m "feat: Add feature description"

# プッシュ
git push origin branch-name

# 最新のmainを取得
git checkout main
git pull origin main
```

## その他の便利コマンド

```bash
# 依存関係インストール
npm install

# 依存関係更新
npm update

# セキュリティ監査
npm audit

# 脆弱性修正
npm audit fix

# パッケージ情報確認
npm ls <package-name>
```

## Darwin (macOS) システムコマンド

```bash
# ファイル検索
find . -name "*.ts"

# テキスト検索
grep -r "search-term" src/

# ディレクトリ一覧
ls -la

# ディレクトリ移動
cd path/to/directory

# ファイル内容表示
cat file.txt

# プロセス確認
ps aux | grep node

# ポート使用確認
lsof -i :3000

# ファイル削除
rm file.txt

# ディレクトリ削除
rm -rf directory/
```

## 重要な注意事項

⚠️ **コミット前の必須チェック**

```bash
npm test                # 全テストパス
npm run lint            # lintエラーなし
npx tsc --noEmit        # 型エラーなし
npm run dev             # 開発サーバー起動確認
```

⚠️ **プッシュ前の必須チェック（CI相当）**

```bash
# 1. CI環境テスト
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false

# 2. ビルド確認
DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build

# 3. Lint & 型チェック
npm run lint && npx tsc --noEmit

# 4. セキュリティ監査
npm audit --audit-level=moderate

# 5. E2Eテスト
npm run e2e
```

⚠️ **禁止事項**

- `--no-verify` フラグの使用（明示的指示がある場合を除く）
- main ブランチへの直接コミット・プッシュ
- テスト失敗状態でのコミット
