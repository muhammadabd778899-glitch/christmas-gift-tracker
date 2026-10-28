# Milestone 6 Report — Idea Bank and Shopping List

**Status:** Complete and verified on 2026-10-28  
**Version:** 0.6.0  
**Git checkpoint:** `feat: add idea bank and shopping list`  
**Tag:** `milestone-6`

---

## 1. What shipped

- An Idea Bank for the active season with:
  - create, edit, delete, list, and search;
  - case-insensitive matching on idea name, recipient, category, and store;
  - empty, loading, error, no-results, and archived read-only states;
  - visible converted state and a link to the linked gift.
- Conversion into a gift with:
  - recipient selection when the idea has no recipient;
  - copied name, category, store, purchase link, estimated price (as the planned budget), and notes;
  - one transaction for the gift write and idea status update;
  - idempotent retries that return the existing gift;
  - a unique `&sourceIdeaId` index that prevents a second gift from one idea.
- Converted ideas stay in the bank, remain visibly marked, link to the gift, and stay out of budgets and the Shopping List until the gift link is removed.
- Reopen and delete behaviour:
  - reopening is available only when the linked gift no longer exists, and the UI explains why;
  - deleting a converted gift returns its idea to active and preserves the idea content;
  - deleting an idea clears the gift's source reference and leaves the gift intact.
- A Shopping List derived at read time from unbought gifts:
  - case-insensitive store grouping;
  - “No store specified” placed last;
  - deterministic row ordering;
  - group subtotals and a visible total;
  - recipient, gift, planned budget, and safe external link per row;
  - optional “Mark bought” using the existing gift status rules;
  - empty and archived read-only states.
- A print view containing the title, season, print date, groups, rows, subtotals, and total. App chrome and action controls are hidden.
- Converted-idea links now target the gift row at `/gifts#gift-<id>`, scroll to it, focus it, and show a gold highlight.
- Accessibility and style corrections:
  - visible “Mark bought” text is included in the button's accessible name;
  - “Open” and “View gift” link names include their visible text;
  - the invalid `--color-brand-gold` token was replaced with the existing `--color-gold-500` token;
  - missing semantic aliases (`--color-text-primary`, `--color-text-secondary`, `--color-brand-evergreen`, `--color-brand-burgundy`, and `--color-surface-overlay`) were defined in `tokens.css`;
  - small gold warning text uses the darker `--color-gold-700` so it meets contrast requirements.
- Idea Bank search uses the linked gift's recipient for converted ideas, matching the recipient shown on the card.
- Documentation and version updates to `0.6.0`.

## 2. What did not ship

- No separately stored shopping list, snapshot, or cache.
- No PDF export, saved print file, email, or sharing feature. Printing uses the browser print dialog.
- No cross-season or global search; Idea Bank search is scoped to the active season.
- No archive management, restore, backup, export/import, or CSV.
- No service worker, installable offline package, persistent-storage request, or eviction protection.
- No Playwright or browser E2E suite.
- No mobile, Firefox, or Safari verification.

## 3. Decisions

- **D-008 applied:** conversion runs in the existing idea repository transaction and returns the existing gift on retry.
- **O-9 decided:** “Mark bought” is offered on the Shopping List, uses the same status rules, and is excluded from print.
- **D-026 accepted:** the Shopping List is derived and print-only; no separate list is persisted.
- **D-020 applied:** conversion requires a recipient in the same season.
- **O-10 applied:** a bought gift without an actual cost is allowed, counts as zero spending, and is visibly flagged.
- **D-025 applied:** Idea Bank and Shopping List reads use `liveQuery` through the typed hook; `dexie-react-hooks` remains uninstalled.

## 4. Verification evidence

### 4.1 Static checks

| Check | Result |
| --- | --- |
| `npm run format:check` | Pass — all matched files use Prettier style |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | **23 files, 214 tests passed** |
| `npm run test:coverage` | Pass; thresholds met |
| `npm run build` | Pass |

Coverage from the final run:

| Scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| All files | 87.60% | 81.06% | 88.49% | 88.64% |

Production build:

- Main app chunk: 572.74 kB (172.30 kB gzip).
- Lazy chart chunk: 372.12 kB (107.11 kB gzip).
- Vite reports that the main chunk is larger than 500 kB. This is a build warning, not a failed build. The chart is already split out; route-level splitting remains future work.

### 4.2 Automated coverage of acceptance criteria

The suite includes:

- Shopping calculation tests for empty input, bought-gift exclusion, case-insensitive grouping, missing-store-last ordering, deterministic row order, group subtotals, null planned budgets, and totals.
- Idea filter tests for case-insensitive matching across name, recipient, category, and store, including the linked gift's recipient for converted ideas.
- Repository tests for conversion field copying, atomicity, repeated conversion, the unique source-idea index, reopening only when the gift is missing, deleting a converted gift, and clearing a gift's source reference.
- Idea Bank UI tests for create, edit, delete, search, conversion with recipient selection, double-click conversion, converted links, archived read-only state, and empty state.
- Shopping List UI tests for grouping, subtotals, total, unbought-only rows, unconverted ideas staying out of the list, “Mark bought”, empty state, archived read-only state, and print structure.
- A Gifts page test for the converted-idea anchor highlight and focus.
- Inherited storage, recipient, gift, dashboard, accessibility, and error-state tests from Milestones 2–5.

### 4.3 Manual browser checks

Environment: Chromium through the OpenCode browser tools against the Vite development server at `http://127.0.0.1:5174`. Test records were created in the browser's IndexedDB through the application UI and repository layer; no sample data was added to the product.

Observed:

- Created a season, recipients Alex and Blair, and two ideas.
- Converted an idea without a recipient: the dialog required a recipient and the converted card showed the linked gift's recipient.
- Converted a second idea directly when a recipient was already present.
- Converted cards showed **Converted**, the recipient, and a **View gift** link.
- Idea Bank search matched idea name, recipient, category, and store, and the no-results state appeared when nothing matched.
- “View gift” navigated to `/gifts#gift-<id>`, scrolled to the row, focused it, and displayed the gold highlight.
- The Shopping List initially grouped two unbought gifts by store, showed `$18.00` and `$25.00` subtotals, and displayed a `$43.00` total.
- Marking the `$18.00` gift bought removed its row immediately and reduced the list total to `$25.00`.
- The dashboard actual-spending figure became `$0.00` and showed the missing-cost warning for the bought gift with no recorded actual cost.
- No `NaN` or `Infinity` appeared in rendered text.
- No console warnings or errors were recorded on the Idea Bank, Shopping List, or Gifts pages after the final fixes.

### 4.4 Print verification

Chrome 135 was driven through CDP at port `9223` with a seeded IndexedDB origin and print-media emulation.

Verified:

- The sidebar, header, and elements marked `data-print-hide` had `display: none`.
- The print root was positioned for print output.
- The print body contained the title, season, print date, all store groups, rows, subtotals, and the total.
- The generated PDF and PNG showed a clean page with no navigation or action controls.
- Artifacts:
  - `C:\Users\LENOVO\AppData\Local\Temp\opencode\shopping-print.pdf`
  - `C:\Users\LENOVO\AppData\Local\Temp\opencode\shopping-print.png`
- The print view includes the visible “Open” link text when a purchase URL exists. It is plain text on paper, not a clickable control.

### 4.5 Lighthouse

Run against the loaded Idea Bank, Shopping List, and Gifts pages after the accessible-name and contrast fixes:

| Page | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| Idea Bank | 1.00 | 1.00 | 0.80 |
| Shopping List | 1.00 | 1.00 | 0.80 |
| Gifts (anchor target) | 1.00 | 1.00 | 0.80 |

The only SEO failure was a missing/invalid `robots.txt` on the Vite development server. SEO is not a Milestone 6 target, and the app does not claim search-engine readiness.

## 5. Acceptance criteria

| ID | Result | Evidence |
| --- | --- | --- |
| AC-6.01 | Pass | Idea Bank UI tests cover create, edit, delete, list, and search; manual browser check confirmed search |
| AC-6.02 | Pass | Schema validation and URL tests restrict purchase links to http/https |
| AC-6.03 | Pass | UI test and browser check require recipient selection for an idea without one |
| AC-6.04 | Pass | Repository conversion test asserts copied fields and planned budget |
| AC-6.05 | Pass | Repository transaction test asserts the idea status and gift link are written together |
| AC-6.06 | Pass | Repository retry test and UI double-click test produce one gift |
| AC-6.07 | Pass | Unique `&sourceIdeaId` index plus repository tests |
| AC-6.08 | Pass | UI test and browser check show the converted badge and gift link; calculations use gifts only |
| AC-6.09 | Pass | Repository test covers reopen only when the gift is missing; the card explains the blocked state |
| AC-6.10 | Pass | Repository and dialog tests return the idea to active and preserve its content |
| AC-6.11 | Pass | Repository test deletes the idea and leaves the gift with no source reference |
| AC-6.12 | Pass | Shopping page builds from gifts on read; no shopping store or snapshot exists |
| AC-6.13 | Pass | UI test and browser check remove a bought gift immediately without affecting others |
| AC-6.14 | Pass | Domain and UI tests cover case-insensitive grouping and missing store last |
| AC-6.15 | Pass | UI test and browser check show recipient, gift, planned amount, and safe external link |
| AC-6.16 | Pass | Domain and UI tests assert subtotals and total; browser check confirmed `$43.00` |
| AC-6.17 | Pass | CDP print emulation and generated PDF/PNG confirmed chrome and controls are hidden |
| AC-6.18 | Pass | UI tests cover empty list and no-active-season states |
| AC-6.19 | Pass | UI test covers mark-bought; print rules exclude the action |
| AC-6.20 | Pass | Code review confirms the Shopping List is derived from gifts only |

## 6. Honest limitations

- **No browser E2E suite.** The “E” criteria were checked manually in Chromium and with integration/UI tests. Playwright remains deferred.
- **No mobile, Firefox, or Safari verification.** The layout was inspected at desktop widths only.
- **No cross-tab guarantee.** `liveQuery` is expected to propagate changes, but cross-tab behaviour has not been added to the test matrix.
- **No offline or backup claim.** This milestone does not add a service worker, packaged offline edition, persistent-storage request, export, import, or eviction protection.
- **Print depends on the browser.** There is no PDF export or saved print file. The print layout was verified in Chrome 135, not every browser or paper size.
- **Print includes link text.** A purchase link appears as the word “Open” on paper.
- **Main chunk warning.** The app shell is still a single 572.74 kB chunk; the chart is split out. Route-level splitting remains future work.
- **Search scope.** Idea Bank search covers the active season only; it is not global search.
- **Reopen rule.** A converted idea can be reopened only after its linked gift is deleted. There is no arbitrary unlink action.
- **Bought gifts without a cost.** They remain allowed, count as zero spending, and are flagged; the app cannot infer the missing amount.
- **Manual verification data.** Records created for browser checks live only in the local development origin and were not shipped as sample data.

## 7. Next step

Milestone 6 is complete. Milestone 7 — Search, filters, and recipient details — begins only after owner review and authorization.
