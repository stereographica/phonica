# 課題管理

## はじめに

このドキュメントは、プロジェクト内の未解決の課題や、将来的に対応が必要な項目を管理するためのものです。

### 行数の表現方法

- 単一の行を指す場合: `L:(行番号)` (例: `L:5`)
- 複数の行範囲を指す場合: `L:(開始行番号)-L:(終了行番号)` (例: `L:5-L:10`)

### 対応優先度

優先度は1から5の5段階で定義されます。

- **1:** 緊急 (最優先で対応が必要なブロッカーなど)
- **2:** 高 (重要な機能の不具合や、開発を遅延させる可能性のあるもの)
- **3:** 中 (通常の開発サイクルで対応すべきもの)
- **4:** 低 (軽微な問題や、リファクタリングなど)
- **5:** 最低 (将来的な改善要望など、急ぎではないもの)

## 課題一覧

| ファイル名                                     | 行数        | 内容の簡潔な説明                                 | 対応優先度 | 対応済み |
| :--------------------------------------------- | :---------- | :----------------------------------------------- | :--------- | :------- |
| `src/app/(app)/materials/new/__tests__/page.test.tsx` | L:135       | `recordedAt` の不正な日付形式のテストがスキップされている | 3          | false    |
| `src/lib/prisma.ts`                            | L:4         | `eslint-disable-next-line no-unused-vars`        | 4          | false    |
| `src/app/api/materials/route.ts`               | L:3         | `eslint-disable-next-line no-unused-vars`        | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts`  | L:8         | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts`  | L:36        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts`  | L:83        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts`  | L:86        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts`  | L:89        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 4          | false    |
| `src/app/(app)/materials/new/page.tsx`         | L:87        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` | 4          | false    |
| `src/app/(app)/materials/new/page.tsx`         | L:37-L:40   | テストカバレッジ不足 (recordedAtのパースエラー処理部分)       | 3          | false    |
| `src/app/(app)/materials/new/page.tsx`         | L:50-L:54   | テストカバレッジ不足 (GPS関連のプレースホルダーコード)      | 4          | false    |
| `src/app/api/materials/route.ts`               | L:80-L:95   | テストカバレッジ不足 (POST時のタグ関連エラーハンドリング等) | 3          | false    |
| `src/components/ui/button.tsx`                 | L:45        | テストカバレッジ不足 (variant='link' の場合のasChild) | 4          | false    |
| (プロジェクト全体)                               | N/A         | `npm run dev` 実行時に `Unable to resolve babel-loader` エラーが発生 | 2          | false    |
| `src/app/api/materials/route.ts`               | L:37, L:109 | テスト実行時に `console.error` が出力される(意図的なエラーケース) | 4          | false    |
| `src/app/(app)/materials/new/page.tsx`         | L:90        | テスト実行時に `console.error` が出力される(意図的なエラーケース) | 4          | false    | 
