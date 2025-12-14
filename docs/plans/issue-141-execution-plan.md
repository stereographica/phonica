# Issue #141 – E2E Test Stabilization Plan

## 1. Issue Context

- **Goal**: Issue [#141](https://github.com/stereographica/phonica/issues/141) targets "Zero Flaky Tests" by eliminating skipped specs, stabilizing waits, adding data-testids, introducing a Page Object Model, and expanding edge-case coverage. The repo rules in `CLAUDE.md` require TDD, running the full CI-equivalent test suite (unit + lint + type + `npm run e2e`) before any push, and filing an implementation report after every task.
- **Evidence Collected**: Pulled the last 10 failing `E2E Tests (Chrome)` job logs via GitHub CLI and stored them under `analysis/e2e-logs/` with a manifest in `analysis/e2e-logs/latest-failures.json`. These runs span 2025‑11‑10 through 2025‑12‑14 and cover both `main` and dependabot PR branches.
- **Key Insight**: All recent workflow failures involve the same small set of flaky specs. Fixing them first will immediately unblock the entire test suite and aligns with Phase 1 of the issue roadmap (skipped tests + wait stabilization + data-testid coverage).

## 2. Recent Failure Summary

| #   | Run (UTC)                       | Branch@SHA                                                   | Primary Failures                                                                                            | Log                                                     |
| --- | ------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | 2025-12-14 04:40 (#20202777168) | `main@9264d93`                                               | `@materials Duplicate Title Error Handling › duplicate title on create` missing toast                       | `analysis/e2e-logs/run-20202777168-job-57997063326.log` |
| 2   | 2025-12-14 04:31 (#20202685847) | `main@a0c36d3c`                                              | Same duplicate-title failure + two 10‑minute timeouts in `error-handling.spec.ts` before retrying           | `analysis/e2e-logs/run-20202685847-job-57996825529.log` |
| 3   | 2025-12-14 04:08 (#20202441975) | `main@6c37b134`                                              | Duplicate-title toast failure                                                                               | `analysis/e2e-logs/run-20202441975-job-57996213711.log` |
| 4   | 2025-12-14 03:55 (#20202294394) | `dependabot/github_actions/actions/github-script-8@5e136e0c` | Duplicate-title toast failure + three consecutive 10‑minute waits in `error-handling.spec.ts`               | `analysis/e2e-logs/run-20202294394-job-57995838632.log` |
| 5   | 2025-12-14 03:54 (#20202283318) | `dependabot/npm_and_yarn/bullmq-5.63.0@781aaca1`             | Duplicate-title toast failure                                                                               | `analysis/e2e-logs/run-20202283318-job-57995810015.log` |
| 6   | 2025-12-14 03:50 (#20202238581) | `main@c45133bd`                                              | Duplicate-title toast failure                                                                               | `analysis/e2e-logs/run-20202238581-job-57995700519.log` |
| 7   | 2025-12-14 02:36 (#20201435479) | `feature/upgrade-nextjs-16@d616d66f`                         | Duplicate-title toast failure                                                                               | `analysis/e2e-logs/run-20201435479-job-57993302344.log` |
| 8   | 2025-12-13 15:57 (#20194416526) | `feature/upgrade-nextjs-16@15c457b4`                         | Dashboard recording-calendar locator strict-mode errors + error-handling timeouts + duplicate-title failure | `analysis/e2e-logs/run-20194416526-job-57976338499.log` |
| 9   | 2025-12-13 15:53 (#20194374397) | `feature/upgrade-nextjs-16@e1f3e70e`                         | Dashboard recording-calendar strict-mode errors + duplicate-title failure                                   | `analysis/e2e-logs/run-20194374397-job-57976239581.log` |
| 10  | 2025-11-10 00:41 (#19217076777) | `dependabot/npm_and_yarn/eslint-config-next-16.0.1@891dffb4` | Duplicate-title toast failure                                                                               | `analysis/e2e-logs/run-19217076777-job-54928285095.log` |

**Patterns**

1. The duplicate-title spec (`e2e/tests/materials/duplicate-title-error.spec.ts:23-110`) failed in every run. Each log shows `expect(locator).toBeVisible()` timing out while looking for the error toast (e.g., `analysis/e2e-logs/run-20202777168-job-57997063326.log:2007-2152`).
2. `error-handling.spec.ts:63-115` burns 600 s per retry because `page.waitForResponse` never resolves, then eventually passes on retry #2 or #3. This wastes 20–30 minutes per run even when the suite ultimately fails elsewhere.
3. The dashboard “録音カレンダー” test (`e2e/tests/dashboard/dashboard-widgets.spec.ts:95-109`) trips Radix strict-mode because `getByText('12月', { exact: true })` resolves to multiple matches (see `analysis/e2e-logs/run-20194416526-job-57976338499.log:2021-2127`).
4. Several logs contain hydration warnings and `WaitHelper` noise, but those did not currently fail the job; they should remain under observation while stabilizing the top three issues.

## 3. Diagnosis

### 3.1 Duplicate Title Error Toast Never Observed

- **Symptoms**: Logs show four retries of the same assertion and Playwright errors “element(s) not found” for the toast locator before the suite aborts (`analysis/e2e-logs/run-20202283318-job-57995810015.log:1773-1782`).
- **Implementation**: The spec expects a toast on duplicate creation (`e2e/tests/materials/duplicate-title-error.spec.ts:103-110`). The client page catches `createMaterialWithMetadata` errors and calls `notifyError(err, { operation: 'create', entity: 'material' })` (`src/app/(app)/materials/new/page.tsx:152-181`), which should render a Radix toast via `ToastHelper` selectors (`e2e/helpers/toast.ts:5-75`).
- **Hypothesis**: Either the error path never executes (e.g., server action resolves differently, form resets before toast appears), or the toast is rendered outside of the selectors used by `ToastHelper`. Because success toasts _are_ detected earlier in the same test (`line 68`), we need instrumentation to verify whether `notifyError` runs and whether the DOM contains a role=`status`/`region` node when a duplicate is detected.

### 3.2 API Error Toast Test Hangs for 600 s

- **Symptoms**: Every recent run shows `page.waitForResponse` exceeding the 10‑minute Playwright timeout before the test eventually passes on a retry (`analysis/e2e-logs/run-20202685847-job-57996825529.log:2153-2176`).
- **Implementation**: The spec (`e2e/tests/error-handling.spec.ts:63-115`) builds a disposable equipment record, then waits for a 200 response before installing a route mock. The wait is started _after_ clicking “Add Equipment”. If the `fetch('/api/master/equipment')` response resolves before `waitForResponse` is registered, the promise never settles. Meanwhile, deleting equipment triggers `notifyError` in `src/app/(app)/master/equipment/page.tsx:68-86`, so what we really need is to assert the toast, not a specific network response.
- **Hypothesis**: The creation `fetch` completes before `waitForResponse` starts, so the predicate never fires and the test stalls for 600 s by design. The retry passes because by then other background requests happen to hit the predicate. We should synchronize via `Promise.all` (start `waitForResponse` _before_ clicking) or, better, wait for the UI row/toast instead of the network.

### 3.3 Dashboard Recording Calendar Strict-Mode Failures

- **Symptoms**: When the calendar renders multiple “12月” labels (expected), Playwright’s strict mode rejects `widget.getByText('12月', { exact: true })` despite the `.first()` that existed historically (`analysis/e2e-logs/run-20194416526-job-57976338499.log:2021-2127`).
- **Implementation**: The widget is selected via `[data-widget-type="recordingCalendar"]` (`e2e/tests/dashboard/dashboard-widgets.spec.ts:95-109`). Without a deterministic selector for specific cells, we rely on ambiguous text matches.
- **Hypothesis**: The `.first()` addition either hasn’t deployed yet or Radix re-renders matching nodes, causing multiple matches even after `.first()` because the locator re-resolves each time. Adding stable `data-testid` attributes (e.g., `data-testid="calendar-month-12"`) inside the widget will remove the ambiguity and eliminate the strict-mode violation.

## 4. Detailed Execution Plan

**重要**: 各フェーズはこの順序で実行し、1つのフェーズが完了してから次に進むこと。各フェーズ完了時に実装レポートを作成すること。

### Phase A – Fix Duplicate Title Error Feedback

**優先度**: 🔴 Critical（全runで失敗）
**依存関係**: なし
**推定時間**: 2-3時間

#### 成功基準

- [ ] duplicate-title-error.spec.ts が3回連続でパス（retries無効）
- [ ] エラートーストまたはinline alertが確実に表示される
- [ ] テストカバレッジが80%以上を維持
- [ ] pre-commitフックがパス（5-10分想定）

#### UI変更の承認

⚠️ **注意**: inline alert (`data-testid="duplicate-title-error"`) の追加はUI変更に該当します。実装前にユーザーに確認し、承認を得てください。

#### 実行手順

1. **Reproduce**: Run `npm run e2e -- --grep "Duplicate Title Error Handling" --project=chrome --workers=1 --timeout=600000` locally to capture a Playwright trace and DOM snapshot.

2. **Instrument the client** (一時的なログ - 修正完了後に削除):
   - `src/app/(app)/materials/new/page.tsx:152-181` の `handleSubmit` 内に以下を追加:
     ```typescript
     console.log('[DEBUG] notifyError called:', {
       error: err,
       operation: 'create',
       entity: 'material',
     });
     ```
   - `e2e/helpers/toast.ts` の `getLatestToast` に以下を追加:
     ```typescript
     const count = await toasts.count();
     console.log('[DEBUG] Toast count:', count);
     ```
   - Inspect the rendered DOM to confirm whether a toast exists under `[role="status"]`, `[role="region"]`, or `[data-sonner-toast]`.

3. **Implement fix** (2つのアプローチから選択):

   **アプローチ A: Toast修正（推奨）**
   - ToastHelperのセレクターを更新して、実際に使用されているtoast markup (`[data-sonner-toast]`, `[data-radix-toast]` 等) を検出できるようにする
   - `notifyError` が正しく呼ばれていることを確認

   **アプローチ B: Inline Alert追加（UI変更 - 承認必須）**
   - ユーザーに承認を得た後、`<p role="alert" data-testid="duplicate-title-error">…</p>` を追加
   - duplicate error時に `setError(ERROR_MESSAGES.MATERIAL_TITLE_EXISTS)` を呼び出す

   **共通対応**:
   - Guard against repeated uploads by resetting `tempFileId`, `selectedFile`, and `metadata` when a submission fails

4. **Tests**:
   - Update `duplicate-title-error.spec.ts:99-110` to use the new selector
   - テストに `@materials` タグが付いていることを確認
   - Run staged tests:

     ```bash
     # Stage 1: 対象テストのみ（retries無効）
     npm run e2e -- --grep "Duplicate Title" --project=chrome --timeout=600000

     # Stage 2: materials全体
     npm run e2e:materials --timeout=600000

     # Stage 3: smoke tests
     npm run e2e:smoke --timeout=600000

     # Stage 4: 全E2E（最終確認）
     npm run e2e --timeout=600000
     ```

5. **Cleanup & Validation**:
   - **必須**: 一時的なデバッグログ（console.log）をすべて削除
   - Unit tests: `npm test`
   - Lint & Type check: `npm run lint && npx tsc --noEmit`
   - Build: `DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build`
   - Coverage確認: すべての指標（Statements, Branches, Functions, Lines）が80%以上

6. **Commit**:
   - Pre-commitフックが実行される（5-10分想定）
   - 失敗時は即座に修正し、再度コミット

7. **Implementation Report**:
   - `impl_reports/2025-12-14-issue-141-phase-a-duplicate-title-fix.md` を作成
   - 実施内容、知見、改善項目、感想を記録

#### 失敗時の対応

- Toast が依然として検出できない場合 → アプローチ B に切り替え（ユーザー承認必須）
- テストが不安定な場合 → waitForSelector のタイムアウトを調整
- Pre-commitフックがタイムアウト → ユーザーに報告し、指示を待つ

### Phase B – Stabilize API Error Toast Spec

1. **Eliminate the 600 s wait**:
   - Refactor `e2e/tests/error-handling.spec.ts:84-115` to wrap the modal submission in `await Promise.all([page.waitForResponse(...), page.click(...)])` so the wait starts before the request.
   - Alternatively, drop the network wait entirely and wait for the new table row plus toast.
2. **Route management**: After `page.route('**/api/master/equipment/*', ...)`, `await page.unroute()` in `test.afterEach` so the mock does not leak into subsequent tests.
3. **Strengthen assertions**:
   - In addition to `toastHelper.expectErrorToast('機材の削除に失敗しました')`, assert that the failed row still exists and that `notifyError` produced the descriptive text from `getErrorMessage` (`src/hooks/use-notification.ts:8-78`).
4. **Verification**: Run `npm run e2e -- --grep "エラーハンドリング機能" --headed` once to watch the flow, then the whole suite.

### Phase C – Recording Calendar Selectors

1. **Add deterministic hooks**: Inject `data-testid` attributes for month labels inside the calendar widget component (e.g., `data-testid={
  \\`calendar-month-${monthIndex}\\`
}`) so the test can select `widget.getByTestId('calendar-month-12')` instead of ambiguous text.
2. **Update spec**: Replace `getByText('12月', { exact: true })` with a deterministic locator and keep `.first()` only where uniqueness is guaranteed.
3. **Regression tests**: Run `npm run e2e -- --grep "Dashboard Widgets"` before re-running the full suite.

### Phase D – Guardrails & Follow-Up

1. **Telemetry**: Keep `analysis/e2e-logs/latest-failures.json` up to date when new failures occur so we can spot regressions quickly.
2. **Page Object groundwork**: Begin extracting helpers for materials workflows (aligns with Issue #141 Phase 2) once the flakes above are eliminated.
3. **CI Discipline**: Before opening any PR, run:
   - `npm test`
   - `npm run lint && npx tsc --noEmit`
   - `DATABASE_URL=... npm run build`
   - `npm run e2e`
     This matches the checklist in `docs/claude/development-process.md` and `docs/claude/quality-checklist.md`.

## 5. Next Steps Checklist

- [ ] Implement duplicate-title error surfacing + selector updates.
- [ ] Refactor `error-handling.spec.ts` synchronization and clean up route mocks.
- [ ] Add calendar widget test IDs and update the E2E assertions.
- [ ] Re-run targeted specs, then the full `npm run e2e` to ensure Issue #141 Phase 1 is satisfied before proceeding to Page Object Model + seed/test-data improvements outlined in the original issue.

## 6. Execution Plan for Checklist Items

### 6.1 Duplicate-Title Error Surfacing

1. **Trace the failure**: Run `npm run e2e -- --grep "Duplicate Title Error Handling" --workers=1 --project=chrome --quiet` to capture a failing trace in `test-results/materials-duplicate-title-*/trace.zip`.
2. **Instrument**:
   - Temporarily log `notifyError` invocations in `src/app/(app)/materials/new/page.tsx:152-181`.
   - Add `console.log` inside `ToastHelper.getLatestToast` to output `toasts.count()` when the failure occurs (remove after fix).
3. **Implementation**:
   - Add an inline `<p role="alert" data-testid="duplicate-title-error">…</p>` when `result.error === ERROR_MESSAGES.MATERIAL_TITLE_EXISTS`.
   - Reset `tempFileId`, `selectedFile`, and `metadata` on catch so the second submission can reprocess cleanly.
   - Update `ToastHelper` selectors if needed (e.g., include `[data-sonner-toast]` or `[data-radix-toast]`).
4. **Spec updates**: In `duplicate-title-error.spec.ts:99-110`, first assert `page.getByTestId('duplicate-title-error')` contains the Japanese duplicate text, then require `toast.expectErrorToast` to match the same text.
5. **Validation**:
   - `npm run e2e -- --grep "Duplicate Title" --project=chrome`.
   - Full `npm run e2e`.

### 6.2 Error-Handling Spec Synchronization

1. **Refactor waits**:
   - Replace the post-submit `waitForResponse` with `await Promise.all([page.waitForResponse(predicate), page.click(...)])`.
   - Alternatively wait for UI updates: `await expect(page.locator('tr', { hasText: equipmentName })).toBeVisible();`.
2. **Route lifecycle**: Move the `page.route` registration to `test.step` scope and call `await page.unroute('**/api/master/equipment/*')` inside `test.afterEach`.
3. **Assertions**: After attempting the delete, assert:
   - The toast text via `toastHelper.expectErrorToast`.
   - The row remains visible (`expect(equipmentRow).toBeVisible()`).
4. **Runtime verification**:
   - Run `npm run e2e -- --grep "エラーハンドリング機能" --headed`.
   - Ensure no individual retry exceeds the 600 s timeout in the logs.

### 6.3 Recording Calendar Selectors

1. **Component change**:
   - Add `data-testid={`calendar-month-${month}`}` to each rendered month label in the recording calendar widget (likely under `src/components/features/dashboard/...`).
   - Add IDs for the legend entries (e.g., `data-testid="recording-calendar-legend-low/high"`).
2. **Spec change**:
   - Replace `widget.getByText('12月', { exact: true })` with `widget.getByTestId('calendar-month-12')`.
   - Keep `.first()` only when verifying aggregated texts (e.g., total counts).
3. **Run targeted tests**: `npm run e2e -- --grep "Dashboard Widgets" --project=chrome`.

### 6.4 Suite Re-Verification & Reporting

1. **Targeted smoke**: After each fix above, re-run the corresponding `--grep` tests before chaining the next change.
2. **Full CI parity**:
   - `npm test`
   - `npm run lint && npx tsc --noEmit`
   - `DATABASE_URL=postgresql://user:password@localhost:5432/dummy_db npm run build`
   - `npm run e2e`
3. **Documentation**:
   - Update `analysis/e2e-logs/latest-failures.json` with the new status (e.g., add a `resolvedAt` field or append a note in the plan).
   - File the mandatory implementation report under `impl_reports/` with the day’s findings/fixes.
4. **Issue updates**: Comment on #141 summarizing the executed steps, referencing this plan section for traceability.
