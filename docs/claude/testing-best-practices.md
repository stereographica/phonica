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

---

Last updated: June 2, 2025
