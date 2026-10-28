# Milestone 4 - Completion Report

> Date: 2026-10-28 · Status: Complete and verified; awaiting owner review before Milestone 5
> This report follows the reporting format in `AI_DEVELOPMENT_PROTOCOL.md` section 9.

---

## Completed

- Added a Gifts page for the active season with a table, empty state, no-recipient state, loading skeleton, storage-error state, and archived read-only state.
- Added gift create, edit, and delete flows. Every gift requires a recipient in the same season.
- Added the approved gift fields: name, recipient, category, store, purchase link, planned budget, actual cost, delivery method, delivery address, notes, bought/wrapped/sent flags, and optional dates for each status.
- Added purchase-link validation that accepts only `http` and `https` URLs and rejects other schemes.
- Added money validation: documented decimal formats, no negatives or extra decimals, and integer minor units in storage.
- Added repository-enforced status rules: wrapped and sent require bought; invalid transitions are rejected; un-buying clears wrapped, sent, and all three dates only after confirmation.
- Added quick status controls with per-row busy and error handling, plus a dedicated un-buy confirmation dialog.
- Added an inline un-buy confirmation inside the edit form. Cancelling changes nothing.
- Added a visible "Cost missing" flag for bought gifts without an actual cost. They contribute zero spending.
- Added status dates to the gift row and made dates clear consistently with their status flags.
- Added confirmed gift deletion. Deleting a gift with a source idea reopens that idea in the same transaction.
- Kept recipient planned, spent, remaining-cap, and utilization summaries derived through pure domain functions; they update live after gift create, edit, status change, and delete.
- Added a controlled horizontal scroll region for the gift table at narrow widths.
- Fixed the archived table so read-only rows render only the six visible columns instead of leaving two empty action cells. A regression assertion now compares header and cell counts.

### Key files

- `src/pages/GiftsPage.tsx` and `src/pages/GiftsPage.module.css` - page orchestration, states, table, bulk feedback.
- `src/features/gifts/` - gift form, row, delete dialog, un-buy dialog, status badge, page-data hook, and styles.
- `src/domain/calculations/gifts.ts` - pure status and progress calculations.
- `src/storage/repositories/gifts.ts` - validation, status transitions, date defaults and clearing, deletion with idea reopening.
- `src/domain/schemas.ts` - gift entity/input invariants and money/URL rules.
- `src/features/gifts/GiftFormDialog.test.tsx`, `src/features/gifts/DeleteGiftDialog.test.tsx`, `src/storage/repositories.test.ts`, and `src/pages/RecipientsPage.test.tsx` - UI, repository, and live-summary coverage.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/ACCEPTANCE_CRITERIA.md`, `docs/DECISIONS.md`, `docs/DATA_MODEL.md`, and `docs/IMPLEMENTATION_PLAN.md` - milestone status and behavior.
- `package.json` - version `0.4.0`.

---

## Acceptance criteria

Playwright remains deferred and no end-to-end suite exists. Criteria that call for E2E verification were verified manually in the production preview; that substitution is disclosed here and in the limitations below.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-4.01 | Pass | The gift table renders name, recipient, category, store, planned, actual, and status. Component tests and the production browser showed all columns for a completed gift. |
| AC-4.02 | Pass | A component test creates a gift with all optional fields. The production browser created "Cashmere scarf" with category, store, purchase link, planned budget, statuses, dates, delivery method, address, and notes. |
| AC-4.03 | Pass | Integration tests reject a cross-season recipient before writing. Component tests reject a missing recipient. The recipient select is constrained to the active season. |
| AC-4.04 | Pass | Component tests edit name, cost, recipient, and status. The browser changed dates and actual cost, then reloaded and confirmed the new values remained. |
| AC-4.05 | Pass | Component and browser tests delete after confirmation. The row disappeared, totals updated, and recipient summaries were covered by the live-summary test. |
| AC-4.06 | Pass | Unit and component tests accept `http`/`https` and reject other schemes with an inline error. |
| AC-4.07 | Pass | Money tests cover accepted decimal forms, negatives, extra decimals, and integer minor-unit storage. Component validation shows field errors. |
| AC-4.08 | Pass | Repository tests assert independent bought, wrapped, and sent booleans with optional dates. |
| AC-4.09 | Pass | Unit and integration tests reject wrapped or sent without bought. Quick controls disable dependent toggles, and the repository re-checks every transition. |
| AC-4.10 | Pass | A bought-and-sent, unwrapped gift is covered by domain and repository tests and renders with the sent status. |
| AC-4.11 | Pass | Quick un-buying requires the `UnbuyGiftDialog`; the edit form uses an inline confirmation. Browser cancel preserved all states and dates. Confirming cleared bought, wrapped, sent, and their dates. |
| AC-4.12 | Pass | Repository tests cover default dates for newly set statuses, explicit date changes, clearing a date without changing its flag, and clearing dates when a status is removed. The browser confirmed persisted custom dates and cleared dates after un-buying. |
| AC-4.13 | Pass | Domain and recipient-summary tests assert zero spending. The production browser marked a gift bought without a cost, saw "Cost missing", and confirmed the recipient still showed `$0.00` spent. |
| AC-4.14 | Pass | The browser un-bought a gift that still had an actual cost of `$69.99`; the recipient summary changed from spent to `$0.00` while planned stayed unchanged. Unit tests cover the same rule. |
| AC-4.15 | Pass | Status is a text badge plus date text; controls have accessible names. Lighthouse accessibility scored 100 on the active Gifts page. |
| AC-4.16 | Pass | At a 390 CSS-pixel iframe viewport, the document width was 390 with no page-level horizontal overflow. The table used a controlled scroll region (`overflow-x: auto`; 615 px table inside a 354 px container). At full width with controls, headers and cells both numbered eight. |
| AC-4.17 | Pass | Empty and no-results are represented by the no-active-season and active-season zero-gift states. Component tests cover loading, error, no-season, no-recipient, empty, and archived states. The browser reached zero gifts, the no-recipient state, and archived read-only. A filtered no-results state is not applicable because search/filter is Milestone 7. |
| AC-4.18 | Pass | Component tests create, buy, and delete a gift and assert recipient summaries change without a reload. The browser saw planned, spent, and cap-left change after status changes. IndexedDB writes survived reload. |
| AC-4.19 | Pass | Code review confirms no dashboard charts and no Idea Bank functionality were added. Gifts has no chart or search surface; Ideas, Shopping, and Archives remain labeled previews. |

---

## Verification commands

| Command | Outcome |
| --- | --- |
| `npm run format` | Pass |
| `npm run format:check` | Pass - all files use Prettier style |
| `npm run typecheck` | Pass - `tsc -b` |
| `npm run lint` | Pass - `eslint .` |
| `npm test -- --reporter=dot` | Pass - 17 test files, 163 tests |
| `npm run test:coverage` | Pass - 163 tests; 88.62% statements, 80.95% branches, 91.25% functions, 89.67% lines |
| `npm run build` | Pass - 2,147 modules; main JS 526.60 kB (162.87 kB gzip). Vite warns that the main chunk exceeds 500 kB. |

Coverage values are shown as printed by Vitest. The final test run produced no React `act(...)` warnings. There is no Playwright or other end-to-end suite.

### Production preview

- Served the final `dist/` with `npm run preview` and exercised it in Chromium 152.0.7977.130 (OpenCode browser, Electron 44.4.5) on Windows.
- Confirmed no-season setup, season creation, recipient creation, gift creation, all-fields entry, reload persistence, quick status changes, un-buy cancellation and confirmation, status dates, recipient summary updates, gift deletion, no-recipient state, and archived read-only rendering.
- Confirmed the archived table renders six headers and six cells per row after the read-only cell fix.
- Confirmed desktop and 390-pixel iframe widths; the page itself did not overflow horizontally at either width.
- Observed no browser console messages in the final production session.
- Microsoft Edge and other browsers were not re-run for Milestone 4. Interactive evidence is attributed to Chromium 152.

### Accessibility audit

Lighthouse in the production preview reported for the active Gifts page:

| Page | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| Active gift table | 100 | 100 | 80 |

SEO is 80 only because the preview server returns the SPA fallback for `/robots.txt`, which Lighthouse treats as invalid. That is a hosting concern, not an application accessibility failure.

---

## Browser evidence and test data

- Origin `http://localhost:4173` held "Christmas 2026" with recipient Alex (cap `$200`). "Cashmere scarf" was created through the UI with all fields, custom status dates, and an actual cost, then edited, reloaded, un-bought, and deleted. "Archived scarf" was created through the UI to test archived read-only rendering and bought-without-cost behavior.
- Origin `http://localhost:4174` held "No recipients season", created through the UI. `/gifts` showed "Add a recipient first" and no "Add gift" action.
- The archived state was reached by directly setting the season status in IndexedDB, then restored, because archive management is not implemented until Milestone 8. This was a test-only write.
- The final preview database is local browser test data, not part of the repository. No customer-like data, screenshots, or generated artifacts were committed.

---

## Limitations and disclosures

- Dashboard charts, Idea Bank UI, Shopping List, search/filter, backup/restore, CSV, sample data, archive management, season switching, and season editing are not implemented. Their screens remain honest placeholders or previews.
- Milestone 4 does **not** request `navigator.storage.persist()`, provide backups, or protect against browser storage eviction. IndexedDB data can be removed by clearing site data or by browser cleanup.
- There is no service worker and no installable offline package. Offline delivery is not claimed.
- No Playwright suite exists. E2E-marked criteria were verified manually, and no Firefox, Safari, physical mobile device, or cross-tab interaction matrix was run.
- Mobile behavior was measured in a 390 CSS-pixel iframe, not on a physical device. The table scrolls horizontally inside its container; this is the controlled-scroll option in AC-4.16.
- Archive management is still Milestone 8. Archived rendering is defensive and read-only, but customers cannot archive or restore a season from the UI yet.
- The `/onboarding` page remains a minimal first-season flow and does not set `hasCompletedOnboarding`. Full onboarding is deferred.
- The production build exceeds Vite's 500 kB warning threshold. Route-level code splitting remains deferred.
- Live updates are verified for repository writes. Direct raw IndexedDB changes require a reload; raw changes were used only for test setup.

---

## Decisions and open items

- D-020 is accepted: every gift requires a recipient in the same season.
- O-10 is decided: a bought gift without an actual cost is allowed, counts as zero spending, and is visibly flagged.
- Recipient metrics are derived by pure functions and are never persisted.
- Zero or one active season is valid. Startup never creates a season, seeds records, or deletes records.
- Archived seasons are read-only until archive management arrives in Milestone 8.
- Persistent-storage request timing and buyer-facing browser-eviction wording remain open but do not block Milestone 4 publication.
- Gift sorting, filtering, and search remain deferred to Milestone 7.

---

## Next milestone

Milestone 5 (budget engine and dashboard) has not started. The owner should review this report and the production preview, then explicitly authorize Milestone 5.

**Publication checkpoint:** commit the Milestone 4 tree as `feat: implement gift management`, tag it `milestone-4`, and push `main` to `origin`. Previous published tag: `milestone-3` at `29ebc73`.
