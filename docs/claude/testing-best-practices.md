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
- **E2E Tests**: Verify actual interaction with browser APIs (Chrome-only for consistency)

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

For E2E testing best practices, see @docs/claude/e2e-testing-guide.md
For file-system testing strategy, see @docs/claude/file-system-testing.md
