```
.
├── /app/                     # Next.js App Routerのコア
│   ├── (app)/                  # メインアプリケーションの画面群（URLに影響しないグループ）
│   │   ├── layout.tsx          # サイドバーやヘッダーを含む共通レイアウト
│   │   │
│   │   ├── dashboard/          # ダッシュボード
│   │   │   └── page.tsx        # 【B-1】ダッシュボード画面
│   │   │
│   │   ├── materials/          # 素材管理
│   │   │   ├── page.tsx          # 【C-1】素材一覧画面
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # 【C-2】素材新規登録画面
│   │   │   └── [slug]/           # 素材ごとの動的ルート
│   │   │       ├── page.tsx      # 素材詳細ページ（モーダルの代わりにページとして実装）
│   │   │       └── edit/
│   │   │           └── page.tsx  # 【C-3】素材編集画面
│   │   │
│   │   ├── projects/           # プロジェクト管理
│   │   │   ├── page.tsx          # 【D-1】プロジェクト一覧画面
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # 【D-3】プロジェクト詳細画面
│   │   │
│   │   └── master/             # マスタ管理
│   │       ├── layout.tsx        # マスタ管理画面用の共通レイアウト
│   │       ├── equipment/
│   │       │   └── page.tsx      # 【E-1】機材マスタ管理画面
│   │       └── tags/
│   │           └── page.tsx      # 【E-3】タグ管理画面
│   │
│   ├── (api)/                  # バックエンドAPIエンドポイント群（URLに影響しないグループ）
│   │   └── api/
│   │       ├── jobs/             # バックグラウンドジョブ関連
│   │       │   └── route.ts      # BullMQのジョブを起動するAPI
│   │       └── upload/           # ファイルアップロード関連
│   │           └── route.ts      # ファイルアップロード処理のAPI
│   │
│   ├── layout.tsx              # アプリ全体のルートレイアウト (<html>, <body>)
│   ├── page.tsx                # トップページ（ダッシュボードへのリダイレクトなど）
│   └── globals.css             # グローバルなCSS
│
├── /components/              # Reactコンポーネント
│   ├── /ui/                    # Shadcn/uiによって追加される基本コンポーネント (Button, Dialogなど)
│   ├── /common/                # 汎用的なカスタムコンポーネント (PageHeader, CustomIconなど)
│   └── /features/              # 機能ごとの複合コンポーネント
│       ├── /dashboard/         #   - DashboardGrid.tsx, StatsWidget.tsx
│       ├── /materials/         #   - MaterialListTable.tsx, MaterialForm.tsx, WaveformPlayer.tsx
│       └── /layout/            #   - Sidebar.tsx, Header.tsx
│
├── /lib/                     # ライブラリ、ヘルパー関数、クライアントインスタンス
│   ├── actions/                # Next.js Server Actions
│   │   ├── material.actions.ts #   - 素材の作成、更新、削除処理
│   │   └── project.actions.ts  #   - プロジェクトの作成、更新、削除処理
│   ├── db/                     # データベースクエリ関連
│   │   └── queries.ts          #   - 複雑なデータ取得用の関数
│   ├── queue/                  # BullMQ関連
│   │   ├── index.ts            #   - キューの定義
│   │   └── workers.ts          #   - ジョブの実行内容を定義するワーカ
│   ├── prisma.ts               # Prismaクライアントのシングルトンインスタンス
│   ├── redis.ts                # Redisクライアントのシングルトンインスタンス
│   └── utils.ts                # 共通の便利関数 (日付フォーマットなど)
│
├── /prisma/                  # Prisma関連のファイル
│   ├── schema.prisma           # データベースのスキーマ定義ファイル
│   └── migrations/             # マイグレーション履歴
│
├── /public/                  # 静的ファイル (画像、フォントなど)
│   ├── favicon.ico
│   └── ...
│
├── /types/                   # TypeScriptの型定義
│   └── index.d.ts              # プロジェクト全体で使う共通の型定義
│
├── .env.local                # 環境変数（データベース接続情報など）
├── .eslintrc.json            # ESLintの設定
├── components.json           # Shadcn/uiの設定
├── next.config.mjs           # Next.jsの設定
├── package.json              # プロジェクトの依存関係とスクリプト
├── postcss.config.js         # PostCSSの設定 (Tailwind CSSで利用)
├── tailwind.config.ts        # Tailwind CSSの設定
└── tsconfig.json             # TypeScriptの設定
```
