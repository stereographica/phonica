# コードベース構造

## プロジェクトルート

```
phonica/
├── .github/              # GitHub Actions ワークフロー
├── .husky/               # Git hooks（pre-commit等）
├── docs/                 # プロジェクトドキュメント
│   ├── claude/          # Claude Code用ガイド
│   └── development_process.md
├── e2e/                  # E2Eテスト（Playwright）
│   ├── fixtures/        # テスト設定・カスタムフィクスチャ
│   ├── helpers/         # 再利用可能なテストヘルパー
│   └── tests/           # テストファイル
│       ├── master/      # マスターデータテスト
│       ├── materials/   # 素材管理テスト
│       └── workflows/   # ワークフローテスト
├── impl_reports/        # 実装レポート
├── prisma/              # Prisma ORM
│   ├── schema.prisma    # DBスキーマ定義
│   └── migrations/      # マイグレーション履歴
├── public/              # 静的ファイル
│   ├── uploads/         # アップロードファイル（gitignore）
│   └── downloads/       # ダウンロードファイル（gitignore）
├── scripts/             # ユーティリティスクリプト
│   ├── e2e-db-setup.ts         # E2E DB管理
│   ├── run-e2e-with-db.ts      # E2Eテスト実行
│   └── seed-test-data.ts       # テストデータシード
└── src/                 # ソースコード
    ├── app/             # Next.js App Router
    ├── components/      # Reactコンポーネント
    ├── lib/             # ユーティリティ・共通ロジック
    ├── types/           # TypeScript型定義
    └── workers/         # バックグラウンドワーカー
```

## src/ ディレクトリ詳細

### app/ - Next.js App Router

```
src/app/
├── (app)/               # アプリケーションページグループ
│   ├── dashboard/      # ダッシュボード
│   ├── materials/      # 素材管理
│   │   ├── page.tsx    # 一覧ページ
│   │   ├── new/        # 新規作成
│   │   ├── [slug]/     # 詳細・編集
│   │   └── __tests__/  # テスト
│   ├── master/         # マスター管理
│   │   ├── equipment/  # 機材マスター
│   │   └── tags/       # タグマスター
│   ├── projects/       # プロジェクト管理
│   └── layout.tsx      # 共通レイアウト
├── api/                # API ルート
│   ├── materials/      # 素材API
│   ├── equipment/      # 機材API
│   ├── tags/           # タグAPI
│   ├── projects/       # プロジェクトAPI
│   └── search/         # 検索API
├── layout.tsx          # ルートレイアウト
└── page.tsx            # トップページ
```

### components/ - React コンポーネント

```
src/components/
├── ui/                 # shadcn/ui コンポーネント
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── ...
├── materials/          # 素材管理コンポーネント
│   ├── MaterialsList.tsx
│   ├── MaterialCard.tsx
│   ├── MaterialForm.tsx
│   └── __tests__/
├── master/             # マスター管理コンポーネント
│   ├── equipment/
│   └── tags/
├── audio/              # 音声関連コンポーネント
│   ├── AudioPlayer.tsx
│   ├── WaveformVisualizer.tsx
│   └── __tests__/
├── maps/               # 地図関連コンポーネント
│   ├── MaterialLocationMap.tsx
│   └── __tests__/
├── dashboard/          # ダッシュボードウィジェット
└── providers/          # Context Providers
    ├── query-provider.tsx
    └── error-boundary-provider.tsx
```

### lib/ - ユーティリティ・共通ロジック

```
src/lib/
├── actions/            # Server Actions
│   ├── materials.ts
│   ├── equipment.ts
│   └── __tests__/
├── utils/              # ヘルパー関数
│   ├── audioUtils.ts
│   ├── fileSystem.ts
│   └── __tests__/
├── prisma.ts           # Prisma Client シングルトン
├── redis.ts            # Redis Client
├── react-query.tsx     # TanStack Query設定
└── validations/        # Zodスキーマ
    ├── material.ts
    └── equipment.ts
```

### types/ - TypeScript 型定義

```
src/types/
├── material.ts         # Material型
├── equipment.ts        # Equipment型
├── project.ts          # Project型
├── tag.ts              # Tag型
└── api.ts              # API レスポンス型
```

### workers/ - バックグラウンドワーカー

```
src/workers/
├── index.ts            # ワーカーエントリポイント
├── processors/         # ジョブプロセッサー
│   └── zipGenerator.ts
└── __tests__/
```

## データベーススキーマ（Prisma）

### 主要モデル

1. **Material** - 音声素材
   - メタデータ（タイトル、録音日時、評価等）
   - 技術情報（フォーマット、サンプルレート、ビット深度等）
   - 位置情報（緯度、経度、場所名）
   - リレーション: Project（多対多）、Tag（多対多）、Equipment（多対多）

2. **Project** - プロジェクト
   - 名前、説明
   - リレーション: Material（多対多）

3. **Tag** - タグ
   - 名前
   - リレーション: Material（多対多）

4. **Equipment** - 録音機材
   - 名前、種類、メーカー、メモ
   - リレーション: Material（多対多）

## テストファイル構造

### ユニットテスト

- `__tests__/` ディレクトリに配置
- `*.test.ts` または `*.test.tsx` 命名

### E2Eテスト

```
e2e/tests/
├── master/             # マスターデータ管理テスト
│   ├── equipment.spec.ts
│   └── tags.spec.ts
├── materials/          # 素材CRUD・一覧テスト
│   ├── create.spec.ts
│   ├── list.spec.ts
│   └── edit.spec.ts
└── workflows/          # 統合ワークフロー
    └── complete-user-journey.spec.ts
```

## ビルド成果物

```
.next/                  # Next.js ビルド出力（gitignore）
dist/                   # Worker ビルド出力（gitignore）
coverage/               # テストカバレッジレポート（gitignore）
playwright-report/      # Playwright レポート（gitignore）
```
