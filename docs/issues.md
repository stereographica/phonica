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
| `src/app/(app)/materials/new/__tests__/page.test.tsx` | L:61, L:121, L:151, L:185 | `datetime-local` input を使用するテスト（正常系、エラー系、全フィールド）がスキップされている。JSDOM環境での`datetime-local` inputの挙動の不安定性により、`recordedAt` の値がコンポーネントのステートに正しく反映されず、フォーム送信前のバリデーションで早期リターンしてしまうため。 | 3          | false    |
| `src/components/materials/MaterialDetailModal.tsx` | N/A         | Radix UI の Dialog コンポーネント (`DialogContent`, `DialogTitle`, `DialogDescription`) のアクセシビリティ警告がテスト実行時に複数発生する。`aria-labelledby`, `aria-describedby` の設定や、`DialogTitle`/`Description` の常時レンダリングを試みたが解消せず。Radix UI 側の問題または JSDOM との相性問題の可能性あり。 (GitHub Issue: https://github.com/radix-ui/primitives/issues/2986) 開発環境でのみ表示される警告の可能性も。 | 4          | false    |
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
| `src/app/(app)/materials/__tests__/page.test.tsx` | L:267       | `initial fetch uses URL search parameters and displays correct item` テストが失敗している。`mockRouterReplace` が期待通りに呼び出されず、`mockUseSearchParams` のモックがテストケース内で意図通りに機能しない問題があるためスキップ。 | 2          | false    |
| (テスト全体)                                     | N/A         | `jest-fetch-mock` の型定義が正しく解決できず、テストファイル (`MaterialDetailModal.test.tsx`等) で `any` 型として使用している。 | 4          | false    |
| `src/app/(app)/materials/[slug]/edit/__tests__/page.test.tsx` | L:188, L:217, L:246 | フォーム送信時のクライアントサイドバリデーション（title空、recordedAt空、APIエラー）のテストケース3件がタイムアウトで失敗するためスキップ。`error` ステートは更新されるが、DOMへの反映をテストで検知できない。 | 3          | false    |
| `src/app/api/materials/[slug]/route.ts`               | L:217 (PUT), L:315 (DELETE) | Prisma TransactionClient (`tx`) の型が実態と合っておらず、`any` や `@ts-expect-error` で対応している。根本的な型解決が望ましい。 | 4          | false    |
| `src/app/api/materials/[slug]/__tests__/route.test.ts`  | L:27        | Prisma TransactionClient のモック (`mockTx`) で `any` を使用している。                         | 4          | false    |
| `src/app/api/materials/route.ts`               | L:214 (POST) | `equipments: { @ts-expect-error connectOrCreate ...}` で型エラーを抑制している。           | 4          | false    |
