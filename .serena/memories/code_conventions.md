# コーディング規約

## TypeScript

### 基本ルール

- **strict モード**: 必須（tsconfig.json で有効化済み）
- **型定義**: 明示的な型定義を推奨
- **any の使用**: 極力避ける（やむを得ない場合のみ）

### パスエイリアス

```typescript
// @/ で src ディレクトリを参照
import { Component } from '@/components/ui/component';
import { helper } from '@/lib/helper';
```

## Prettier 設定

```json
{
  "semi": true, // セミコロン必須
  "trailingComma": "all", // トレーリングカンマ必須
  "singleQuote": true, // シングルクォート使用
  "printWidth": 100, // 行幅100文字
  "tabWidth": 2 // インデント2スペース
}
```

## ESLint

- Next.js 推奨設定（core-web-vitals + TypeScript）を使用
- 自動修正可能なエラーは `npm run lint -- --fix` で修正

## ファイル命名規則

### コンポーネント

- PascalCase: `MaterialCard.tsx`, `AudioPlayer.tsx`
- テストファイル: `MaterialCard.test.tsx`

### ユーティリティ・ライブラリ

- camelCase: `fileSystem.ts`, `audioUtils.ts`
- テストファイル: `fileSystem.test.ts`

### API Routes

- kebab-case: `app/api/materials/route.ts`

## ディレクトリ構造規約

```
src/
├── app/                  # Next.js App Router
│   ├── (app)/           # アプリケーションページ
│   └── api/             # API ルート
├── components/          # React コンポーネント
│   ├── ui/             # shadcn/ui コンポーネント
│   ├── materials/      # 素材管理コンポーネント
│   ├── master/         # マスター管理コンポーネント
│   └── audio/          # 音声関連コンポーネント
├── lib/                # ユーティリティ・共通ロジック
│   ├── actions/        # Server Actions
│   └── utils/          # ヘルパー関数
├── types/              # TypeScript 型定義
└── workers/            # バックグラウンドワーカー
```

## React コンポーネント規約

### コンポーネント構造

```typescript
'use client'; // Client Component の場合のみ

import { useState } from 'react';

interface ComponentProps {
  title: string;
  onSave?: () => void;
}

export function Component({ title, onSave }: ComponentProps) {
  const [state, setState] = useState<string>('');

  return <div>{title}</div>;
}
```

### Server Components vs Client Components

- **Server Components**: デフォルト（'use client' なし）
- **Client Components**: インタラクティブな機能が必要な場合のみ 'use client'

## テスト規約

### テストファイル配置

- コンポーネント: `__tests__/` ディレクトリ内
- ユーティリティ: 同じディレクトリに `*.test.ts`

### テストカバレッジ

- **必須**: 全指標（Statements, Branches, Functions, Lines）80%以上
- **目標**: 100% カバレッジ

## Git コミットメッセージ

### プレフィックス

- `feat:` - 新機能
- `fix:` - バグ修正
- `test:` - テスト追加・修正
- `refactor:` - リファクタリング
- `docs:` - ドキュメント更新
- `chore:` - その他（依存関係更新など）

### 例

```
feat: Add audio waveform visualization
fix: Resolve material upload validation error
test: Add unit tests for file system cleanup
```

## 禁止事項

- console.log のコミット（デバッグ後は削除）
- 未使用のインポート
- any 型の多用
- テストなしでの実装
- main ブランチへの直接コミット
