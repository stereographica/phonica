# E2E Testing Best Practices

## Purpose of E2E Tests

E2E tests verify actual user workflows and ensure the entire system works correctly.

## E2E Testing with Playwright

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

## E2E Testing Principles

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

## Distinguishing E2E Tests from Unit Tests

- **Unit Tests**: Individual function and component behavior
- **Integration Tests**: Coordination between multiple components
- **E2E Tests**: Complete actual user workflows

## E2E Tests in CI/CD

GitHub Actions execution:

- Run smoke tests per PR
- Run all E2E tests before merging to main
- Save screenshots and traces on failure

## E2E Test Maintenance

**Handling screen changes**:

- Always update related E2E tests when changing UI or flows
- Follow selector changes
- Add corresponding E2E tests for new features
- Delete tests for removed features

## E2E Test Execution Time Reduction Strategy

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

## react-hook-form Validation Testing

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

## Dummy File Upload Testing

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

## Dynamic UI Testing Strategy

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

## Test Data Management Best Practices

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

## E2E Test Debugging Techniques

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

## Performance-Conscious E2E Test Design

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

## E2E Test Anti-patterns

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