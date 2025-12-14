# 技術スタック

## コア技術

### フロントエンド

- **Framework**: Next.js 15.3.4 (App Router)
- **UI Library**: React 19.0.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: shadcn/ui (Radix UI ベース)
- **Forms**: React Hook Form 7.60.0 + Zod 4.0.10

### 状態管理・データフェッチ

- **Server State**: TanStack Query 5.81.2
- **Client State**: React useState（ローカル状態）
- **Global State**: Jotai 2.12.5（インストール済みだが現在未使用）
- **URL State**: Next.js App Router

### バックエンド

- **Database**: PostgreSQL
- **ORM**: Prisma 6.10.1
- **Background Jobs**: BullMQ 5.56.0
- **Cache/Queue**: Redis (ioredis 5.6.1)

### 専門ライブラリ

- **Audio Processing**: WaveSurfer.js 7.9.9
- **Maps**: Leaflet 1.9.4 + React Leaflet 5.0.0
- **Charts**: Recharts 2.15.4
- **Date Handling**: date-fns 3.6.0
- **File Operations**: Archiver 7.0.1
- **EXIF Data**: exifr 7.1.3

## 開発ツール

### テスティング

- **Unit Testing**: Jest 29.7.0
- **React Testing**: Testing Library 16.3.0
- **E2E Testing**: Playwright 1.52.0
- **Test Environment**: jsdom
- **Transform**: @swc/jest 0.2.38

### コード品質

- **Linting**: ESLint 9 (Next.js config)
- **Formatting**: Prettier 3.6.2
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky 9.1.7 + lint-staged 16.1.2

### ビルド・開発

- **Dev Server**: Next.js (Turbopack)
- **Task Runner**: npm scripts
- **Process Management**: concurrently 9.2.0
- **TypeScript Execution**: tsx 4.20.3

## 環境要件

- **Node.js**: >=20.0.0
- **npm**: >=10.0.0
- **PostgreSQL**: 最新安定版
- **Redis**: バックグラウンドジョブ用
