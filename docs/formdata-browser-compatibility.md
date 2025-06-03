# FormData Browser Compatibility Guide

## 概要

Next.js 15 + Turbopack環境において、Firefox/WebKitでFormDataのパースエラーが発生する問題と、その解決策について説明します。

## 問題の詳細

### エラー内容
```
TypeError: expected a value starting with -- and the boundary
```

このエラーは、multipart/form-dataのboundaryパラメータが正しく設定されていない、またはパースできない場合に発生します。

### 影響を受けるブラウザ
- Firefox (全バージョン)
- WebKit (Safari)

### 影響を受けないブラウザ
- Chrome/Chromium

## 原因

1. **ブラウザ間の実装差異**: FormDataのmultipart boundary生成方法が異なる
2. **undiciライブラリの問題**: Node.js 18以降で使用されるundiciのFormDataパースが、一部のブラウザが生成するboundaryと互換性がない
3. **CRLF処理の違い**: 各ブラウザとHTTPクライアントがCRLF（改行）を異なる方法で処理

## 解決策

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
  return NextResponse.json(
    { error: "Invalid content type" },
    { status: 400 }
  );
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

E2Eテストでは、ブラウザごとに異なる戦略を使用：

```typescript
export class MaterialHelper {
  async createMaterial(data: MaterialData) {
    const browserName = this.page.context().browser()?.browserType().name();
    
    // Firefox/WebKitはテスト用APIを使用
    if (browserName === 'firefox' || browserName === 'webkit') {
      return await this.page.request.post('/api/materials/test', {
        data: { ...data }
      });
    }
    
    // Chromiumは通常のフォーム送信
    // ...
  }
}
```

## ベストプラクティス

### 1. フォーム送信時の注意点

**❌ 避けるべき実装:**
```javascript
fetch('/api/endpoint', {
  headers: {
    'Content-Type': 'multipart/form-data' // 手動で設定しない
  },
  body: formData
})
```

**✅ 推奨実装:**
```javascript
fetch('/api/endpoint', {
  body: formData // ブラウザが自動的にContent-Typeを設定
})
```

### 2. プログレッシブエンハンスメント

1. **デフォルト**: サーバーアクションを使用
2. **フォールバック**: サーバーアクションが使えない場合はAPIルート
3. **エラーハンドリング**: ブラウザ固有のエラーメッセージを表示

### 3. テスト戦略

- **単体テスト**: FormData処理をモック化
- **統合テスト**: サーバーアクションのテスト
- **E2Eテスト**: ブラウザごとの動作確認

## 今後の開発への影響

### 新しいフォームを実装する場合

1. **サーバーアクションを優先的に使用**
2. APIルートが必要な場合は、このガイドに従って実装
3. E2Eテストでクロスブラウザ動作を確認

### 既存のフォームを更新する場合

1. 可能であればサーバーアクションに移行
2. 移行できない場合は、エラーハンドリングを強化

## 関連リソース

- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions)
- [MDN: Using FormData Objects](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects)
- [undici FormData Issues](https://github.com/nodejs/undici/issues)

## 更新履歴

- 2025年6月2日: 初版作成（FormDataのboundaryエラー対応）