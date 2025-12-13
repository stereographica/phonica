# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MOST CRITICAL RULES

1. **NEVER commit or push directly to main branch** - Always use feature branches and PRs
2. **NEVER commit failing tests** - All tests must pass before committing
3. **NEVER use `--no-verify` flag** unless explicitly instructed by the user
4. **ALWAYS follow TDD** - Write tests before implementation
5. **ALWAYS run E2E tests locally** before pushing to avoid CI failures

## 🎯 E2E Test Execution Rules

1. **ALWAYS use maximum timeout** for E2E tests (including pre-commit hook execution) - Set timeout to 10 minutes (600000ms) to avoid unnecessary retries
2. **Run only necessary test cases** after fixing E2E tests - Use grep patterns to filter specific tests and reduce execution time
3. **NEVER use `e2e:with-report`** in CLI context - This command opens browser-based reports which is not useful for automated testing

## Project Overview

Phonica is a field recording material management tool built with Next.js 15, React 19, and TypeScript. It efficiently manages audio recordings with metadata including location, equipment, tags, and technical specifications using modern web technologies including TanStack Query, Prisma ORM, and BullMQ for background processing.

## 📚 Documentation Structure

This documentation is organized into focused sections. Import relevant sections as needed:

### Core References

- **Commands**: @docs/claude/commands.md
- **Architecture**: @docs/claude/architecture.md
- **Modern Architecture Patterns**: @docs/claude/modern-architecture-patterns.md

### Development Guidelines

- **Development Process**: @docs/claude/development-process.md
- **Code Conventions**: @docs/claude/code-conventions.md
- **State Management Guide**: @docs/claude/state-management-guide.md
- **Performance Optimization**: @docs/claude/performance-optimization.md

### Testing & Quality

- **Testing Requirements**: @docs/claude/testing-requirements.md
- **Testing Best Practices**: @docs/claude/testing-best-practices.md
- **Quality Checklist**: @docs/claude/quality-checklist.md
- **Critical Rules**: @docs/claude/critical-rules.md

### Additional Resources

- **User Interface Specifications**: @docs/claude/user-interface-specifications.md
- **Development Process Details**: @docs/development_process.md
- **Implementation Reports**: @impl_reports/README.md

## Implementation Report Requirements

**MANDATORY**: After completing any instructed work, create an implementation report in `/impl_reports/`:

1. **File naming**: `{YYYY-MM-DD}-{implementation-title}.md`
2. **Content format**: Follow template in @impl_reports/README.md
3. **Language**: Write in Japanese
4. **Required sections**: Work content, knowledge gained, improvement items, work impressions

## Quick Start

1. Always check relevant documentation sections before starting work
2. Follow the development process strictly
3. Use modern architecture patterns from @docs/claude/modern-architecture-patterns.md
4. Apply state management guidelines from @docs/claude/state-management-guide.md
5. Run quality checks before every commit and push
6. Create implementation report after work completion
7. Create issues for any problems encountered during development

Remember: Every CI failure wastes time and delays delivery. Test locally, commit confidently.
