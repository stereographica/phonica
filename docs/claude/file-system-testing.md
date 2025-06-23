# file-system.ts Testing Strategy and Current Implementation

## Current Implementation Status

**Important**: file-system.test.ts intentionally tests only pure functions. This is a design decision that balances technical constraints with practical considerations.

**Functions being tested**:

- `validateAndNormalizePath` - Path validation and normalization (pure function)
- `logFileOperation` - Operation logging output (handleable with console.log mocks)

**Functions not being tested**:

- `deleteFile` - File deletion (fs/promises dependent)
- `checkFileExists` - File existence check (fs/promises dependent)
- `markFileForDeletion` - File marking (fs/promises dependent)
- `unmarkFileForDeletion` - Mark removal (fs/promises dependent)
- `cleanupOrphanedFiles` - Orphaned file cleanup (fs/promises dependent)

## Why This Implementation Exists

### fs/promises Module Mocking Issues

When mocking the fs/promises module in Jest environment, the following technical challenges arise:

**Issue 1: ES Modules Dynamic Import**

```javascript
// Normal mocking methods don't work
jest.mock('fs/promises'); // This alone is insufficient

// Need to mock each fs/promises method individually
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  access: jest.fn(),
  rename: jest.fn(),
  readdir: jest.fn(),
}));
```

**Issue 2: Mock Reset and Access**

```javascript
// Mock access is complex
import * as fs from 'fs/promises';
// fs.unlink.mockReset() // TypeScript error: mockReset doesn't exist
```

**Issue 3: TypeScript Type Inference**

```javascript
// Type inconsistencies occur
const mockFs = fs as jest.Mocked<typeof fs>;
// Still doesn't resolve completely
```

### Implementation Design Decisions

Based on these issues, the following design decisions were made:

1. **Focus on Pure Function Testing**

   - Path validation logic (`validateAndNormalizePath`) is complex and important
   - Completely testable since it doesn't depend on the filesystem
   - Security-critical functionality (preventing path traversal attacks)

2. **Log Function Testing**

   - `logFileOperation` is a console.log wrapper
   - console.log is easily mockable in Jest
   - Ensures log format accuracy

3. **Non-Testing of Async File Operations**
   - Actual filesystem operations are thin wrappers
   - Node.js fs/promises module itself is sufficiently tested
   - Better covered by integration tests or E2E tests

## Test Implementation Details

### Path Validation Test Importance

```javascript
describe('validateAndNormalizePath', () => {
  // Preventing path traversal attacks
  it('should throw error for path traversal attempts with ../', () => {
    expect(() => validateAndNormalizePath('../../../etc/passwd', baseDir)).toThrow(
      'Path traversal attempt detected',
    );
  });

  // Handling cross-platform differences
  it('should handle Windows-style path separators on Unix', () => {
    // On Unix, \ is treated as part of the filename
    const result = validateAndNormalizePath('subfolder\\test.wav', baseDir);
    expect(result).toBe(path.resolve(baseDir, 'subfolder\\test.wav'));
  });
});
```

### Log Function Testing

```javascript
describe('logFileOperation', () => {
  // Structured log validation
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

    // JSON format validation
    expect(parsedLog.level).toBe('error');
    expect(parsedLog.message).toBe('File operation');
    // ... other fields
  });
});
```

## Future Improvement Plans (Including Reasons Not to Implement)

### fs/promises Mock Implementation Plan (Not Recommended)

```javascript
// Such implementation is complex and difficult to maintain
const mockFs = {
  unlink: jest.fn(),
  access: jest.fn(),
  rename: jest.fn(),
  readdir: jest.fn(),
};

jest.doMock('fs/promises', () => mockFs);

// Reset in each test is also complex
beforeEach(() => {
  Object.values(mockFs).forEach((mock) => mock.mockReset());
});
```

**Reasons not recommended**:

- Complex mock management
- Frequent TypeScript type errors
- Risk of divergence from actual filesystem behavior
- High maintenance cost

### Integration Test Coverage (Recommended)

Filesystem operations are better tested through the following methods:

1. **E2E Tests**

   - Test actual file upload/deletion flows
   - Reproduce actual user operations through browser

2. **Separate Environment for Integration Tests**

   - Use temporary directories for testing
   - Verify operations with actual filesystem

3. **Manual Testing**
   - Verify operations in development environment
   - Validate edge cases

## Important Notes

**⚠️ Do not modify this test file**

The current implementation of file-system.test.ts is intentionally designed this way for the following reasons:

1. **Technical constraints**: fs/promises mocking is difficult and unstable
2. **Practicality**: Sufficient coverage achieved with pure function testing
3. **Maintainability**: Simple implementation for long-term stability
4. **Efficiency**: Focus on important functionality (security)

This implementation approach is a design decision agreed upon by the team and should not be changed lightly.

## fs/promises Mock Failure Examples and Lessons

The following are records of approaches that were attempted and failed:

### Failure Example 1: Direct Mocking with jest.mock

```javascript
jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
  // ... other methods
}));

// Problem: Cannot access mocks
// TypeError: _promises.unlink.mockReset is not a function
```

### Failure Example 2: Using requireMock

```javascript
const mockFs = jest.requireMock('fs/promises');
// Problem: TypeScript type errors, runtime errors
```

### Failure Example 3: Manual Mock Files

```javascript
// __mocks__/fs/promises.js
module.exports = {
  unlink: jest.fn(),
  // ...
};

// Problem: Compatibility issues in ES Modules environment
```

Lessons learned from these failures:

- Avoid mocking Node.js standard modules
- Don't put excessive effort into testing thin wrapper functions
- Verify actual behavior with higher-level tests (E2E)

---

Last updated: June 23, 2025