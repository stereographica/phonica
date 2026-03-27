# Issue #141 – E2E Test Stabilization Plan (Improved)

## 1. Issue Context

- **Goal**: Issue [#141](https://github.com/stereographica/phonica/issues/141) targets "Zero Flaky Tests" by eliminating skipped specs, stabilizing waits, adding data-testids, introducing a Page Object Model, and expanding edge-case coverage. The repo rules in `CLAUDE.md` require TDD, running the full CI-equivalent test suite (unit + lint + type + `npm run e2e`) before any push, and filing an implementation report after every task.
- **Evidence Collected**: Pulled the last 10 failing `E2E Tests (Chrome)` job logs via GitHub CLI and stored them under `analysis/e2e-logs/` with a manifest in `analysis/e2e-logs/latest-failures.json`. These runs span 2025‑11‑10 through 2025‑12‑14 and cover both `main` and dependabot PR branches.
- **Key Insight**: All recent workflow failures involve the same small set of flaky specs. Fixing them first will immediately unblock the entire test suite and aligns with Phase 1 of the issue roadmap (skipped tests + wait stabilization + data-testid coverage).

## 2. Recent Failure Summary

| #   | Run (UTC)                       | Branch@SHA                                      | Primary Failures                                 | Duration | Log                                                     |
| --- | ------------------------------- | ----------------------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------- |
| 1   | 2025-12-14 04:40 (#20202777168) | `main@9264d93`                                  | duplicate-title toast missing                    | 495s     | `analysis/e2e-logs/run-20202777168-job-57997063326.log` |
| 2   | 2025-12-14 04:31 (#20202685847) | `main@a0c36d3c`                                 | duplicate-title + 2× 600s timeouts               | 1705s    | `analysis/e2e-logs/run-20202685847-job-57996825529.log` |
| 3   | 2025-12-14 04:08 (#20202441975) | `main@6c37b134`                                 | duplicate-title toast                            | 498s     | `analysis/e2e-logs/run-20202441975-job-57996213711.log` |
| 4   | 2025-12-14 03:55 (#20202294394) | `dependabot/actions-script-8@5e136e0c`          | duplicate-title + 3× 600s waits                  | 2292s    | `analysis/e2e-logs/run-20202294394-job-57995838632.log` |
| 5   | 2025-12-14 03:54 (#20202283318) | `dependabot/bullmq-5.63.0@781aaca1`             | duplicate-title toast                            | 483s     | `analysis/e2e-logs/run-20202283318-job-57995810015.log` |
| 6   | 2025-12-14 03:50 (#20202238581) | `main@c45133bd`                                 | duplicate-title toast                            | 496s     | `analysis/e2e-logs/run-20202238581-job-57995700519.log` |
| 7   | 2025-12-14 02:36 (#20201435479) | `feature/upgrade-nextjs-16@d616d66f`            | duplicate-title toast                            | 519s     | `analysis/e2e-logs/run-20201435479-job-57993302344.log` |
| 8   | 2025-12-13 15:57 (#20194416526) | `feature/upgrade-nextjs-16@15c457b4`            | recording-calendar strict-mode + duplicate-title | 1184s    | `analysis/e2e-logs/run-20194416526-job-57976338499.log` |
| 9   | 2025-12-13 15:53 (#20194374397) | `feature/upgrade-nextjs-16@e1f3e70e`            | recording-calendar strict-mode + duplicate-title | 489s     | `analysis/e2e-logs/run-20194374397-job-57976239581.log` |
| 10  | 2025-11-10 00:41 (#19217076777) | `dependabot/eslint-config-next-16.0.1@891dffb4` | duplicate-title toast                            | 691s     | `analysis/e2e-logs/run-19217076777-job-54928285095.log` |

**Failure Patterns**

1. **Duplicate-title spec** (`e2e/tests/materials/duplicate-title-error.spec.ts:107`): Failed in **100% of runs (10/10)**. Each log shows `expect(locator).toBeVisible()` timing out while looking for error toast. Test expects: `await toast.expectErrorToast('そのタイトルの素材は既に存在しています')`.

2. **Error-handling spec** (`e2e/tests/error-handling.spec.ts:85-87`): Race condition in **40% of runs (4/10)**. Code shows `waitForResponse` registered **after** button click, causing 600s timeout per retry. Wastes 20-30 minutes even when suite ultimately fails elsewhere.

3. **Recording calendar** (`e2e/tests/dashboard/dashboard-widgets.spec.ts:107`): Strict-mode violation in **20% of runs (2/10)**. Code already uses `.first()` but still triggers strict mode: `widget.getByText('12月', { exact: true }).first()`. Multiple "12月" labels cause ambiguity.

4. Hydration warnings and WaitHelper noise appear in logs but don't fail jobs currently; monitor while stabilizing above.

## 3. Diagnosis (Implementation-Verified)

### 3.1 Duplicate Title Error Toast Never Observed

**Current Implementation Evidence**:

- **Test file**: `e2e/tests/materials/duplicate-title-error.spec.ts:107`
  ```typescript
  await toast.expectErrorToast('そのタイトルの素材は既に存在しています');
  ```
- **ToastHelper**: `e2e/helpers/toast.ts:125-127`
  ```typescript
  async expectErrorToast(message: string) {
    await this.expectToastWithText(['エラー', message], 'error');
  }
  ```

  - Expects both "エラー" prefix AND the message
  - Uses selectors: `'[role="status"], [role="region"][data-state="open"], .toast, .notification, [data-testid*="toast"]'`

**Hypothesis Verification Needed**:

1. **Toast markup mismatch**: ToastHelper selectors may not match actual Radix/Sonner toast implementation
2. **Error path not executing**: Server action might resolve differently, or form resets before toast renders
3. **Timing issue**: Toast appears and disappears before assertion

**Missing Files to Inspect**:

- [ ] `src/app/(app)/materials/new/page.tsx:152-181` - handleSubmit error path
- [ ] Actual toast component implementation (Radix/Sonner configuration)
- [ ] `src/hooks/use-notification.ts` - notifyError implementation

### 3.2 API Error Toast Test Hangs for 600 s

**Current Implementation Evidence**:

- **Problem location**: `e2e/tests/error-handling.spec.ts:85-87`

  ```typescript
  // Button click happens FIRST (line 82)
  await page.click('[role="dialog"] button[type="submit"]');

  // THEN waitForResponse is registered (line 85-87)
  await page.waitForResponse(
    (response) => response.url().includes('/api/master/equipment') && response.status() === 200,
  );
  ```

**Race Condition Confirmed**:

- If API responds before `waitForResponse` registers listener, promise never resolves
- Playwright times out after 600s (10 minutes)
- Retry #2 or #3 eventually passes because other background requests trigger the predicate
- **Impact**: Wastes 1200-1800s (20-30 minutes) per failed run

**Missing Route Cleanup**:

- Route mock registered at line 90: `await page.route('**/api/master/equipment/*', ...)`
- No cleanup found in test.afterEach - potential leak between tests

### 3.3 Dashboard Recording Calendar Strict-Mode Failures

**Current Implementation Evidence**:

- **Problem location**: `e2e/tests/dashboard/dashboard-widgets.spec.ts:107`
  ```typescript
  await expect(widget.getByText('12月', { exact: true }).first()).toBeVisible();
  ```
- **Already uses `.first()`** but strict-mode still triggers!

**Why `.first()` Doesn't Help**:

- Playwright's strict mode validates **before** `.first()` is applied
- When `getByText('12月', { exact: true })` resolves multiple elements, strict mode throws immediately
- `.first()` never gets a chance to narrow down the selection

**Root Cause**:

- Multiple "12月" labels in calendar (spans 2 years, shows current + previous year's December)
- Widget selector: `[data-widget-type="recordingCalendar"]` correct, but month labels lack unique identifiers

**Missing Component to Update**:

- [ ] Recording calendar widget component (likely `src/components/features/dashboard/...`) - needs `data-testid={calendar-month-${month}}`

## 4. Detailed Execution Plan

**CRITICAL**: Execute phases sequentially. Complete one phase (including implementation report) before starting next. Each phase requires independent commit.

### Phase A – Fix Duplicate Title Error Feedback

**Priority**: 🔴 Critical (100% failure rate)
**Dependencies**: None
**Estimated Time**: 2-3 hours

#### Success Criteria

- [ ] `duplicate-title-error.spec.ts` passes 3 consecutive times (retries disabled)
- [ ] Error toast OR inline alert reliably displays
- [ ] Test coverage remains ≥80% (all metrics: Statements, Branches, Functions, Lines)
- [ ] Pre-commit hook passes (5-10 min expected)

#### UI Change Approval

⚠️ **WARNING**: Adding inline alert (`data-testid="duplicate-title-error"`) constitutes UI change. **MUST obtain user approval BEFORE implementation.**

#### Execution Steps

1. **Reproduce & Instrument**

   Run failing test locally:

   ```bash
   npm run e2e -- --grep "Duplicate Title Error Handling" --project=chrome --workers=1 --timeout=600000
   ```

   Add temporary debug logs (MUST remove after fix):
   - In `src/app/(app)/materials/new/page.tsx` handleSubmit catch block:
     ```typescript
     console.log('[DEBUG] notifyError called:', {
       error: err,
       operation: 'create',
       entity: 'material',
     });
     ```
   - In `e2e/helpers/toast.ts` getLatestToast method:
     ```typescript
     const count = await toasts.count();
     console.log('[DEBUG] Toast count:', count);
     console.log(
       '[DEBUG] Toast selectors:',
       '[role="status"], [role="region"][data-state="open"]...',
     );
     ```
   - Use browser DevTools to inspect actual toast DOM structure when duplicate error occurs

2. **Verify Toast Markup**

   Check if rendered toast matches ToastHelper selectors:
   - `[role="status"]` - standard toast role
   - `[role="region"][data-state="open"]` - Radix UI convention
   - `[data-sonner-toast]` - Sonner library convention
   - `[data-radix-toast]` - alternative Radix convention

3. **Implement Fix** (Choose approach based on findings)

   **Approach A: Toast Selector Fix (Recommended if toast renders)**
   - Update ToastHelper selectors to match actual toast markup
   - Verify `notifyError` is called correctly
   - Ensure toast persists long enough for assertion (check auto-dismiss timing)

   **Approach B: Inline Alert Addition (Requires UI approval)**
   - After user approval, add:
     ```typescript
     <p role="alert" data-testid="duplicate-title-error">そのタイトルの素材は既に存在しています</p>
     ```
   - Call `setError(ERROR_MESSAGES.MATERIAL_TITLE_EXISTS)` on duplicate detection
   - Still call `notifyError` for consistency

   **Common Actions** (both approaches):
   - Reset `tempFileId`, `selectedFile`, `metadata` on submission failure to allow immediate retry

4. **Update Tests**
   - Update `duplicate-title-error.spec.ts:107` to use correct selector
   - Verify test has `@materials` tag (already present in implementation)
   - Run staged tests:

     ```bash
     # Stage 1: Target test only (retries disabled)
     npm run e2e -- --grep "Duplicate Title" --project=chrome --timeout=600000

     # Stage 2: All materials tests
     npm run e2e:materials --timeout=600000

     # Stage 3: Smoke tests
     npm run e2e:smoke --timeout=600000

     # Stage 4: Full E2E suite
     npm run e2e --timeout=600000
     ```

5. **Cleanup & Validation**
   - **MANDATORY**: Remove ALL debug console.log statements
   - Unit tests: `npm test`
   - Lint & Type check: `npm run lint && npx tsc --noEmit`
   - Build: `DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build`
   - Coverage verification: All metrics (Statements, Branches, Functions, Lines) ≥80%

6. **Commit**
   - Pre-commit hook executes (5-10 min expected, includes full test suite)
   - If hook times out (>15 min): Report to user immediately, await instructions
   - On failure: Fix immediately, recommit

7. **Implementation Report**
   - Create: `impl_reports/2025-12-14-issue-141-phase-a-duplicate-title-fix.md`
   - Include: Work content, knowledge gained, improvement items, impressions

#### Failure Recovery

- Toast still undetectable → Switch to Approach B (requires user approval)
- Test unstable → Adjust waitForSelector timeout (max 30s reasonable)
- Pre-commit hook timeout → Report to user, await instructions
- Coverage drops below 80% → Add tests for uncovered branches

---

### Phase B – Stabilize API Error Toast Spec

**Priority**: 🟠 High (40% occurrence, wastes 20-30 min per run)
**Dependencies**: Phase A committed
**Estimated Time**: 1-2 hours

#### Success Criteria

- [ ] `error-handling.spec.ts` passes without 600s timeout
- [ ] All retries complete in <30s
- [ ] Test passes 3 consecutive times (retries disabled)
- [ ] Route mocks properly cleaned up (no inter-test leakage)

#### Execution Steps

1. **Fix Race Condition** (Choose one)

   **Approach A: Promise.all Synchronization (Recommended)**

   ```typescript
   // e2e/tests/error-handling.spec.ts:82-87
   await Promise.all([
     page.waitForResponse(
       (res) => res.url().includes('/api/master/equipment') && res.status() === 200,
     ),
     page.click('[role="dialog"] button[type="submit"]'),
   ]);
   ```

   **Approach B: UI-Based Wait (More Robust)**

   ```typescript
   await page.click('[role="dialog"] button[type="submit"]');

   // Wait for UI state instead of network
   const equipmentRow = page.locator(`tr:has-text("${equipmentName}")`);
   await expect(equipmentRow).toBeVisible({ timeout: 10000 });
   ```

2. **Fix Route Mock Cleanup**

   Current implementation (line 90) missing cleanup:

   ```typescript
   // Add to test.afterEach
   test.afterEach(async ({ page }) => {
     // Unregister route mock to prevent leakage
     await page.unroute('**/api/master/equipment/*');
     await toastHelper.clearOldToasts();
   });
   ```

   ⚠️ **NOTE**: `page.unroute()` requires pattern argument - `page.unroute()` alone does NOT work

3. **Strengthen Assertions**
   - Toast: `await toastHelper.expectErrorToast('機材の削除に失敗しました')`
   - Row persistence: `await expect(equipmentRow).toBeVisible()`
   - Error message: Verify `getErrorMessage()` output included in toast

4. **Update Tests**
   - Verify test has `@master` tag (need to check implementation)
   - Run staged tests:

     ```bash
     # Stage 1: Target test headed (visual confirmation)
     npm run e2e -- --grep "エラーハンドリング機能" --headed --timeout=600000

     # Stage 2: Target test headless (retries disabled)
     npm run e2e -- --grep "エラーハンドリング機能" --project=chrome --timeout=600000

     # Stage 3: All master tests
     npm run e2e:master --timeout=600000

     # Stage 4: Full E2E suite
     npm run e2e --timeout=600000
     ```

5. **Cleanup & Validation**
   - Same as Phase A (unit tests, lint, build, coverage)

6. **Commit & Report**
   - Pre-commit hook pass
   - Create: `impl_reports/2025-12-14-issue-141-phase-b-error-handling-sync.md`

#### Failure Recovery

- `waitForResponse` still hangs → Switch to Approach B (UI wait)
- Route mock not cleaning up → Verify test.afterEach execution order
- Timeout still occurs → Increase timeout to max 30s, investigate root cause

---

### Phase C – Recording Calendar Selectors

**Priority**: 🟡 Medium (20% occurrence, low impact when occurs)
**Dependencies**: Phase B committed
**Estimated Time**: 1 hour

#### Success Criteria

- [ ] `dashboard-widgets.spec.ts` passes without strict-mode errors
- [ ] Test passes 3 consecutive times
- [ ] No `.first()` workarounds needed (deterministic selectors)

#### Execution Steps

1. **Identify Component Location**

   **REQUIRED**: Locate recording calendar widget component:

   ```bash
   # Search for component
   find src/components -name "*calendar*" -o -name "*recording*"

   # Or use grep for widget rendering
   grep -r "recordingCalendar" src/components/
   ```

   Expected location: `src/components/features/dashboard/...` (verify actual path)

2. **Add data-testid Attributes**

   In identified component, add:

   ```typescript
   // Month labels
   <div data-testid={`calendar-month-${monthIndex}`}>
     {monthName}
   </div>

   // Legend entries
   <div data-testid="recording-calendar-legend-low">少</div>
   <div data-testid="recording-calendar-legend-high">多</div>
   ```

3. **Update Test Selectors**

   In `e2e/tests/dashboard/dashboard-widgets.spec.ts:107`:

   ```typescript
   // BEFORE (line 107):
   await expect(widget.getByText('12月', { exact: true }).first()).toBeVisible();

   // AFTER:
   await expect(widget.getByTestId('calendar-month-12')).toBeVisible();
   ```

   Remove `.first()` - no longer needed with unique testid

4. **Run Targeted Tests**

   ```bash
   # Target dashboard widgets only
   npm run e2e -- --grep "Dashboard Widgets" --project=chrome --timeout=600000

   # Smoke tests (includes dashboard)
   npm run e2e:smoke --timeout=600000

   # Full suite
   npm run e2e --timeout=600000
   ```

5. **Cleanup, Commit, Report**
   - Standard validation (unit tests, lint, build, coverage)
   - Pre-commit hook
   - Create: `impl_reports/2025-12-14-issue-141-phase-c-calendar-selectors.md`

#### Failure Recovery

- Component not found → Search broader: `grep -r "録音カレンダー" src/`
- Strict-mode persists → Verify testid uniqueness in DevTools inspector
- Test still fails → Check if calendar renders conditionally (wait for visibility)

---

### Phase D – Guardrails & Follow-Up

**Priority**: 🟢 Low (preventative)
**Dependencies**: All phases A-C committed
**Estimated Time**: 30 minutes

#### Tasks

1. **Telemetry Update**
   - Update `analysis/e2e-logs/latest-failures.json`:
     ```json
     {
       "run_id": 20202777168,
       "status": "fixed",
       "fixed_by": "issue-141-phase-a",
       "fixed_at": "2025-12-14T12:00:00Z"
     }
     ```
   - Add regression monitoring note to plan

2. **Verify CI Discipline Checklist**

   Before ANY future PR, MUST run:

   ```bash
   # 1. Unit tests
   npm test

   # 2. Lint & Type check
   npm run lint && npx tsc --noEmit

   # 3. Build (catches Next.js-specific issues)
   DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build

   # 4. E2E tests (MANDATORY CI check)
   npm run e2e --timeout=600000
   ```

   Matches: `docs/claude/development-process.md` and `docs/claude/quality-checklist.md`

3. **Page Object Groundwork** (Issue #141 Phase 2 preview)

   Prepare for next phase:
   - [ ] Review materials workflow patterns
   - [ ] Identify common operations for extraction
   - [ ] Draft initial Page Object structure

   Do NOT implement - Phase 2 is separate effort

4. **Final Validation**
   - [ ] All tests pass: `npm run e2e`
   - [ ] No skipped tests in materials, error-handling, dashboard
   - [ ] CI runs show consistent green
   - [ ] Implementation reports filed for all phases

---

## 5. Common Pitfalls & Preventions

### Pre-Commit Hook Considerations

**Expected Behavior**:

- Normal execution: 5-10 minutes
- Maximum timeout: 15 minutes
- Runs ALL tests: unit + lint + type + E2E

**Critical Rules**:

1. **NEVER** use `--no-verify` without user approval
2. **ALWAYS** wait for hook completion (even if slow)
3. **IF** hook times out (>15 min): Report to user immediately, await instructions
4. **DO NOT** assume "small change" = safe to skip hook

### Test Tag Requirements

All E2E tests MUST have appropriate tags:

- `@smoke` - Critical functionality (already on dashboard-widgets.spec.ts)
- `@materials` - Material management (already on duplicate-title-error.spec.ts)
- `@master` - Master data (need to verify error-handling.spec.ts)
- `@workflow` - Integration flows
- `@critical` - Must-never-fail tests

**Action**: Verify error-handling.spec.ts has `@master` tag; add if missing

### Implementation Report Requirements

**Mandatory** after EACH phase:

- File naming: `{YYYY-MM-DD}-{implementation-title}.md`
- Location: `/impl_reports/`
- Language: Japanese
- Sections:
  1. 作業内容 (Work content)
  2. 知見 (Knowledge gained)
  3. 改善項目 (Improvement items)
  4. 作業感想 (Work impressions)

### Coverage Thresholds

**Absolute requirement**: ALL metrics ≥80%

- Statements
- Branches
- Functions
- Lines

**If coverage drops**:

1. Identify uncovered code: `npm test -- --coverage`
2. Add tests for uncovered branches
3. Re-run until all metrics ≥80%
4. **DO NOT** commit with <80% coverage

---

## 6. Known Issues & Limitations

### Current Implementation Gaps

1. **Missing File Inspections**:
   - [ ] `src/app/(app)/materials/new/page.tsx` - handleSubmit implementation
   - [ ] Toast component configuration (Radix/Sonner)
   - [ ] `src/hooks/use-notification.ts` - notifyError implementation
   - [ ] Recording calendar component path

2. **Tag Verification Needed**:
   - [ ] Confirm `error-handling.spec.ts` has `@master` tag

3. **Alternative Approaches Not Explored**:
   - Custom Playwright fixture for toast testing
   - Visual regression testing for toast appearance
   - Network-level mocking improvements

### Out of Scope (Phase 2)

- Page Object Model implementation
- Seed data improvements
- Test data factory patterns
- Additional edge case coverage
- Performance optimization

---

## 7. Success Metrics

### Phase Completion Indicators

**Phase A Success**:

- Zero duplicate-title failures in 5 consecutive CI runs
- Average test time <2 minutes

**Phase B Success**:

- Zero timeout occurrences in 5 consecutive CI runs
- Average test time <30 seconds

**Phase C Success**:

- Zero strict-mode errors in 5 consecutive CI runs
- Deterministic selectors (no .first() workarounds)

**Overall Success**:

- Issue #141 Phase 1 objectives met
- CI pipeline consistently green
- Total CI time reduced by 60-70% (from ~2000s to <800s)
- Foundation ready for Phase 2 (Page Objects)

---

## 8. Next Steps Checklist

After completing all phases:

- [ ] Comment on Issue #141 with summary and results
- [ ] Update this plan document with "Completed" status and completion date
- [ ] Archive logs: Move `analysis/e2e-logs/` to `analysis/e2e-logs-archived-issue-141/`
- [ ] Create Issue #141 Phase 2 for Page Object Model implementation
- [ ] Schedule retrospective to discuss learnings

---

## Appendix A: Detailed Implementation Findings

### Toast Helper Current Selectors

```typescript
'[role="status"], [role="region"][data-state="open"], .toast, .notification, [data-testid*="toast"]';
```

**Potential Issues**:

- May not match Sonner toast markup if used
- Radix `data-state="open"` might be "visible" or other value
- Multiple selector fallbacks may cause ambiguity

### Error Handling Spec Race Condition

```typescript
// Current (WRONG - line 82-87):
await page.click('[role="dialog"] button[type="submit"]');
await page.waitForResponse(...);  // Listener registered AFTER click

// Fixed (Option 1 - Promise.all):
await Promise.all([
  page.waitForResponse(...),  // Listener registered BEFORE click
  page.click('[role="dialog"] button[type="submit"]')
]);

// Fixed (Option 2 - UI wait):
await page.click('[role="dialog"] button[type="submit"]');
await expect(page.locator(`tr:has-text("${equipmentName}")`)).toBeVisible();
```

### Dashboard Calendar Strict Mode

```typescript
// Current (DOESN'T WORK - line 107):
widget.getByText('12月', { exact: true }).first();
// Strict mode validates BEFORE .first() narrows selection

// Fixed (DETERMINISTIC):
widget.getByTestId('calendar-month-12');
// No ambiguity, strict mode passes
```

---

## Appendix B: References

- Original Issue: https://github.com/stereographica/phonica/issues/141
- Development Process: `docs/claude/development-process.md`
- Testing Requirements: `docs/claude/testing-requirements.md`
- Quality Checklist: `docs/claude/quality-checklist.md`
- E2E Test Logs: `analysis/e2e-logs/`
- Implementation Reports: `impl_reports/`
