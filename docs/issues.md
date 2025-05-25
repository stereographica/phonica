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
| `src/app/(app)/materials/new/__tests__/page.test.tsx` | L:135       | `recordedAt` の不正な日付形式のテストがスキップされている。JSDOM環境での`datetime-local` inputの挙動の不安定性からテストがタイムアウトするため、一旦 `.skip` に戻し保留。 | 3          | false    |
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
| `src/components/master/__tests__/EquipmentFormModal.test.tsx` | N/A         | テスト実行時に `act(...)` の警告が出力される。`react-hook-form` のバリデーション処理に関連するステート更新が原因の可能性。 | 4          | false    |
| `src/app/(app)/materials/[id]/edit/__tests__/page.test.tsx` | N/A         | テスト実行時に `act(...)` の警告が多数出力される。`useEffect` 内の非同期データフェッチとそれに続く複数のステート更新処理が原因の可能性。 | 4          | false    |
| `src/app/api/master/equipment/route.ts`        | L:52        | POST時のPrismaエラーで `error.meta.target` が `string[]` の場合のテストカバレッジ不足 | 3          | false    |
| `src/app/(app)/materials/__tests__/page.test.tsx` | L:126       | `filters by title when title filter is applied` テストがスキップされている。コンポーネント側のステート管理と副作用のタイミング問題により、`router.replace` が期待通りに `page=1` を含むURLで呼ばれないため。 | 3          | false    |
| `src/app/(app)/materials/__tests__/page.test.tsx` | L:155       | `filters by tag when tag filter is applied` テストがスキップされている。上記と同様の理由。 | 3          | false    |
| `src/app/(app)/materials/__tests__/page.test.tsx` | L:184       | `sorts by title when title header is clicked` テストがスキップされている。上記と同様の理由。 | 3          | false    |
| `src/app/api/materials/__tests__/route.test.ts` | L:69        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` (prismaMock.material.count.mockImplementation の引数型) | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts` | L:201       | `eslint-disable-next-line @typescript-eslint/no-explicit-any` (prismaMock.tag.findMany.mockResolvedValue の引数型) | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts` | L:204       | `eslint-disable-next-line @typescript-eslint/no-explicit-any` (prismaMock.tag.create.mockImplementation の引数型) | 4          | false    |
| `src/app/api/materials/__tests__/route.test.ts` | L:207       | `eslint-disable-next-line @typescript-eslint/no-explicit-any` (prismaMock.material.create.mockResolvedValue の引数型) | 4          | false    |
| `src/app/api/master/equipment/__tests__/route.test.ts` | L:8         | `eslint-disable-next-line @typescript-eslint/no-explicit-any` (createMockRequest の body 型) | 4          | false    |
| `src/app/(app)/materials/page.tsx`              | L:85        | `eslint-disable-next-line no-unused-vars` (setLimit が未使用) | 4          | false    |
| `src/app/(app)/materials/new/page.tsx`          | L:49        | `eslint-disable-next-line @typescript-eslint/no-explicit-any` (setEquipments の引数型) | 4          | false    |
| `src/app/(app)/materials/page.tsx`              | N/A         | 素材一覧ページのフィルター機能で、Enterキーを押下することによりフィルターが適用されるようにする改善（ユーザビリティ向上） | 5          | false    |
