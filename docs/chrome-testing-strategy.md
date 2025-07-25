# Browser Strategy Guide

## 概要

Phonicaプロジェクトでは、E2Eテストの一貫性と信頼性を向上させるため、**Chrome専用テスト戦略**を採用しています。

## Chrome専用戦略の理由

### 技術的利点

1. **FormData処理の安定性**: Next.js 15 + TurbopackでChromeが最も安定したFormData処理を提供
2. **CI実行時間の短縮**: 単一ブラウザ実行により約70%の時間短縮を実現
3. **メンテナンス性の向上**: ブラウザ固有の問題解決に費やす時間を削減

### 実用的利点

1. **ユーザーベース**: Chromeは対象ユーザーの大多数が使用
2. **開発効率**: テスト失敗の原因特定が容易
3. **リソース配分**: 機能開発により多くの時間を割当可能

## 実装方針

### 1. サーバーアクション（推奨）

最も信頼性の高い解決策は、Next.jsのサーバーアクションを使用することです。

```typescript
// src/lib/actions/materials.ts
'use server';

export async function createMaterial(formData: FormData) {
  // FormDataを直接処理
  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  // ... 処理
}
```

```typescript
// クライアント側
import { createMaterial } from '@/lib/actions/materials';

const handleSubmit = async (formData: FormData) => {
  const result = await createMaterial(formData);
  // ... 結果処理
};
```

### 2. APIルートの改善

APIルートを使用する必要がある場合は、以下の対策を実装します：

```typescript
// Content-Typeヘッダーの検証
const contentType = request.headers.get('content-type') || '';
if (!contentType.includes('multipart/form-data')) {
  return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
}

// リクエストのクローンを作成してリトライ
const clonedRequest = request.clone();
try {
  formData = await request.formData();
} catch (error) {
  // 代替処理またはエラーレスポンス
}
```

### 3. E2Eテストの対応

E2EテストはChromeのみで実行されるため、FormDataのブラウザ互換性問題は発生しません。これにより、テストコードがシンプルになり、メンテナンスが容易になっています。

```typescript
export class MaterialHelper {
  async createMaterial(data: MaterialData) {
    // Chrome専用のシンプルな実装
    // FormData関連の互換性問題を考慮する必要なし
    return await this.submitForm(data);
  }
}
```

## ベストプラクティス

### 1. フォーム送信時の注意点

**❌ 避けるべき実装:**

```javascript
fetch('/api/endpoint', {
  headers: {
    'Content-Type': 'multipart/form-data', // 手動で設定しない
  },
  body: formData,
});
```

**✅ 推奨実装:**

```javascript
fetch('/api/endpoint', {
  body: formData, // ブラウザが自動的にContent-Typeを設定
});
```

### 2. プログレッシブエンハンスメント

1. **デフォルト**: サーバーアクションを使用
2. **フォールバック**: サーバーアクションが使えない場合はAPIルート
3. **エラーハンドリング**: ブラウザ固有のエラーメッセージを表示

### 3. テスト戦略

- **単体テスト**: FormData処理をモック化
- **統合テスト**: サーバーアクションのテスト
- **E2Eテスト**: Chrome環境での動作確認

## 今後の開発への影響

### 新しいフォームを実装する場合

1. **サーバーアクションを優先的に使用**
2. APIルートが必要な場合は、このガイドに従って実装
3. E2Eテスト（Chrome）で動作を確認

### 既存のフォームを更新する場合

1. 可能であればサーバーアクションに移行
2. 移行できない場合は、エラーハンドリングを強化

## 関連リソース

- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [MDN: Using FormData Objects](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects)
- [undici FormData Issues](https://github.com/nodejs/undici/issues)

## 更新履歴

- 2025年7月20日: E2EテストがChrome専用になったことを反映
- 2025年6月2日: 初版作成（FormDataのboundaryエラー対応）
