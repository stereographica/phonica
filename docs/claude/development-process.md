# Development Process

Please follow the structured development process documented in `docs/development_process.md`.

## 1. Task Analysis and Planning

- Start with GitHub issues prioritized by `priority: {critical|high|medium|low}` labels
- Review all docs in `/docs/` directory for constraints and requirements
- **Before implementation, check for**:
  - Existing similar features
  - Functions/components with same or similar names
  - Duplicate API endpoints
  - Reusable common logic
- Create detailed implementation steps and determine optimal execution order

## 2. Task Execution

- First, get latest main branch:
  ```bash
  git checkout main
  git pull origin main
  ```
- Create branch using naming convention:
  - `feature/issue-{number}-{description}` (new features)
  - `fix/issue-{number}-{description}` (bug fixes)
  - `test/issue-{number}-{description}` (test additions)
  - `refactor/issue-{number}-{description}` (refactoring)
- **IMPORTANT**: Never commit or push directly to the main branch. Always work on a separate branch and use PR
- Update issue status to `status: in progress`
- Use TodoWrite tool for task management
- **MANDATORY**: Commit only when ALL tests pass - no exceptions
- Follow TDD: Write tests before implementation
- **CRITICAL**: When modifying UI text or behavior, update ALL related tests immediately
- **IMPORTANT**: Run tests after EVERY change to catch mismatches early
- For coverage improvement:
  1. Run `npm test` to check current coverage
  2. Identify code paths that increase coverage most
  3. Add tests and verify coverage improvement

## 3. Quality Management

- **CRITICAL: Pre-push Verification** - Always run ALL checks before pushing. CI failures cause significant delays:
- Run quality checks:
  - `npm test` - All tests pass
  - `npm run lint` - No lint errors
  - `npx tsc --noEmit` - No type errors
  - `npm run dev` - Dev server runs
  - `npm run e2e` - **MANDATORY**: E2E tests must pass (this is a required CI check)
- **MANDATORY**: Run GitHub Actions equivalent tests locally before pushing. ALL must pass:

  ```bash
  # 1. Test with CI environment settings
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false

  # 2. Build check (CI equivalent) - CRITICAL: Catches Next.js specific errors
  DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build

  # 3. Lint & Type check
  npm run lint && npx tsc --noEmit

  # 4. Security audit
  npm audit --audit-level=moderate

  # 5. E2E tests - REQUIRED: These are mandatory CI checks
  npm run e2e
  ```

- **Common CI Failures to Check**:
  - `useSearchParams()` must be wrapped in Suspense boundary
  - Date formatting differences between locales (use flexible patterns)
  - ESModule import issues (check transformIgnorePatterns in jest.config.js)
  - Redis/BullMQ initialization in test environment
  - **UI text mismatches**: Tests expecting different language than implementation
  - **Alert/Toast removal**: Tests expecting alerts that were removed from code
  - **Mock response mismatches**: Test mocks not matching actual API responses
  - **Component behavior changes**: Tests not updated after refactoring
- Fix all errors in current task
- For existing errors outside task scope: Check if GitHub issue exists, create if needed (Step 8)

## 4. Pull Request Creation

- Include in PR body:

  ```markdown
  # {Task Name}

  ## Summary

  [Brief overview]

  ## Implementation Steps

  1. [Step and result]
  2. [Step and result]

  ## Final Deliverables

  [Details of what was created/changed]

  ## Issues Addressed (if applicable)

  - Problems encountered and solutions

  ## Related issue

  - Closes #[issue-number]
  ```

## 5. User Review Request

- Complete self-checklist before requesting review
- Provide specific test steps for user
- Address reported bugs and add edge cases to tests

## 6. Post-Review

- User will merge PR after review completion (Claude does not merge PRs)
- Create issues for any problems found during development with:
  - Target location
  - Problem description
  - Proposed solution
  - Related information
  - Acceptance criteria
