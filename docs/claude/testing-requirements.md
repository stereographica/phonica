# Testing Requirements

## General Testing Guidelines

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

## E2E Test Maintenance

When modifying UI or user flows, ALWAYS update corresponding E2E tests:

- Update selectors if HTML structure changes
- Update test steps if user flow changes
- Add new E2E tests for new features with appropriate tags (@smoke, @master, @materials, @workflow)
- Remove E2E tests for deleted features

### Test Execution Strategy

- During development: Run only affected tests with `npm run e2e -- --grep "test-name"`
- Before commit: Run all E2E tests `npm run e2e` or relevant feature group (e.g., `npm run e2e:materials`)
- Before PR: Run all E2E tests `npm run e2e` (recommended)
- Tag new tests appropriately for selective execution

### Test Organization

- **For new features**: Add tests to appropriate category (master/, materials/, workflows/)
- **For UI changes**: Update helper classes in `/e2e/helpers/` if common patterns change
- **For data model changes**: Update both seed data and workflow tests

## E2E Test Management and Scripts

The `scripts/` directory contains critical infrastructure for E2E testing that requires maintenance during development:

### Scripts Overview

- **`e2e-db-setup.ts`**: Complete E2E database lifecycle management
- **`run-e2e-with-db.ts`**: Orchestrates E2E test execution with isolated database
- **`seed-test-data.ts`**: Manages test data with multilingual content (Japanese, English, emojis)

### When to Update E2E Infrastructure

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

### E2E Test Maintenance Checklist

When making changes, verify:

- [ ] Seed data includes test cases for new features
- [ ] Test selectors match updated UI structure
- [ ] Workflow tests cover new user paths
- [ ] Skip tests are properly marked for unimplemented features
- [ ] Test data includes diverse content (multilingual, edge cases)

### Test Data Strategy

The seed data is designed with:

- **Multilingual Content**: Japanese, English, and emoji combinations
- **Realistic Scenarios**: Real-world field recording examples
- **Edge Cases**: Various data formats, lengths, and types
- **Relationships**: Complex many-to-many associations for comprehensive testing

### Debugging E2E Issues

Common scenarios and solutions:

- **Database Connection Issues**: Check PostgreSQL service and credentials
- **Port Conflicts**: The script auto-detects port conflicts and adapts
- **Timing Issues**: Increase timeouts in `run-e2e-with-db.ts` if needed
- **Seed Data Failures**: Check Prisma schema compatibility with seed script

### Performance Considerations

- E2E database is recreated for each test run to ensure isolation
- Test data is optimized for fast seeding (~21 materials, 8 equipment, 8 tags)
- Development server startup is monitored for automatic test execution

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

## Tool Usage Notes

### Playwright Test Report

- **DO NOT use `npx playwright show-report`**: This command starts a server to display HTML reports interactively, which is not useful in a CLI context
- **Instead, use `--reporter=list`**: For debugging E2E test failures, use list reporter to see detailed test output in the terminal
