# E2Eテスト実行戦略

## 概要

- E2EテストはChrome（Chromium）のみで実行される
- データベースのセットアップ/クリーンアップが各実行で必要
- 段階的な実行により効率的なテストが可能

## 提案する実行戦略

### 1. テストの分類と優先順位

#### レベル1: スモークテスト（最優先）

```bash
# 基本的な動作確認（1-2分）
npm run e2e:smoke
```

- `smoke.spec.ts`
- `simple-test.spec.ts`

#### レベル2: 機能別テスト（中優先）

```bash
# マスターデータ機能（2-3分）
npm run e2e:master

# 素材管理機能（3-4分）
npm run e2e:materials
```

#### レベル3: ワークフローテスト（低優先）

```bash
# 統合ワークフロー（5-7分）
npm run e2e:workflows
```

### 2. 実行パターン

#### 開発時

```bash
# 特定のテストのみ実行
npm run e2e -- --grep "テスト名"
```

#### PR作成前

```bash
# スモークテストと関連機能のテスト
npm run e2e:smoke
npm run e2e:materials  # 変更した機能に応じて
```

#### リリース前

```bash
# 全テスト実行
npm run e2e
```

### 3. 並列実行の最適化

#### グループ1: 独立した読み取り専用テスト

- `materials-list.spec.ts`
- `tag-master.spec.ts` (読み取りのみ)

#### グループ2: データ作成を伴うテスト

- `equipment-master.spec.ts`
- `create-material.spec.ts`

#### グループ3: 複雑なワークフロー

- `complete-user-journey.spec.ts`
- `data-integrity-flow.spec.ts`
- `project-management-flow.spec.ts`

### 4. 実装手順

#### ステップ1: package.jsonスクリプトの追加

```json
{
  "scripts": {
    "e2e:smoke": "npm run e2e:ci -- --grep '@smoke'",
    "e2e:master": "npm run e2e:ci -- --grep '@master'",
    "e2e:materials": "npm run e2e:ci -- --grep '@materials'",
    "e2e:workflows": "npm run e2e:ci -- --grep '@workflow'",
    "e2e:ci": "CI=true npx tsx scripts/run-e2e.ts --project=chromium"
  }
}
```

#### ステップ2: テストへのタグ付け

```typescript
test.describe('@smoke @critical Equipment Master', () => {
  // スモークテスト
});

test.describe('@master Equipment Master', () => {
  // マスターデータ関連テスト
});

test.describe('@materials Materials Management', () => {
  // 素材管理テスト
});

test.describe('@workflow Complete User Journey', () => {
  // ワークフローテスト
});
```

#### ステップ3: 並列実行設定の作成

```typescript
// playwright.parallel.config.ts
export default defineConfig({
  ...baseConfig,
  projects: [
    {
      name: 'parallel-group-1',
      testMatch: ['**/materials-list.spec.ts', '**/tag-master.spec.ts'],
    },
    {
      name: 'parallel-group-2',
      testMatch: ['**/equipment-master.spec.ts', '**/create-material.spec.ts'],
    },
    {
      name: 'parallel-group-3',
      testMatch: ['**/workflows/*.spec.ts'],
    },
  ],
  workers: 3,
});
```

### 5. CI/CD統合

#### GitHub Actions例

```yaml
jobs:
  e2e-smoke:
    name: Smoke Tests
    runs-on: ubuntu-latest
    steps:
      - run: npm run e2e:smoke

  e2e-features:
    name: Feature Tests
    needs: e2e-smoke
    strategy:
      matrix:
        group: [master, materials]
    steps:
      - run: npm run e2e:${{ matrix.group }}

  e2e-workflows:
    name: Workflow Tests
    needs: e2e-features
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - run: npm run e2e:workflows
```

### 6. ローカル開発のワークフロー

#### 通常の開発時

```bash
# 1. 変更した機能のテストのみ実行
npm run e2e -- --grep "Equipment.*validation"

# 2. 関連する機能グループのテスト
npm run e2e:master
```

#### PR作成前

```bash
# 1. スモークテスト
npm run e2e:smoke

# 2. 変更に関連する機能テスト
npm run e2e:materials

# 3. 必要に応じて全テスト実行
npm run e2e
```

### 7. テスト実行時間の目安

| テストグループ | 実行時間 |
| -------------- | -------- |
| スモーク       | 1分      |
| マスター       | 2分      |
| 素材管理       | 3分      |
| ワークフロー   | 5分      |
| 全テスト       | 10-12分  |

### 8. データベース最適化

#### テストデータの事前準備

```typescript
// e2e/fixtures/test-data-cache.ts
export class TestDataCache {
  private static instance: TestDataCache;
  private cachedData: Map<string, any> = new Map();

  static async getOrCreate(key: string, creator: () => Promise<any>) {
    if (!this.instance) {
      this.instance = new TestDataCache();
    }

    if (!this.instance.cachedData.has(key)) {
      const data = await creator();
      this.instance.cachedData.set(key, data);
    }

    return this.instance.cachedData.get(key);
  }
}
```

### 9. 失敗時の対処

#### リトライ戦略

```typescript
// e2e/helpers/retry.ts
export async function retryOnFailure<T>(
  fn: () => Promise<T>,
  options = { retries: 3, delay: 1000 },
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < options.retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }
    }
  }

  throw lastError!;
}
```

### 10. モニタリングとレポート

#### 実行時間の記録

```bash
# 実行時間を含むレポート生成
npm run e2e:report
```

#### 失敗率の追跡

```typescript
// e2e/reporters/failure-tracker.ts
export class FailureTracker {
  static async recordFailure(test: TestInfo) {
    const failureData = {
      testName: test.title,
      file: test.file,
      error: test.error?.message,
      duration: test.duration,
      timestamp: new Date().toISOString(),
    };

    // ファイルまたはDBに記録
    await fs.appendFile('e2e-failures.log', JSON.stringify(failureData) + '\n');
  }
}
```

## まとめ

この戦略により：

- 開発時は1-3分でフィードバックを得られる
- PR時は5-10分で主要な機能を検証
- リリース前は完全なテストを10-12分で実行
- Chrome単一環境により安定性と速度が向上
- 失敗時の再実行コストを最小化
