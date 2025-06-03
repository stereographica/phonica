# E2Eテスト実行戦略

## 問題点
- 全テストを一度に実行すると時間がかかりすぎる
- 3つのブラウザ（Chromium、Firefox、WebKit）で全テストを実行すると合計30テストケース
- データベースのセットアップ/クリーンアップが各実行で必要

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

### 2. ブラウザ別実行

#### 開発時（Chromiumのみ）
```bash
# 最も高速な実行
npm run e2e:chrome -- --grep "テスト名"
```

#### PR作成前（主要ブラウザ）
```bash
# ChromiumとFirefox
npm run e2e:cross-browser
```

#### リリース前（全ブラウザ）
```bash
# 全ブラウザでフルテスト
npm run e2e:all
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
    "e2e:smoke": "npm run e2e:ci -- --grep '@smoke' --project=chromium",
    "e2e:master": "npm run e2e:ci -- --grep '@master' --project=chromium",
    "e2e:materials": "npm run e2e:ci -- --grep '@materials' --project=chromium",
    "e2e:workflows": "npm run e2e:ci -- --grep '@workflow' --project=chromium",
    "e2e:chrome": "npm run e2e:ci -- --project=chromium",
    "e2e:firefox": "npm run e2e:ci -- --project=firefox",
    "e2e:webkit": "npm run e2e:ci -- --project=webkit",
    "e2e:cross-browser": "npm run e2e:ci -- --project=chromium --project=firefox",
    "e2e:all": "npm run e2e:ci"
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
npm run e2e:chrome -- --grep "Equipment.*validation"

# 2. 関連する機能グループのテスト
npm run e2e:master
```

#### PR作成前
```bash
# 1. スモークテスト
npm run e2e:smoke

# 2. 変更に関連する機能テスト
npm run e2e:materials

# 3. クロスブラウザ確認（必要に応じて）
npm run e2e:cross-browser -- --grep "@critical"
```

### 7. テスト実行時間の目安

| テストグループ | Chromium | Firefox | WebKit | 合計 |
|--------------|----------|---------|--------|------|
| スモーク | 1分 | 1.5分 | 1.5分 | 4分 |
| マスター | 2分 | 2.5分 | 2.5分 | 7分 |
| 素材管理 | 3分 | 4分 | 4分 | 11分 |
| ワークフロー | 5分 | 6分 | 6分 | 17分 |

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
  options = { retries: 3, delay: 1000 }
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < options.retries - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
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
- リリース前は完全なテストを20-30分で実行
- 並列実行により全体の実行時間を最大50%短縮
- 失敗時の再実行コストを最小化