# Critical Rules to Prevent CI Failures

## 🚨 MANDATORY Test Execution Before Git Operations

### 1. Before EVERY commit:

- Run `npm test` and ensure ALL tests pass
- Even small changes can break tests (e.g., removing an alert, changing button text)
- NEVER commit with failing tests - fix them first

### 2. Before EVERY push:

- Run full CI simulation locally
- This prevents embarrassing CI failures and saves time
- CI failures block PR merging and delay the entire team

### 3. Common Test-Breaking Changes:

- Removing `alert()` calls → Update tests to not expect alerts
- Changing UI text (Japanese ↔ English) → Update all test assertions
- Modifying API responses → Update mock data in tests
- Changing component behavior → Update behavioral tests
- Adding/removing form fields → Update form submission tests

### 4. Test-First Mindset:

- When changing ANY code, ask: "Which tests might this break?"
- Update tests IMMEDIATELY after changing implementation
- Run tests BEFORE committing, not after CI fails

## 🛡️ Zero-Tolerance Policy

- **NO EXCUSES**: "I forgot to run tests" is not acceptable
- **NO SHORTCUTS**: "It's a small change" - small changes break tests too
- **NO DELAYS**: Fix test failures immediately, not after pushing

Remember: Every CI failure wastes time, breaks flow, and delays delivery. Test locally, commit confidently.

## Pre-commit Hook Requirements

### 🔒 MANDATORY Pre-commit Hook Execution

1. **Pre-commit hook exists and MUST pass**:

   - The repository has a pre-commit hook that runs ALL tests
   - You CANNOT commit unless ALL tests pass successfully
   - This includes unit tests, lint, type check, and E2E tests

2. **DO NOT modify or bypass pre-commit hooks**:

   - NEVER delete or modify `.husky/pre-commit` file
   - NEVER reduce the number of tests executed in pre-commit hook
   - NEVER use `--no-verify` flag unless explicitly instructed by the user
   - **Exception**: You MAY use `--no-verify` for changes that don't affect test results (documentation, CI configuration, etc.)

3. **Pre-commit hook execution policy**:

   - **MUST run pre-commit hook**: When changing implementation or tests
   - **MAY skip with `--no-verify`**: Only for documentation, CI configuration, or other non-test-affecting changes
   - **ALWAYS verify**: If unsure whether changes affect tests, run the pre-commit hook

4. **Complete problem resolution**:
   - For ALL test cases, DO NOT skip tests to bypass failures
   - MUST fix all failing tests before committing
   - MUST resolve the root cause of test failures, not work around them
   - If a test is genuinely outdated, update it properly rather than skipping
   - **PROHIBITED**: Skipping test cases because they don't pass
   - **Exception**: If fixing the implementation is better than fixing the test, notify the user of this judgment

### 🚦 Pre-commit Hook Timeout Handling

1. **Expected execution time**:

   - **Normal execution**: 5-10 minutes for full test suite
   - **Maximum timeout**: Set to 15 minutes to account for worst-case scenarios
   - **ALWAYS use maximum timeout** when executing pre-commit hooks
   - **DO NOT assume quick completion** even for "small" changes

2. **When pre-commit hook times out**:

   - **IMMEDIATELY report to the user** with the timeout duration
   - **WAIT for explicit user instructions**
   - **DO NOT make autonomous decisions** to use `--no-verify`

3. **Common timeout scenarios**:

   - Large test suites taking longer than expected
   - E2E tests running slowly (especially cross-browser tests)
   - System resource constraints
   - First run after dependency updates

4. **Proper timeout response**:
   ```
   "Pre-commit hook has timed out after X minutes.
   The tests are still running. Would you like me to:
   1. Continue waiting for completion
   2. Use --no-verify flag (not recommended for code changes)
   3. Cancel and investigate the timeout cause"
   ```

### ⚠️ Critical Mindset Principles

1. **No change is too small**:

   - Even "simple" changes like instanceof checks can affect test execution
   - Changing error handling can impact test environments differently
   - Import statement modifications can break module resolution

2. **Urgency is not an excuse**:

   - CI failures create pressure, but rushing increases risk
   - Following process prevents cascading failures
   - One proper fix is better than multiple rushed attempts

3. **When in doubt, ask**:
   - Uncertainty about impact = run the pre-commit hook
   - Ambiguous situations = request user clarification
   - Better to be cautious than create additional problems
