# Milestone 5 Report — Budget Engine and Dashboard

**Status:** Complete and verified on 2026-10-28  
**Version:** 0.5.0  
**Git checkpoint:** `feat: implement budget engine and dashboard`  
**Tag:** `milestone-5`

---

## 1. What shipped

- One pure calculation layer in `src/domain/calculations/dashboard.ts` for:
  - season planned, actual, remaining, and unallocated totals;
  - planned-over-budget and spent-over-budget states;
  - bought, wrapped, and sent progress ratios;
  - recipient budget-vs-actual chart data;
  - data-quality findings;
  - future/today/past countdown states;
  - percentage formatting.
- A live dashboard that shows:
  - season budget, planned spending, actual spending, remaining budget, and unallocated budget;
  - distinct planned-over-budget and spent-over-budget warnings;
  - bought, wrapped, and sent progress;
  - a budget-vs-actual chart by recipient and an open data table with the same numbers;
  - a Christmas countdown;
  - alerts for spent overspend, bought gifts without a cost, exceeded recipient caps, planned overspend, and gifts without a planned budget.
- Minimal season-budget editing through the existing season repository.
- Live recalculation after budget and gift writes through Dexie `liveQuery`.
- First-step, no-season, archived read-only, loading, and error states.
- Responsive layout fixes for the chart and table at narrow desktop widths.
- Recharts is lazy-loaded as a separate chunk. The chart is `aria-hidden`; the open table is the accessible representation.
- Milestone 5 documentation, decisions, version labels, and Settings/About copy.

## 2. What did not ship

- Idea Bank, Shopping List, search/filter, season-management UI, archive controls, backup, export/import, and offline packaging.
- A wrapping exemption. Digital and retailer-direct gifts still count toward wrapped progress; the dashboard explains that 100% may not be reachable.
- Playwright or another browser E2E suite. Browser checks remain manual and are recorded below.
- Firefox, Safari, physical mobile, and cross-tab verification.
- A service worker, persistent-storage request, eviction protection, or backup. None is claimed.

## 3. Decisions

- **D-021 accepted:** countdown uses local calendar-day arithmetic. The dashboard checks the date every minute and on focus/visibility change.
- **D-024 accepted:** no wrapping exemption at launch.
- **O-11 decided:** no wrapping exemption; the limitation is shown in the interface.
- **D-001 applied:** Recharts is used for the chart, loaded separately from the main app chunk.

## 4. Verification evidence

### 4.1 Static checks

| Check | Result |
| --- | --- |
| `npm run format:check` | Pass — all matched files use Prettier style |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run test` | **19 files, 190 tests passed** |
| `npm run test:coverage` | Pass; thresholds met |
| `npm run build` | Pass |

Coverage from the final run:

| Scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| All files | 88.63% | 81.23% | 91.01% | 89.64% |

Production build:

- Main app chunk: 544.13 kB (166.99 kB gzip).
- Lazy chart chunk: 372.12 kB (107.11 kB gzip).
- Vite reports that the main chunk is larger than 500 kB. This is a build warning, not a failed build. The chart is split out; further route-level splitting is not part of Milestone 5.

### 4.2 Automated coverage of acceptance criteria

The test suite includes:

- 20 dashboard domain tests for totals, null-versus-zero money, bought-only spending, negative balances, season isolation, progress, chart filtering and sorting, countdown including DST and year boundaries, findings order, zero caps, and percentage formatting.
- Recipient metric tests for planned, spent, cap remaining, utilization, over-cap, and exceeded amounts, including a zero cap.
- Dashboard UI tests for no-season, real totals/progress/alerts/chart table, budget editing with live recalculation, gift purchase live update, empty first-step state, archived read-only state, and setting a budget when none exists.
- Repository and integration tests inherited from Milestones 2–4.

### 4.3 Manual browser checks

Environment: Chromium through the OpenCode browser tools at a 1000 × 700 viewport, against the Vite development server. Test records were created in the browser's IndexedDB through the application repository layer, not hardcoded into components.

Observed:

- Dashboard rendered real persisted season, recipient, and gift data.
- Totals matched the fixtures: $300.00 budget, $385.00 planned, $308.00 actual.
- Remaining showed **−$8.00** with an over-budget state; unallocated showed **−$85.00** with a separate plan-over-budget state.
- Planned-over-budget and spent-over-budget appeared as distinct warnings.
- All five data-quality alert types rendered from the saved records.
- Chart rendered with bars, labels, and an open table containing the same planned and actual amounts.
- Countdown showed 58 days until Dec 25, 2026 on Oct 28, 2026.
- Editing the season budget from $300.00 to $500.00 updated remaining to $192.00 and removed the spent-over-budget warning without a reload.
- In a second live check, changing an unbought $100.00 planned gift to bought with a $40.00 actual cost changed actual spending from $50.00 to $90.00 and remaining from $250.00 to $210.00 without a reload.
- No `NaN` or `Infinity` appeared in the rendered text.
- No console warnings or errors were recorded.
- No horizontal overflow remained at the tested width after the chart/table grid fix.

### 4.4 Lighthouse

Run against the loaded dashboard:

| Category | Score |
| --- | --- |
| Accessibility | 1.00 |
| Best practices | 1.00 |
| SEO | 0.80 |

The only SEO failure was a missing/invalid `robots.txt` on the development server. SEO is not a Milestone 5 target, and the app does not claim search-engine readiness.

## 5. Acceptance criteria

| ID | Result | Evidence |
| --- | --- | --- |
| AC-5.01 | Pass | Domain tests sum all planned budgets and treat null as zero |
| AC-5.02 | Pass | Domain tests include only bought gifts with recorded costs |
| AC-5.03 | Pass | Domain tests and no-budget UI test; remaining is null without a budget |
| AC-5.04 | Pass | Domain tests and browser check; unallocated is separate from remaining |
| AC-5.05 | Pass | Domain tests and browser check; negative remaining is not clamped |
| AC-5.06 | Pass | Domain tests and browser check; planned and spent warnings are distinct |
| AC-5.07 | Pass | Recipient calculation tests cover all requested metrics |
| AC-5.08 | Pass | Zero-cap tests assert null utilization and correct over-cap behavior |
| AC-5.09 | Pass | Progress tests assert null ratios for zero gifts; UI test asserts first-step state and no NaN |
| AC-5.10 | Pass | Domain tests and browser alerts for bought-without-cost and unbudgeted gifts |
| AC-5.11 | Pass | Domain tests cover fixture totals, cap-only recipients, and deterministic sorting |
| AC-5.12 | Pass | UI test and browser check confirm the chart and table use identical numbers |
| AC-5.13 | Pass | Domain tests cover future, today, past, year boundaries, and DST transitions |
| AC-5.14 | Pass | Manual browser check with real IndexedDB records; no component fixtures |
| AC-5.15 | Pass | Dashboard UI test and manual browser check confirm a gift purchase updates totals without reload |
| AC-5.16 | Pass | Dashboard UI test and manual browser check confirm budget edits recalculate live |
| AC-5.17 | Pass | Domain tests isolate seasons; dashboard UI test renders an archived season read-only |
| AC-5.18 | Pass | Code review: components call the dashboard model and do not re-implement totals |
| AC-5.19 | Pass | Dashboard and recipient tests cover all listed boundary categories |
| AC-5.20 | Pass | Code review and browser check: metrics and chart series derive from saved records |

## 6. Honest limitations

- **No browser E2E suite.** The “E” criteria above were checked manually in Chromium and with integration tests. Playwright remains deferred.
- **No mobile, Firefox, or Safari verification.** The responsive layout was inspected at a narrow desktop width, not on a physical phone or a second browser engine.
- **No cross-tab guarantee.** Dexie change events are expected to propagate, but cross-tab behavior has not been added to the test matrix.
- **No offline or backup claim.** This milestone does not add a service worker, packaged offline edition, persistent-storage request, export, import, or eviction protection.
- **Main chunk warning.** The app shell is still a single 544 kB chunk; the chart itself is split out. Route-level splitting remains future work.
- **Countdown precision.** The date is checked every minute and on focus/visibility change, so a tab left open across midnight can show the previous day for up to one minute.
- **Wrapped progress.** Gifts that never need wrapping still count in the denominator because no exemption exists yet.
- **Bought gifts without a cost.** They count as zero spending and are flagged, but the dashboard cannot infer the missing amount.

## 7. Next step

Milestone 5 is complete. Milestone 6 — Idea Bank and Shopping List — begins only after owner review and authorization.
