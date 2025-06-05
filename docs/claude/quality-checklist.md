# Quality Checklist

## BEFORE COMMITTING (CI failures cause significant delays and waste everyone's time):

- [ ] All tests pass (`npm test`)
- [ ] No lint errors (`npm run lint`)
- [ ] No type errors (`npx tsc --noEmit`)
- [ ] Dev server runs without errors (`npm run dev`)

## BEFORE PUSHING (Run CI-equivalent tests to prevent failures):

- [ ] CI environment tests pass: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db NODE_ENV=test npm test -- --coverage --watchAll=false`
- [ ] Build succeeds: `DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build`
- [ ] Lint & type check pass: `npm run lint && npx tsc --noEmit`
- [ ] Security audit passes: `npm audit --audit-level=moderate`
- [ ] E2E tests pass: `npm run e2e` - **REQUIRED: This is a mandatory check in CI**

## Before creating a PR, ensure:

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
