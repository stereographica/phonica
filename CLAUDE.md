# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Phonica is a field recording material management tool built with Next.js and TypeScript. It's designed to efficiently manage audio recordings with metadata including location, equipment, tags, and technical specifications.

## Commands

### Development
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build production version
npm run start        # Start production server
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm test            # Run all unit tests
npx tsc --noEmit    # Type check without emitting files
```

### Database
```bash
npx prisma migrate dev    # Run database migrations
npx prisma studio        # Open Prisma Studio for database inspection
npx prisma generate      # Generate Prisma Client
```

### E2E Testing

#### 🚀 Basic Execution
```bash
npm run e2e              # Run all E2E tests in parallel (recommended)
npm run e2e:with-report  # Run tests and open HTML report
```

#### 🌐 Browser-specific Execution (for development only)
```bash
npm run e2e:chrome       # Chromium only (fastest)
npm run e2e:cross-browser # Major browsers
```

#### 📋 Feature-specific Execution (when needed)
```bash
npm run e2e:smoke        # Smoke tests only
npm run e2e:master       # Master data features
npm run e2e:materials    # Material management features
npm run e2e:workflows    # Workflow tests
```

#### 🔍 Debugging & Detailed Execution
```bash
npm run e2e:ui       # UI mode for debugging
npm run e2e:debug    # Debug mode
npm run e2e:report   # Show last test report

# Run specific tests
npm run e2e -- --grep "Equipment.*validation"
```

#### ⚠️ Notes
- `npm run e2e` uses parallel execution for faster test runs
- CI environment automatically limits workers to 1 for stability
- Use feature-specific tests only when testing specific functionality

#### Database Management
```bash
npm run e2e:db:create   # Create E2E test database
npm run e2e:db:migrate  # Run migrations on E2E database
npm run e2e:db:seed     # Seed E2E database with test data
npm run e2e:db:drop     # Drop E2E test database
npm run e2e:db:setup    # Complete setup (create + migrate + seed)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Jotai (atomic state management)
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Testing**: Jest with React Testing Library
- **E2E Testing**: Playwright
- **Background Jobs**: BullMQ with Redis

### Directory Structure
- `/src/app/` - Next.js App Router pages and API routes
  - `(app)/` - Application pages with shared layout
  - `(api)/` - API route grouping
- `/src/components/` - React components organized by feature
- `/src/lib/` - Utility functions and shared logic
- `/src/types/` - TypeScript type definitions
- `/prisma/` - Database schema and migrations
- `/docs/` - Project documentation
- `/e2e/` - End-to-end tests with Playwright
  - `fixtures/` - Test configuration and custom fixtures
  - `helpers/` - Reusable test helper classes for common operations
  - `tests/` - Test files organized by feature area
    - `master/` - Master data management tests (Equipment, Tags)
    - `materials/` - Material CRUD and listing tests  
    - `workflows/` - Complex user journey and integration tests

### Key Design Patterns

1. **API Routes**: All API endpoints follow RESTful conventions in `/src/app/api/`
2. **Component Structure**: Components are organized by feature (materials, master, etc.)
3. **Form Handling**: Uses react-hook-form with zod validation
4. **Testing**: Each component and API route has corresponding test files

### Database Schema

The application uses these main entities:
- **Material**: Audio recordings with metadata
- **Project**: Groups of materials
- **Tag**: Labels for categorization
- **Equipment**: Recording equipment master data

Many-to-many relationships exist between materials and projects/tags/equipment.

## Development Guidelines

### Development Process
Please follow the structured development process documented in `docs/development_process.md`.

#### 1. Task Analysis and Planning
- Start with GitHub issues prioritized by `priority: {critical|high|medium|low}` labels
- Review all docs in `/docs/` directory for constraints and requirements
- **Before implementation, check for**:
  - Existing similar features
  - Functions/components with same or similar names
  - Duplicate API endpoints
  - Reusable common logic
- Create detailed implementation steps and determine optimal execution order

#### 2. Task Execution
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

#### 3. Quality Management
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

#### 4. Pull Request Creation
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

#### 5. User Review Request
- Complete self-checklist before requesting review
- Provide specific test steps for user
- Address reported bugs and add edge cases to tests

#### 6. Post-Review
- User will merge PR after review completion (Claude does not merge PRs)
- Create issues for any problems found during development with:
  - Target location
  - Problem description
  - Proposed solution
  - Related information
  - Acceptance criteria

### Testing Requirements
- Aim for 100% test coverage
- Write tests before implementation (TDD approach)
- Test files use `.test.ts` or `.test.tsx` suffix
- Mock Prisma client is configured in jest.setup.ts
- Commit only when tests pass
- **CRITICAL**: All tests must pass and all coverage metrics (Statements, Branches, Functions, Lines) must exceed 80% before merging. Continue adding tests and running test coverage until all thresholds are met.
- **IMPORTANT**: When writing or modifying tests, strictly follow the guidelines in @docs/testing_best_practices.md . This includes:
  - Writing user-centric tests that focus on observable behavior
  - Avoiding tests that depend on implementation details
  - Using appropriate mocking strategies
  - Following TDD principles properly
- **E2E Test Maintenance**: When modifying UI or user flows, ALWAYS update corresponding E2E tests:
  - Update selectors if HTML structure changes
  - Update test steps if user flow changes
  - Add new E2E tests for new features with appropriate tags (@smoke, @master, @materials, @workflow)
  - Remove E2E tests for deleted features
  - **Test Execution Strategy**:
    - During development: Run only affected tests with `npm run e2e -- --grep "test-name"`
    - Before commit: Run all E2E tests `npm run e2e` or relevant feature group (e.g., `npm run e2e:materials`)
    - Before PR: Run all E2E tests `npm run e2e` (recommended)
    - Tag new tests appropriately for selective execution
  - **For new features**: Add tests to appropriate category (master/, materials/, workflows/)
  - **For UI changes**: Update helper classes in `/e2e/helpers/` if common patterns change
  - **For data model changes**: Update both seed data and workflow tests

### Code Conventions
- Use TypeScript strict mode
- Follow existing patterns for component structure
- Use path aliases (`@/` for src directory)
- Implement proper error handling in API routes
- Remove debug code and console.logs before committing

### Quality Checklist
**BEFORE COMMITTING** (CI failures cause significant delays and waste everyone's time):
- [ ] All tests pass (`npm test`)
- [ ] No lint errors (`npm run lint`)
- [ ] No type errors (`npx tsc --noEmit`)
- [ ] Dev server runs without errors (`npm run dev`)

**BEFORE PUSHING** (Run CI-equivalent tests to prevent failures):
- [ ] CI environment tests pass: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false`
- [ ] Build succeeds: `DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build`
- [ ] Lint & type check pass: `npm run lint && npx tsc --noEmit`
- [ ] Security audit passes: `npm audit --audit-level=moderate`
- [ ] E2E tests pass: `npm run e2e` - **REQUIRED: This is a mandatory check in CI**

Before creating a PR, ensure:
- [ ] All unit tests pass locally (`npm test`)
- [ ] Code changes match the actual implementation (no UI text mismatches)
- [ ] Test assertions match the actual UI/API responses
- [ ] All coverage metrics (Statements, Branches, Functions, Lines) exceed 80%
- [ ] New files have corresponding test files
- [ ] Modified components have updated tests if behavior changed
- [ ] No hardcoded Japanese text in tests if UI uses English (or vice versa)
- [ ] Mock data in tests matches actual API response structure
- [ ] E2E tests pass completely: `npm run e2e` - **MANDATORY for PR approval**
- [ ] No E2E test failures or skipped tests due to missing implementations

### Important Notes
- Do not change technology stack versions without approval
- Avoid duplicate implementations - check for existing similar functionality
- UI/UX design changes require prior approval
- Address issues listed in docs/issues.md when instructed
- Create GitHub issues for any problems found during development
- **CRITICAL**: E2E tests and Deploy Preview are MANDATORY CI checks - PRs will NOT be merged without these passing
- **IMPORTANT**: Always run `npm run e2e` locally before pushing to avoid CI failures

### E2E Test Management and Scripts

The `scripts/` directory contains critical infrastructure for E2E testing that requires maintenance during development:

#### Scripts Overview
- **`e2e-db-setup.ts`**: Complete E2E database lifecycle management
- **`run-e2e-with-db.ts`**: Orchestrates E2E test execution with isolated database
- **`seed-test-data.ts`**: Manages test data with multilingual content (Japanese, English, emojis)

#### When to Update E2E Infrastructure

**Database Schema Changes** 🗄️
- **When**: Adding/modifying Prisma models, fields, or relationships
- **Action**: Update `seed-test-data.ts` to include new fields and realistic test data
- **Example**: Adding new Material fields requires corresponding test data entries

**New Feature Implementation** 🚀
- **When**: Adding new pages, components, or user flows
- **Action**: 
  1. Add corresponding E2E tests in appropriate directory (`/e2e/tests/`)
  2. Update seed data if new entity types are needed
  3. Update workflows tests for new user journeys

**UI Structure Changes** 🎨
- **When**: Changing HTML structure, CSS classes, or component hierarchy
- **Action**: Update selectors in E2E tests and helper classes
- **Critical**: Changes to form fields, buttons, or navigation elements

**API Endpoint Changes** 🔧
- **When**: Modifying API routes, request/response formats, or validation
- **Action**: Update corresponding E2E tests that interact with these endpoints

#### E2E Test Maintenance Checklist
When making changes, verify:
- [ ] Seed data includes test cases for new features
- [ ] Test selectors match updated UI structure
- [ ] Workflow tests cover new user paths
- [ ] Skip tests are properly marked for unimplemented features
- [ ] Test data includes diverse content (multilingual, edge cases)

#### Test Data Strategy
The seed data is designed with:
- **Multilingual Content**: Japanese, English, and emoji combinations
- **Realistic Scenarios**: Real-world field recording examples
- **Edge Cases**: Various data formats, lengths, and types
- **Relationships**: Complex many-to-many associations for comprehensive testing

#### Debugging E2E Issues
Common scenarios and solutions:
- **Database Connection Issues**: Check PostgreSQL service and credentials
- **Port Conflicts**: The script auto-detects port conflicts and adapts
- **Timing Issues**: Increase timeouts in `run-e2e-with-db.ts` if needed
- **Seed Data Failures**: Check Prisma schema compatibility with seed script

#### Performance Considerations
- E2E database is recreated for each test run to ensure isolation
- Test data is optimized for fast seeding (~21 materials, 8 equipment, 8 tags)
- Development server startup is monitored for automatic test execution

### Background Jobs
The application uses BullMQ for background tasks like ZIP file generation. Redis is required for job queue management.

### Browser Compatibility Issues

#### FormData Boundary Error in Firefox/WebKit
When using multipart/form-data with FormData in Next.js 15 + Turbopack, Firefox and WebKit browsers may encounter a boundary parsing error. This is resolved by:

1. **Using Server Actions (Recommended)**: Server actions handle FormData parsing internally without browser-specific issues
2. **Test-specific Endpoints**: E2E tests use alternate endpoints for Firefox/WebKit to bypass the issue
3. **See `docs/formdata-browser-compatibility.md`** for detailed information and implementation guidelines

**Important**: Always prefer server actions for new form implementations to ensure cross-browser compatibility.

## E2E Test Execution Rules

### Timeout Configuration
- **ALWAYS use 10-minute timeout (600000ms)** when executing E2E tests via Bash tool
- Never start with shorter timeouts as it wastes time with multiple retries
- The 10-minute timeout applies to all E2E test executions without exception

### Handling Test Timeouts
- **When tests timeout**: Focus on resolving the timeout issue FIRST before attempting any fixes
- **PROHIBITED**: Starting fix work based on partial/limited test results from timeout executions
- **REQUIRED**: Get complete test results by:
  1. Running specific failing tests in isolation
  2. Using headed mode (`--headed`) for visual debugging if needed
  3. Increasing Playwright's internal timeouts if necessary
  4. Only proceed with fixes after understanding the complete failure scenario

### Best Practices
- For faster feedback during debugging, run specific tests using grep patterns
- Use staged execution approach (smoke → feature → workflow) for systematic testing
- Always verify fixes with complete test runs, not partial results

## Critical Testing Rules to Prevent CI Failures

### 🚨 MANDATORY Test Execution Before Git Operations

1. **Before EVERY commit**:
   - Run `npm test` and ensure ALL tests pass
   - Even small changes can break tests (e.g., removing an alert, changing button text)
   - NEVER commit with failing tests - fix them first

2. **Before EVERY push**:
   - Run full CI simulation locally
   - This prevents embarrassing CI failures and saves time
   - CI failures block PR merging and delay the entire team

3. **Common Test-Breaking Changes**:
   - Removing `alert()` calls → Update tests to not expect alerts
   - Changing UI text (Japanese ↔ English) → Update all test assertions
   - Modifying API responses → Update mock data in tests
   - Changing component behavior → Update behavioral tests
   - Adding/removing form fields → Update form submission tests

4. **Test-First Mindset**:
   - When changing ANY code, ask: "Which tests might this break?"
   - Update tests IMMEDIATELY after changing implementation
   - Run tests BEFORE committing, not after CI fails

### 🛡️ Zero-Tolerance Policy
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

3. **Complete problem resolution**:
   - For ALL test cases, DO NOT skip tests to bypass failures
   - MUST fix all failing tests before committing
   - MUST resolve the root cause of test failures, not work around them
   - If a test is genuinely outdated, update it properly rather than skipping
