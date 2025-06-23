# Testing Best Practices

This document summarizes important lessons about testing learned through the development of the Phonica project.

## 1. Testing Principles

### 1.1 Write Tests from the User's Perspective

**❌ Bad Example: Testing implementation details**

```javascript
// Verifying fetch calls after URL parameter changes in detail
await waitFor(() => {
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('title=Forest'));
});
```

**✅ Good Example: Testing the results users experience**

```javascript
// Verify displayed content after filter application
await waitFor(() => {
  expect(screen.getByText('Forest Recording')).toBeInTheDocument();
  expect(screen.queryByText('City Ambience')).not.toBeInTheDocument();
});
```

### 1.2 Test at Appropriate Abstraction Levels

- **Unit Tests**: Verify independent behavior of individual functions and components
- **Integration Tests**: Verify coordination between multiple components (avoid full browser API simulation)
- **E2E Tests**: Verify actual interaction with browser APIs

## 2. React Testing Library Considerations

### 2.1 Integration with Next.js Routing

**Problem**: Component doesn't automatically re-render when `useSearchParams` mock changes

**Solution**:

1. Verify that URL parameter changes are correctly requested
2. Test initial display with specific parameters

```javascript
// Verify URL parameter changes
expect(mockRouter.replace).toHaveBeenCalledWith(
  expect.stringContaining('title=Forest')
);

// Verify display with specific parameters
const searchParams = new URLSearchParams({ title: 'Forest' });
(useSearchParams as jest.Mock).mockReturnValue(searchParams);
render(<MaterialsPage />);
```

### 2.2 Appropriate Use of Mocks

**Principle**: Keep mocks minimal and clarify test intent

```javascript
// Clear initial render of modal component
(MaterialDetailModal as jest.Mock).mockClear();

// Verify calls after click
await user.click(screen.getByText('Forest Recording'));
expect(MaterialDetailModal).toHaveBeenLastCalledWith(
  expect.objectContaining({
    isOpen: true,
    materialSlug: 'material-1',
  }),
  {}
);
```

## 3. TDD Approach in Practice

### 3.1 Incremental Implementation

1. **Start with basic functionality tests**

   - Loading states
   - Data display
   - Error handling

2. **Add interactions**

   - User operations (clicks, input)
   - State changes

3. **Consider edge cases**
   - Empty data
   - Error states
   - Boundary values

### 3.2 Considerations for Refactoring

- Tests dependent on implementation details make refactoring difficult
- Focus on externally observable behavior allows free internal implementation changes

## 4. Implementation Example: Improving MaterialsPage Tests

### 4.1 Problematic Approach

Issues occurred trying to test complex state management and URL parameter synchronization:

- Complexity of module state management with `jest.isolateModules`
- Difficulty simulating coordination between `router.replace` and useSearchParams
- Fragile tests that are hard to maintain

### 4.2 Improved Approach

1. **Simplify implementation**

   - Remove unnecessary state management
   - Use URL parameters as the single source of truth

2. **Make tests user-centric**

   - Verify filter input and button click behavior
   - Focus on display result validation

3. **Minimize mocks**
   - Mock only fetch responses
   - Verify routing function calls

## 5. Form Testing Best Practices

### 5.1 HTML5 Form Validation and JSDOM

**Problem**: JSDOM doesn't fully support HTML5 form validation (required attributes, etc.)

**Solution**:

```javascript
// Directly simulate form submission
const submitForm = async () => {
  const form = screen.getByTestId('form-id') as HTMLFormElement;
  const submitEvent = new Event('submit', {
    bubbles: true,
    cancelable: true
  });
  fireEvent(form, submitEvent);
};
```

### 5.2 FormData Object Mock Verification

**Problem**: jest-fetch-mock treats FormData as a mock object

**Solution**:

```javascript
// ❌ Bad example
expect(fetchMock).toHaveBeenCalledWith('/api/endpoint', {
  method: 'POST',
  body: expect.any(FormData), // FormData constructor not recognized
});

// ✅ Good example
expect(fetchMock).toHaveBeenCalledWith('/api/endpoint', {
  method: 'POST',
  body: expect.objectContaining({
    append: expect.any(Function), // Verify by FormData methods
  }),
});
```

### 5.3 Testing Date Input Fields

**Problem**: datetime-local type inputs don't accept invalid values

**Solution**:

```javascript
// Set value directly with fireEvent
fireEvent.input(dateInput, { target: { value: 'invalid-date' } });

// Or manipulate value property directly
Object.defineProperty(dateInput, 'value', {
  writable: true,
  value: 'invalid-date',
});
```

## 6. Checklist

Before writing tests, verify:

- [ ] Is what this test is trying to verify clear?
- [ ] Is this test meaningful from the user's perspective?
- [ ] Does it not depend too much on implementation details?
- [ ] Are mocks kept to a minimum?
- [ ] When the test fails, is it immediately clear what the problem is?
- [ ] For form tests, are JSDOM limitations considered?

## 7. Reference Links

- [Testing Library - Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds - Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details)
- [Next.js - Testing](https://nextjs.org/docs/testing)

## 8. E2E Testing Best Practices

### 8.1 Purpose of E2E Tests

E2E tests verify actual user workflows and ensure the entire system works correctly.

### 8.2 E2E Testing with Playwright

**Test Structure**:

```typescript
// e2e/tests/materials/materials-list.spec.ts
import { test, expect } from '../../fixtures/test-fixtures';
import { NavigationHelper } from '../../helpers/navigation';

test.describe('Materials List Page', () => {
  test('materials list page displays correctly', async ({ page }) => {
    // Simulate user operations
    await page.goto('/materials');

    // Verify what users see
    await expect(page.locator('h1')).toHaveText('Materials');
  });
});
```

### 8.3 E2E Testing Principles

1. **User-perspective descriptions**

   - Focus on user operations and expected results, not implementation details

2. **Ensure independence**

   - Each test doesn't depend on other tests
   - Manage test data creation and deletion per test

3. **Appropriate wait handling**

   ```typescript
   // ❌ Bad example: Fixed time waits
   await page.waitForTimeout(3000);

   // ✅ Good example: Condition-based waits
   await page.waitForSelector('h1:has-text("Materials")');
   await page.waitForLoadState('networkidle');
   ```

4. **Utilize helper functions**
   ```typescript
   // Create reusable helpers
   class NavigationHelper {
     async goToMaterialsPage() {
       await this.page.goto('/materials');
       await this.page.waitForLoadState('networkidle');
     }
   }
   ```

### 8.4 Distinguishing E2E Tests from Unit Tests

- **Unit Tests**: Individual function and component behavior
- **Integration Tests**: Coordination between multiple components
- **E2E Tests**: Complete actual user workflows

### 8.5 E2E Tests in CI/CD

GitHub Actions execution:

- Run smoke tests per PR
- Run all E2E tests before merging to main
- Save screenshots and traces on failure

### 8.6 E2E Test Maintenance

**Handling screen changes**:

- Always update related E2E tests when changing UI or flows
- Follow selector changes
- Add corresponding E2E tests for new features
- Delete tests for removed features

### 8.7 E2E Test Execution Time Reduction Strategy

**Problem**: Running all tests at once takes too long, reducing development efficiency

**Solution**: Tag-based staged execution

```typescript
// Add tags to tests
test.describe('@smoke @critical Equipment Master', () => {
  test('basic functionality check', async ({ page }) => {
    // Smoke test
  });
});

test.describe('@master Equipment Master', () => {
  test('equipment creation, edit, deletion', async ({ page }) => {
    // Feature test
  });
});
```

**Execution Strategy**:

```bash
# During development (1-2 minutes)
npm run e2e:smoke        # Basic functionality only

# Before commit (2-4 minutes)
npm run e2e:materials    # Only changed features

# Before PR creation (5-10 minutes)
npm run e2e:smoke        # Smoke tests
npm run e2e:cross-browser -- --grep "@critical"  # Cross-browser critical features
```

### 8.8 react-hook-form Validation Testing

**Problem**: In react-hook-form's 'onSubmit' mode, validation doesn't fire on field focus/blur operations

**Solution**:

```typescript
// ❌ Bad example: Expecting validation on field operations
await nameInput.focus();
await nameInput.fill('');
await nameInput.blur();
await expect(page.getByText('Name is required')).toBeVisible(); // Fails

// ✅ Good example: Trigger validation on form submission
await page.click('button[type="submit"]');
await page.waitForTimeout(500); // Wait for validation display
await expect(page.locator('[role="dialog"]').getByText('Name is required.')).toBeVisible();
```

### 8.9 Dummy File Upload Testing

**File upload methods in Playwright**:

```typescript
// Using actual files
const testFilePath = path.join(process.cwd(), 'test-files', 'test.wav');
await page.locator('input[type="file"]').setInputFiles(testFilePath);

// Generating dummy files
const fileContent = Buffer.from('dummy audio content');
await page.locator('input[type="file"]').setInputFiles({
  name: 'test-audio.wav',
  mimeType: 'audio/wav',
  buffer: fileContent,
});
```

### 8.10 Dynamic UI Testing Strategy

**Problem**: Tests for dynamically displayed elements like modals and dropdowns are unstable

**Solution**:

```typescript
// Manage modal open/close with helpers
class ModalHelper {
  async waitForOpen() {
    await this.page.waitForSelector('[role="dialog"]', { state: 'visible' });
  }

  async waitForClose() {
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  }
}

// Usage example
await modal.waitForOpen();
await expect(modal.getTitle()).resolves.toBe('Edit Equipment');
await modal.clickButton('Save');
await modal.waitForClose();
```

### 8.11 Test Data Management Best Practices

**Multilingual test data**:

```typescript
// Include diverse content in seed data
const testMaterials = [
  { title: '🌄 Morning in the Forest', location: 'Tokyo' }, // Emoji + Japanese location
  { title: 'Ocean Waves', location: 'California' }, // English
  { title: 'Afternoon at Cafe ☕', location: 'Kyoto' }, // Mixed
];
```

**Maintaining test independence**:

- Recreate E2E database for each test run
- Create only necessary data per test
- No cleanup needed at test end (recreated on next run)

### 8.12 E2E Test Debugging Techniques

**1. Run specific tests only**:

```bash
# Filter with grep pattern
npm run e2e:chrome -- --grep "Equipment.*validation"
```

**2. Disable headless mode**:

```bash
npm run e2e:chrome -- --headed
```

**3. Insert debug points**:

```typescript
test('test needing debug', async ({ page }) => {
  await page.goto('/materials');
  await page.pause(); // Pause here to check with DevTools
  await page.click('button');
});
```

**4. Utilize screenshots**:

```typescript
// Settings to automatically save screenshots on failure
use: {
  screenshot: 'only-on-failure',
  trace: 'on-first-retry',
}
```

### 8.13 Performance-Conscious E2E Test Design

**Optimizing parallel execution**:

- Independent tests can run in parallel
- Tests with database operations run sequentially
- Appropriate separation of browser contexts

**Optimizing wait times**:

```typescript
// ❌ Bad example: Fixed wait times
await page.waitForTimeout(5000);

// ✅ Good example: Condition-based waits
await page.waitForResponse(
  (response) => response.url().includes('/api/materials') && response.status() === 200,
);
```

### 8.14 E2E Test Anti-patterns

**1. Tests dependent on implementation details**:

- Don't depend on CSS class names
- Don't depend on internal state management
- Don't verify API call counts

**2. Fragile selectors**:

```typescript
// ❌ Bad example
await page.click('.MuiButton-root.MuiButton-containedPrimary');

// ✅ Good example
await page.click('button:has-text("Save")');
await page.click('[role="button"][aria-label="Save"]');
```

**3. Dependencies between tests**:

- Don't depend on results from previous tests
- Don't create shared state
- Perform necessary setup in each test

## 9. file-system.ts のテスト戦略と現在の実装について

### 9.1 現在の実装状況

**重要**: file-system.test.ts は意図的に純粋関数のみをテストしています。これは技術的な制約と実用性のバランスを考慮した設計判断です。

**テストされている関数**:

- `validateAndNormalizePath` - パスの検証と正規化（純粋関数）
- `logFileOperation` - 操作ログの出力（console.logのモックで対応可能）

**テストされていない関数**:

- `deleteFile` - ファイル削除（fs/promises依存）
- `checkFileExists` - ファイル存在確認（fs/promises依存）
- `markFileForDeletion` - ファイルのマーク（fs/promises依存）
- `unmarkFileForDeletion` - マークの解除（fs/promises依存）
- `cleanupOrphanedFiles` - 孤立ファイルのクリーンアップ（fs/promises依存）

### 9.2 なぜこのような実装になっているか

#### 9.2.1 fs/promises モジュールのモック問題

Jest環境でfs/promisesモジュールをモックする際に、以下の技術的な課題があります：

**問題1: ES Modules の動的インポート**

```javascript
// 通常のモック方法が機能しない
jest.mock('fs/promises'); // これだけでは不十分

// fs/promisesの各メソッドを個別にモックする必要がある
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  access: jest.fn(),
  rename: jest.fn(),
  readdir: jest.fn(),
}));
```

**問題2: モックのリセットとアクセス**

```javascript
// モックへのアクセスが複雑
import * as fs from 'fs/promises';
// fs.unlink.mockReset() // TypeScriptエラー：mockResetは存在しない
```

**問題3: TypeScriptの型推論**

```javascript
// 型の不整合が発生
const mockFs = fs as jest.Mocked<typeof fs>;
// それでも完全には解決しない
```

#### 9.2.2 実装の設計判断

これらの問題を踏まえて、以下の設計判断を行いました：

1. **純粋関数のテストに集中**

   - パス検証ロジック（`validateAndNormalizePath`）は複雑で重要
   - ファイルシステムに依存しないため、完全にテスト可能
   - セキュリティ上重要な機能（パストラバーサル攻撃の防止）

2. **ログ関数のテスト**

   - `logFileOperation`はconsole.logのラッパー
   - console.logはJestで簡単にモック可能
   - ログフォーマットの正確性を保証

3. **非同期ファイル操作の非テスト**
   - 実際のファイルシステム操作は薄いラッパー
   - Node.jsのfs/promisesモジュール自体は十分にテストされている
   - 統合テストやE2Eテストでカバーする方が適切

### 9.3 テストの実装詳細

#### 9.3.1 パス検証テストの重要性

```javascript
describe('validateAndNormalizePath', () => {
  // パストラバーサル攻撃の防止
  it('should throw error for path traversal attempts with ../', () => {
    expect(() => validateAndNormalizePath('../../../etc/passwd', baseDir)).toThrow(
      'Path traversal attempt detected',
    );
  });

  // プラットフォーム間の差異への対応
  it('should handle Windows-style path separators on Unix', () => {
    // Unix環境では \ はファイル名の一部として扱われる
    const result = validateAndNormalizePath('subfolder\\test.wav', baseDir);
    expect(result).toBe(path.resolve(baseDir, 'subfolder\\test.wav'));
  });
});
```

#### 9.3.2 ログ機能のテスト

```javascript
describe('logFileOperation', () => {
  // 構造化ログの検証
  it('should log all required fields', async () => {
    const logEntry = {
      operation: 'delete' as const,
      path: '/test/file.wav',
      materialId: 'mat-123',
      success: false,
      error: 'File not found',
      timestamp: '2024-01-01T12:00:00.000Z'
    };

    await logFileOperation(logEntry);

    const logCall = (console.log as jest.Mock).mock.calls[0][0];
    const parsedLog = JSON.parse(logCall);

    // JSONフォーマットの検証
    expect(parsedLog.level).toBe('error');
    expect(parsedLog.message).toBe('File operation');
    // ... その他のフィールド
  });
});
```

### 9.4 将来的な改善案（実装しない理由も含む）

#### 9.4.1 fs/promisesのモック実装案（推奨しない）

```javascript
// このような実装は複雑でメンテナンスが困難
const mockFs = {
  unlink: jest.fn(),
  access: jest.fn(),
  rename: jest.fn(),
  readdir: jest.fn(),
};

jest.doMock('fs/promises', () => mockFs);

// 各テストでのリセットも複雑
beforeEach(() => {
  Object.values(mockFs).forEach((mock) => mock.mockReset());
});
```

**推奨しない理由**:

- モックの管理が複雑
- TypeScriptの型エラーが頻発
- 実際のファイルシステムの動作との乖離リスク
- メンテナンスコストが高い

#### 9.4.2 統合テストでのカバー（推奨）

ファイルシステム操作は以下の方法でテストする方が適切：

1. **E2Eテスト**

   - 実際のファイルアップロード・削除フローでテスト
   - ブラウザを通じた実際のユーザー操作を再現

2. **統合テスト用の別環境**

   - テスト用の一時ディレクトリを使用
   - 実際のファイルシステムで動作確認

3. **手動テスト**
   - 開発環境での動作確認
   - エッジケースの検証

### 9.5 重要な注意事項

**⚠️ このテストファイルを変更しないでください**

file-system.test.tsの現在の実装は、以下の理由で意図的にこの形になっています：

1. **技術的制約**: fs/promisesのモックは困難で不安定
2. **実用性**: 純粋関数のテストで十分なカバレッジを達成
3. **保守性**: シンプルな実装で長期的に安定
4. **効率性**: 重要な機能（セキュリティ）に焦点を当てている

この実装方針は、チーム内で合意された設計判断であり、安易に変更すべきではありません。

### 9.6 fs/promisesモックの失敗例と教訓

以下は過去に試みられ、失敗したアプローチの記録です：

#### 失敗例1: jest.mockによる直接モック

```javascript
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  // ... 他のメソッド
}));

// 問題: モックへのアクセスができない
// TypeError: _promises.unlink.mockReset is not a function
```

#### 失敗例2: requireMockの使用

```javascript
const mockFs = jest.requireMock('fs/promises');
// 問題: TypeScriptの型エラー、実行時エラー
```

#### 失敗例3: 手動モックファイル

```javascript
// __mocks__/fs/promises.js
module.exports = {
  unlink: jest.fn(),
  // ...
};

// 問題: ES Modules環境での互換性問題
```

これらの失敗から学んだ教訓：

- Node.js標準モジュールのモックは避ける
- 薄いラッパー関数のテストに過度な労力をかけない
- より高レベルのテスト（E2E）で実際の動作を検証する

---

Last updated: June 23, 2025
