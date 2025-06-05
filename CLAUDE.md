# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 MOST CRITICAL RULES

1. **NEVER commit or push directly to main branch** - Always use feature branches and PRs
2. **NEVER commit failing tests** - All tests must pass before committing
3. **NEVER use `--no-verify` flag** unless explicitly instructed by the user
4. **ALWAYS follow TDD** - Write tests before implementation
5. **ALWAYS run E2E tests locally** before pushing to avoid CI failures

## Project Overview

Phonica is a field recording material management tool built with Next.js and TypeScript. It's designed to efficiently manage audio recordings with metadata including location, equipment, tags, and technical specifications.

## 📚 Documentation Structure

This documentation is organized into focused sections. Import relevant sections as needed:

### Core References

- **Commands**: @docs/claude/commands.md
- **Architecture**: @docs/claude/architecture.md

### Development Guidelines

- **Development Process**: @docs/claude/development-process.md
- **Code Conventions**: @docs/claude/code-conventions.md

### Testing & Quality

- **Testing Requirements**: @docs/claude/testing-requirements.md
- **Quality Checklist**: @docs/claude/quality-checklist.md
- **Critical Rules**: @docs/claude/critical-rules.md

### Additional Resources

- **Testing Best Practices**: @docs/claude/testing-best-practices.md
- **User Interface Specifications**: @docs/claude/user-interface-specifications.md
- **Development Process Details**: @docs/development_process.md

## Quick Start

1. Always check relevant documentation sections before starting work
2. Follow the development process strictly
3. Run quality checks before every commit and push
4. Create issues for any problems encountered during development

Remember: Every CI failure wastes time and delays delivery. Test locally, commit confidently.
