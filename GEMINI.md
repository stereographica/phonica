# GEMINI.md

This document provides guidance for the Gemini agent when working in the Phonica repository. It outlines critical rules, project architecture, development workflows, and testing strategies to ensure efficient and high-quality contributions.

## 🚨 Critical Rules

1.  **Never commit directly to `main`**: Always use feature branches and create Pull Requests.
2.  **Pass all tests before committing**: Never commit failing tests. This includes unit, integration, and E2E tests.
3.  **Do not use `--no-verify`**: Bypass pre-commit hooks only with explicit user instruction for non-code changes (e.g., documentation).
4.  **Follow TDD**: Write tests before implementing new features or fixing bugs.
5.  **Run E2E tests locally before pushing**: All E2E tests must pass locally to prevent CI failures. Use `npm run e2e`.

---

## 🚀 Project Overview

- **Application**: Phonica is a field recording material management tool.
- **Tech Stack**: Next.js 15, React 19, TypeScript, PostgreSQL, Prisma, TanStack Query, Tailwind CSS, Jest, Playwright, BullMQ.
- **Key Goal**: Efficiently manage audio recordings with rich metadata.

---

## ⚙️ Development Workflow

Follow this structured process for all development tasks.

### 1. Setup

1.  Get the latest code: `git checkout main && git pull origin main`
2.  Create a new branch based on the task:
    - `feature/issue-{number}-{description}`
    - `fix/issue-{number}-{description}`
    - `refactor/issue-{number}-{description}`
    - `test/issue-{number}-{description}`

### 2. Implementation (TDD)

1.  **Write Tests First**: Before writing implementation code, create failing tests that define the desired functionality or reproduce the bug.
2.  **Write Implementation**: Write the minimum amount of code required to make the tests pass.
3.  **Refactor**: Improve the code structure without changing its external behavior.
4.  **Commit**: Commit your changes once all tests pass. `git commit -m "feat: short descriptive message"`

### 3. Quality Assurance (Local CI Simulation)

Before every `git push`, run the following commands to simulate the CI pipeline and prevent failures. **All checks must pass.**

```bash
# 1. Run all unit tests with coverage (CI environment)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false

# 2. Check for build errors
DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build

# 3. Run linter and type checker
npm run lint && npx tsc --noEmit

# 4. Run security audit
npm audit --audit-level=moderate

# 5. Run all E2E tests (MANDATORY CI CHECK)
npm run e2e
```

### 4. Pull Request & Reporting

1.  Push your feature branch to the remote repository.
2.  Create a Pull Request, linking it to the relevant GitHub Issue (e.g., `Closes #123`).
3.  **Create an Implementation Report**: After completing the work, create a report in the `/impl_reports/` directory with the filename `{YYYY-MM-DD}-{implementation-title}.md`. The report must be in Japanese and include:
    - Work Content (作業内容)
    - Knowledge Gained (得られた知識)
    - Improvement Items (改善点)
    - Impressions (感想)

---

## 🛠️ Key Commands

- **Dev Server**: `npm run dev`
- **Unit Tests**: `npm test`
- **E2E Tests (All)**: `npm run e2e`
- **E2E Tests (Specific)**: `npm run e2e -- --grep "TestName"`
- **Lint**: `npm run lint`
- **Type Check**: `npx tsc --noEmit`
- **DB Migration**: `npx prisma migrate dev`

---

## 🏛️ Architecture & Testing

- **Directory Structure**: Core logic is in `/src`. Refer to `docs/directorystructure.md` for the full map.
- **State Management**: Primarily use **TanStack Query** for server state and **React State/URL State** for client state. Jotai is installed but not actively used. See `docs/claude/state-management-guide.md`.
- **Unit Testing**:
  - Follow user-centric principles from `docs/claude/testing-best-practices.md`.
  - Aim for >80% coverage on all metrics (Statements, Branches, Functions, Lines).
- **E2E Testing**:
  - Use helper classes in `e2e/helpers` for reusable logic.
  - Tag new tests appropriately (`@smoke`, `@critical`, `@materials`, `@master`, `@workflow`).
  - Use a 10-minute timeout for all E2E test executions.
  - Do not use `e2e:with-report` or `npx playwright show-report` in the CLI.

---

## 📚 Documentation Reference

For more detailed information, refer to the complete documentation in the `/docs` directory, especially:

- `docs/claude/architecture.md`: System architecture details.
- `docs/claude/development-process.md`: Full development process.
- `docs/claude/testing-requirements.md`: Detailed testing requirements.
- `docs/claude/performance-optimization.md`: Performance guidelines.
- `docs/claude/modern-architecture-patterns.md`: Next.js 15/React 19 patterns.
- `docs/formdata-browser-compatibility.md`: Guide for handling FormData across browsers.
