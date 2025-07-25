# テスト戦略ドキュメント

Phonicaプロジェクトのユニットテストカバレッジ90%達成と技術的負債の一掃に向けた包括的なテスト戦略を定義します。

## 🎯 目標

### 究極の目標

**「テストが品質を保証し、リファクタリングの自信を与える」**

### 具体的な数値目標

- **全指標で90%以上のカバレッジ達成**
  - Statements: 91.56% → **維持** ✅
  - Branches: 84.72% → **90%以上** (120個以上の分岐をカバー)
  - Functions: 88.92% → **90%以上** (5個以上の関数をカバー)
  - Lines: 91.56% → **維持** ✅
- **スキップテストゼロ化** (現在136行)
- **低カバレッジファイル（30%未満）を70%以上に引き上げ**

## 1. テスト種別の責務定義

### 1.1 ユニットテスト

**対象**: 個別の関数、コンポーネント、ユーティリティ、APIルートハンドラー

**特徴**:

- 外部依存性は全てモック化
- 高速実行（ミリ秒単位）
- 独立性の確保

**モック対象**:

- データベース（Prisma）
- ファイルシステム（fs/promises）
- 外部API（fetch）
- キューシステム（BullMQ/Redis）
- 環境変数

**良い例**: `/src/lib/__tests__/slug-generator.test.ts`

```typescript
// 明確な構造、ユーザー視点のテスト
describe('generateBaseSlug', () => {
  describe('日本語の変換', () => {
    it('ひらがなをローマ字に変換する', () => {
      expect(generateBaseSlug('ふぃーるどれこーでぃんぐ')).toBe('huirudorekodeingu');
    });
  });
});
```

### 1.2 統合テスト

**対象**: APIルートと複数コンポーネントの連携、Server ActionsとUIの連携

**特徴**:

- 主要な統合ポイントのテスト
- 実行時間は数秒程度を許容
- 部分的なモック使用

**モック対象**:

- データベースのみ（Prismaモック）
- 外部API（必要に応じて）

**実装例**:

```typescript
// APIルートとコンポーネントの統合テスト
it('should fetch and display materials through API', async () => {
  // APIレスポンスをモック
  fetchMock.mockResponseOnce(JSON.stringify({ materials: [...] }));

  render(<MaterialsPage />);

  await waitFor(() => {
    expect(screen.getByText('Forest Recording')).toBeInTheDocument();
  });
});
```

### 1.3 E2Eテスト

**対象**: ユーザーシナリオ全体、クリティカルパス

**特徴**:

- 実際のブラウザで実行（Playwright）
- モックなし
- 実行時間は分単位

**カバー範囲**:

- 素材アップロードから編集までのフロー
- マスターデータ管理の完全フロー
- プロジェクト管理の一連の操作

**実装場所**: `/e2e/tests/`

## 2. モック戦略ガイドライン

### 2.1 依存性注入パターンの導入

#### FileSystemインターフェース設計

```typescript
// src/lib/interfaces/file-system.interface.ts
export interface IFileSystem {
  unlink(path: string): Promise<void>;
  access(path: string, mode?: number): Promise<void>;
  readdir(path: string): Promise<string[]>;
  rename(oldPath: string, newPath: string): Promise<void>;
  stat(path: string): Promise<Stats>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
}

// 本番用実装
export class NodeFileSystemAdapter implements IFileSystem {
  async unlink(path: string): Promise<void> {
    return fs.unlink(path);
  }
  // ... 他のメソッド実装
}

// テスト用実装
export class MemoryFileSystemAdapter implements IFileSystem {
  private files = new Map<string, Buffer>();

  async unlink(path: string): Promise<void> {
    if (!this.files.has(path)) {
      throw new Error('ENOENT: no such file or directory');
    }
    this.files.delete(path);
  }
  // ... 他のメソッド実装
}
```

#### QueueAdapterインターフェース設計

```typescript
// src/lib/interfaces/queue-adapter.interface.ts
export interface IQueue<T> {
  add(name: string, data: T): Promise<Job<T>>;
  getJobs(types?: string[]): Promise<Job<T>[]>;
  close(): Promise<void>;
}

export interface IQueueAdapter {
  createQueue<T>(name: string): IQueue<T>;
  createWorker<T>(name: string, processor: (job: Job<T>) => Promise<void>): IWorker<T>;
  shutdown(): Promise<void>;
}

// 本番用実装
export class BullMQAdapter implements IQueueAdapter {
  private connection: Redis;

  constructor(redisUrl: string) {
    this.connection = new Redis(redisUrl);
  }
  // ... 実装
}

// テスト用実装
export class MemoryQueueAdapter implements IQueueAdapter {
  private queues = new Map<string, MemoryQueue<any>>();

  createQueue<T>(name: string): IQueue<T> {
    const queue = new MemoryQueue<T>();
    this.queues.set(name, queue);
    return queue;
  }
  // ... 実装
}
```

### 2.2 モックの作成・管理方法

#### jest.setup.tsでの共通モック設定

```typescript
// 既存のモックに加えて、インターフェースベースのモックを追加
import { IFileSystem } from '@/lib/interfaces/file-system.interface';
import { IQueueAdapter } from '@/lib/interfaces/queue-adapter.interface';

// FileSystemモックの提供
export const mockFileSystem: jest.Mocked<IFileSystem> = {
  unlink: jest.fn(),
  access: jest.fn(),
  readdir: jest.fn(),
  rename: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
};

// QueueAdapterモックの提供
export const mockQueueAdapter: jest.Mocked<IQueueAdapter> = {
  createQueue: jest.fn(),
  createWorker: jest.fn(),
  shutdown: jest.fn(),
};
```

#### テストでの使用例

```typescript
// src/lib/__tests__/file-system.test.ts
import { FileService } from '../file-service';
import { mockFileSystem } from '../../../jest.setup';

describe('FileService', () => {
  let service: FileService;

  beforeEach(() => {
    service = new FileService(mockFileSystem);
    jest.clearAllMocks();
  });

  it('should delete file successfully', async () => {
    mockFileSystem.unlink.mockResolvedValue(undefined);

    await service.deleteFile('/path/to/file');

    expect(mockFileSystem.unlink).toHaveBeenCalledWith('/path/to/file');
  });
});
```

## 3. テストパターンのベストプラクティス

### 3.1 AAA (Arrange-Act-Assert) パターン

```typescript
it('should create material with metadata', async () => {
  // Arrange - テストデータとモックの準備
  const mockFile = new File(['content'], 'test.wav', { type: 'audio/wav' });
  prismaMock.material.create.mockResolvedValue(mockMaterial);

  // Act - テスト対象の実行
  const result = await createMaterial(mockFile, metadata);

  // Assert - 結果の検証
  expect(result).toEqual(mockMaterial);
  expect(prismaMock.material.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      title: metadata.title,
    }),
  });
});
```

### 3.2 ユーザー視点のテスト

```typescript
// ❌ 悪い例: 実装詳細のテスト
it('should call fetch twice', async () => {
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

// ✅ 良い例: ユーザーが体験する結果のテスト
it('should display filtered materials', async () => {
  expect(screen.getByText('Forest Recording')).toBeInTheDocument();
  expect(screen.queryByText('City Ambience')).not.toBeInTheDocument();
});
```

### 3.3 テストダブルの適切な使い分け

#### スタブ（Stub）

```typescript
// 単純な固定値を返す
mockFileSystem.stat.mockResolvedValue({ size: 1000 } as Stats);
```

#### モック（Mock）

```typescript
// 呼び出しを検証する
expect(mockFileSystem.unlink).toHaveBeenCalledWith('/path/to/file');
```

#### フェイク（Fake）

```typescript
// 簡易的な実装を持つ（MemoryFileSystemAdapter）
const fakeFileSystem = new MemoryFileSystemAdapter();
```

### 3.4 非同期処理のテスト

```typescript
// Promise の解決を待つ
it('should handle async operations', async () => {
  const promise = service.processFile('/path/to/file');

  // 非同期処理の完了を待つ
  await expect(promise).resolves.toEqual({ success: true });
});

// タイムアウトの考慮
it('should timeout after 5 seconds', async () => {
  jest.setTimeout(10000); // テストのタイムアウトを延長

  const promise = service.longRunningOperation();

  await expect(promise).rejects.toThrow('Operation timed out');
});
```

### 3.5 エラーハンドリングのテストパターン

```typescript
describe('Error Handling', () => {
  it('should handle file not found error', async () => {
    mockFileSystem.access.mockRejectedValue(new Error('ENOENT'));

    await expect(service.checkFile('/nonexistent')).rejects.toThrow('File not found');
  });

  it('should handle network errors gracefully', async () => {
    fetchMock.mockRejectOnce(new Error('Network error'));

    const result = await service.fetchData();

    expect(result).toEqual({ error: 'Connection failed', data: null });
  });
});
```

## 4. 命名規則とディレクトリ構造

### 4.1 ディレクトリ構造

```
src/
├── components/
│   └── materials/
│       ├── MaterialDetailModal.tsx
│       └── __tests__/
│           └── MaterialDetailModal.test.tsx
├── lib/
│   ├── interfaces/              # NEW: インターフェース定義
│   │   ├── file-system.interface.ts
│   │   └── queue-adapter.interface.ts
│   ├── adapters/               # NEW: アダプター実装
│   │   ├── node-file-system.adapter.ts
│   │   ├── memory-file-system.adapter.ts
│   │   ├── bullmq.adapter.ts
│   │   └── memory-queue.adapter.ts
│   ├── services/               # NEW: ビジネスロジック
│   │   ├── file.service.ts
│   │   └── __tests__/
│   │       └── file.service.test.ts
│   ├── file-system.ts          # リファクタリング対象
│   └── __tests__/
│       └── file-system.test.ts
└── app/
    └── api/
        └── materials/
            └── [slug]/
                └── download/
                    ├── route.ts
                    └── __tests__/
                        └── route.test.ts
```

### 4.2 命名規則

#### テストファイル

- ユニットテスト: `{対象ファイル名}.test.{ts|tsx}`
- 統合テスト: `{機能名}.integration.test.{ts|tsx}`
- E2Eテスト: `{シナリオ名}.e2e.test.ts`

#### モックファイル

- `__mocks__/{対象ファイル名}.{ts|tsx}`

#### describeブロック

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    describe('specific scenario', () => {
      it('should behave as expected', () => {});
    });
  });
});
```

#### test/itブロック

```typescript
// 推奨: 期待される動作を明確に記述
it('should display error message when API call fails', () => {});

// 避ける: 実装詳細に言及
it('should set isError state to true', () => {});
```

## 5. カバレッジ測定と品質指標

### 5.1 目標値

- **Statements**: 90%以上（現在: 91.56% ✅）
- **Branches**: 90%以上（現在: 84.72% → 改善必要）
- **Functions**: 90%以上（現在: 88.92% → 改善必要）
- **Lines**: 90%以上（現在: 91.56% ✅）

### 5.2 測定方法

```bash
# 全テストとカバレッジレポート
npm test -- --coverage --watchAll=false

# 特定ファイルのカバレッジ確認
npm test -- --coverage --collectCoverageFrom="src/lib/file-system.ts"

# HTML形式のカバレッジレポート表示
open coverage/lcov-report/index.html
```

### 5.3 低カバレッジファイルの対処方針

#### download/route.ts (26.66% → 70%以上)

**問題点**:

- ファイルシステムへの直接依存
- ストリーム処理の複雑さ
- 環境依存のフォールバック処理

**改善アプローチ**:

1. DownloadServiceの作成とロジック抽出
2. FileSystemインターフェースの使用
3. ストリーム処理の抽象化
4. 環境変数の注入

#### zip-generation-queue.ts (25.18% → 70%以上)

**問題点**:

- BullMQ/Redisへの直接依存
- アーカイブ生成の複雑な処理
- ファイルシステム操作

**改善アプローチ**:

1. ZipGenerationServiceの作成
2. QueueAdapterインターフェースの使用
3. アーカイバーの抽象化
4. ファイル操作の依存性注入

#### file-system.ts (45.14% → 70%以上)

**問題点**:

- fs/promisesへの直接依存
- 複雑なエラーハンドリング

**改善アプローチ**:

1. FileSystemインターフェースの実装
2. エラーハンドリングの標準化
3. パス検証ロジックの分離

#### file-deletion-queue.ts (65.31% → 70%以上)

**問題点**:

- BullMQ/Redisへの依存
- ファイル削除の副作用

**改善アプローチ**:

1. QueueAdapterの使用
2. FileSystemインターフェースの使用
3. 削除ロジックのサービス化

### 5.4 スキップテストの解消手順

#### MaterialsPage (39行)

**原因**: Suspense境界とuseSearchParamsの問題
**解決策**:

1. Suspense境界対応のテストヘルパー作成
2. useSearchParamsのPromiseベースモック実装
3. React Testing Libraryの最新パターン適用

#### workers関連 (49行)

**原因**: BullMQ/Redisのテスト環境構築
**解決策**:

1. MemoryQueueAdapterの実装
2. Worker処理のサービス分離
3. 統合テストへの移行検討

#### audio-metadata.ts (8個)

**原因**: fs/promisesモックの問題
**解決策**:

1. FileSystemインターフェースの使用
2. 既存のmockFsPromisesの活用
3. テストの再構築

#### ProjectDetailPage (9個)

**原因**: fetchモック同期の問題
**解決策**:

1. MSWの導入検討
2. fetchMockの設定見直し
3. 非同期処理の適切な待機

### 5.5 継続的な品質管理プロセス

#### CI/CDでの自動チェック

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm test -- --coverage --watchAll=false

- name: Check coverage thresholds
  run: |
    npm test -- --coverage --watchAll=false \
      --coverageThreshold='{"global":{"statements":90,"branches":90,"functions":90,"lines":90}}'
```

#### PRマージ条件

- 全テストの成功
- カバレッジ閾値の達成
- 新規コードは90%以上のカバレッジ

#### 定期的なレビュー

- 月次でカバレッジレポートのレビュー
- 四半期ごとのテスト戦略見直し
- スキップテストの棚卸し

## 6. 技術的負債の解消戦略

### 6.1 Suspense境界問題の解決アプローチ

#### テストヘルパーの作成

```typescript
// src/test-utils/suspense-wrapper.tsx
import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, suspense: true },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </QueryClientProvider>
  );
}
```

#### 使用例

```typescript
import { SuspenseWrapper } from '@/test-utils/suspense-wrapper';

it('should display materials after loading', async () => {
  render(
    <SuspenseWrapper>
      <MaterialsPage />
    </SuspenseWrapper>
  );

  await waitFor(() => {
    expect(screen.getByText('Forest Recording')).toBeInTheDocument();
  });
});
```

### 6.2 fs/promisesモック問題の根本解決

#### グローバルモックの改善

```typescript
// jest.setup.ts の改善
const createMockFsPromises = () => {
  const mockFs = {
    access: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
    rename: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
  };

  // デフォルトの成功レスポンスを設定
  mockFs.access.mockResolvedValue(undefined);
  mockFs.mkdir.mockResolvedValue(undefined);
  mockFs.writeFile.mockResolvedValue(undefined);

  return mockFs;
};

export const mockFsPromises = createMockFsPromises();
```

### 6.3 BullMQ/Redisのテスト環境構築

#### テスト用Redisモック

```typescript
// src/lib/__mocks__/ioredis.ts
export class Redis {
  private data = new Map<string, any>();

  async get(key: string) {
    return this.data.get(key);
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
    return 'OK';
  }

  async del(key: string) {
    return this.data.delete(key) ? 1 : 0;
  }

  disconnect() {
    this.data.clear();
  }
}
```

### 6.4 環境依存性 (process.env) の管理

#### 環境変数の注入パターン

```typescript
// src/lib/config/environment.ts
export interface Environment {
  uploadDir: string;
  tempDir: string;
  redisUrl: string;
  isDevelopment: boolean;
  isTest: boolean;
}

export function getEnvironment(): Environment {
  return {
    uploadDir: process.env.UPLOAD_DIR || '/uploads',
    tempDir: process.env.TEMP_DIR || '/tmp',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
  };
}

// テストでのモック
export const mockEnvironment: Environment = {
  uploadDir: '/test/uploads',
  tempDir: '/test/tmp',
  redisUrl: 'redis://test:6379',
  isDevelopment: false,
  isTest: true,
};
```

## 7. 実装優先順位とロードマップ

### Phase 1: スキップテスト一括解除と基盤整備（1週間）

1. **MaterialsPageテストの復活** (優先度: 最高)
   - Suspense境界対応ヘルパー作成
   - 1400行のテストコード復活
   - カバレッジ大幅向上期待

2. **audio-metadata.tsテスト修正** (優先度: 高)
   - fs/promisesモック問題解決
   - 8個のテスト有効化

3. **Branch/Function Coverage向上** (優先度: 高)
   - error-messages.ts
   - APIルートのエラーハンドリング

### Phase 2: 大規模リファクタリング（2週間）

1. **FileSystemインターフェース導入**
   - インターフェース定義
   - アダプター実装
   - 既存コードの移行

2. **QueueAdapterインターフェース導入**
   - インターフェース定義
   - アダプター実装
   - キュー処理の移行

### Phase 3: カバレッジ目標達成（1週間）

1. **download/route.ts改善**
   - DownloadService作成
   - ストリーム処理抽象化
   - テストスイート作成

2. **zip-generation-queue.ts改善**
   - ZipGenerationService作成
   - アーカイブ処理抽象化
   - 統合テスト追加

## 8. メトリクスとモニタリング

### 8.1 追跡指標

- カバレッジ4指標の推移
- スキップテスト数の減少
- 新規追加テストの品質
- CI実行時間

### 8.2 週次レポート形式

```markdown
## Week X Progress Report

### Coverage Metrics

- Statements: 91.56% → 92.3% (+0.74%)
- Branches: 84.72% → 87.1% (+2.38%)
- Functions: 88.92% → 90.5% (+1.58%)
- Lines: 91.56% → 92.3% (+0.74%)

### Skipped Tests

- Total: 136 → 98 (-38)
- MaterialsPage: 39 → 0 ✅
- audio-metadata: 8 → 0 ✅

### Low Coverage Files

- download/route.ts: 26.66% → 45.2%
- zip-generation-queue.ts: 25.18% → 38.9%
```

## 9. 結論

このテスト戦略により、Phonicaプロジェクトは以下を実現します：

1. **品質の保証**: 90%以上のカバレッジによる確実な品質保証
2. **開発効率の向上**: テスト可能なアーキテクチャによる保守性向上
3. **技術的負債の解消**: スキップテストゼロ、低カバレッジファイルの改善
4. **持続可能な開発**: 継続的な品質管理プロセスの確立

個人プロジェクトだからこそ可能な大胆な改善により、プロダクション品質のコードベースを実現します。
