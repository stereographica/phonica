# Code Conventions

## General Guidelines

- Use TypeScript strict mode
- Follow existing patterns for component structure
- Use path aliases (`@/` for src directory)
- Implement proper error handling in API routes
- Remove debug code and console.logs before committing

## Important Notes

- Do not change technology stack versions without approval
- Avoid duplicate implementations - check for existing similar functionality
- UI/UX design changes require prior approval
- Address issues listed in docs/issues.md when instructed
- Create GitHub issues for any problems found during development
- **CRITICAL**: E2E tests and Deploy Preview are MANDATORY CI checks - PRs will NOT be merged without these passing
- **IMPORTANT**: Always run `npm run e2e` locally before pushing to avoid CI failures
