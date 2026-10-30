# Milestone 7 Report — Search, filters, and recipient details

**Status:** Complete and verified on 2026-10-30  
**Version:** 0.7.0  
**Git checkpoint:** `feat: add search, filters, and recipient details`  
**Tag:** `milestone-7`

Companion documents: `docs/ACCEPTANCE_CRITERIA.md`, `docs/DATA_MODEL.md`, and `docs/DECISIONS.md`.

---

## 1. What shipped

- A Gifts page search that matches gift name, recipient, category, and store using normalized text. Matching is case-insensitive, diacritic-insensitive, and substring-based.
- Gifts-page filters for recipient, category, bought, wrapped, and sent. Each status filter is tri-state: `any`, `yes`, or `no`. Filters use AND semantics and compose with search.
- Gift sorting through one descriptive `Sort by` control covering name, recipient, planned budget, actual cost, derived status, and updated date, in either direction. The default sort is recipient A–Z followed by gift name A–Z; gifts with missing planned or actual amounts sort last in both directions. Sorting ends with deterministic tie-breakers including gift id.
- Clear-filters and clear-all behavior. Clear all restores search, all filters, and the default sort. Filter and sort state is local UI state and is never written to storage.
- A no-results state that is distinct from the no-data state and offers clearing filters. The archived Gifts view remains read-only and does not render the active filter controls.
- A recipient detail page at `/recipients/:recipientId` that resolves one recipient and shows cap, planned, spent, remaining cap, utilisation, gift progress, notes, and that recipient’s gifts. It reuses the recipient metrics, progress calculations, gift sorting, and shared gift table rather than duplicating business rules.
- Recipient cards link to their detail page through an explicit “View details for {name}” control. Invalid recipient ids render a not-found state without changing data.
- Archived seasons render recipient details and gifts read-only. A missing active season renders the create-season state. No season-management controls were added because they belong to Milestone 8.

## 2. What did not ship

- No global gift search. Search is scoped to the Gifts page.
- No persisted search, filter, or sort state. The controls reset when the view state is recreated.
- No archive management, restore, or archive controls. Archived data is treated read-only while the season is archived.
- No new state-management library or duplicate gift-list business logic. The domain layer owns the calculations and the UI consumes them.
- No Playwright or other browser E2E suite. E2E-marked criteria were verified manually where exercised, and full E2E coverage remains deferred.

## 3. Decisions

- **D-027 accepted for Milestone 7:** gift search, filters, and sorting are derived local UI state. The domain layer owns search/filter/sort logic; nothing is stored. The default sort is recipient A–Z then gift name A–Z; missing amounts sort last; clear-all restores defaults.
- **D-028 accepted for Milestone 7:** recipient detail is a derived composition using `buildRecipientDetail`, recipient metrics, and progress calculations, and renders through the shared gift table. Gift edits, deletes, and status changes reuse the existing repositories and status rules.

Earlier Milestone 7 decisions also remain in force:

- **D-020:** every gift requires a recipient in the same season.
- **O-10:** bought gifts without an actual cost are allowed, count as zero spending, and are visibly flagged.

## 4. Verification evidence

### 4.1 Static checks and final machine evidence

| Check | Result |
| --- | --- |
| `npm run format` / `npm run format:check` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | **26 files, 247 tests passed, 0 failed** |
| `npm run test:coverage` | Pass |
| `npm run build` | Pass |

Final coverage:

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All files | 87.70% | 81.54% | 88.43% | 88.61% |

Final production build:

- Main app chunk: 591.13 kB (176.98 kB gzip).
- Lazy chart chunk: 372.12 kB (107.11 kB gzip).
- Vite reported only the expected main-chunk size warning; the build passed.

### 4.2 Automated coverage

- `src/domain/calculations/giftList.ts` was covered by 17 passing domain tests, including normalization, search, AND-composed filters, tri-state statuses, deterministic sorting, missing-amount ordering, and helper behavior.
- `src/features/gifts/GiftFilterBar.tsx` and `src/pages/GiftsPageFilters.test.tsx` covered filter UI behavior, sorting selection, clear behavior, result counts, no-results handling, and live query integration.
- `src/pages/RecipientDetailPage.tsx` and `src/pages/RecipientDetailPage.test.tsx` covered recipient detail totals, no-cap and zero-cap states, gift status updates, invalid ids, archived read-only state, and no-season state.
- `src/domain/calculations/recipients.ts` and its tests covered recipient metrics.
- Full suite after final fixes: **247 tests across 26 files passed**.

### 4.3 Manual browser verification

Environment: Chromium through the browser tools against the production preview at `http://localhost:4173` after the final build.

Observed during the final Milestone 7 browser session:

- Created a local verification season and recipients, then added gifts through the application UI. These records existed only in the browser’s local IndexedDB for the check and were not shipped as sample data.
- Gift search: entering `BEA` narrowed the result to the matching gift and updated the count. The stored name contained a diacritic, and the normalized search matched it.
- Clearing the search restored all gifts.
- Bought filter set to `Yes`: only the bought gift remained. Bought set to `No`: the unbought gifts remained. Wrapped set to `Yes`: a no-results state appeared.
- Clear-filters behavior restored filters while preserving the selected sort; Clear all then restored the default sort, cleared the search, and cleared filters.
- Sorting: the default order was recipient A–Z followed by gift name A–Z. Clear-all restored the default.
- Live updates: changing a gift status through the gift row updated the rendered status without a reload.
- Recipient detail: navigation from a recipient card to the detail route showed cap, planned, spent, remaining cap, utilisation, progress, notes, and the recipient’s gifts.
- Invalid recipient route: the not-found state rendered and no data changed.
- Archived state: the local verification season was transitioned to archived for the read-only check; the Gifts and recipient detail views rendered read-only without edit controls.
- Accessibility labels were observed on search, filters, status toggles, and detail actions; Lighthouse confirmed the accessible label and heading-order requirements.

### 4.4 Lighthouse

Run through the browser tool on the final preview build.

| Page | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: |
| Gifts | **1.00** | **1.00** | 0.80 |
| Recipient detail | **1.00** | **1.00** | 0.80 |

Findings:

- Accessibility and best practices passed on both pages.
- The only SEO failure was the missing/invalid `robots.txt` response from the local Vite preview server. SEO is not a Milestone 7 target, and no SEO readiness claim is made.

A heading-order issue on the recipient detail page was found during the first Lighthouse run and fixed with a visually hidden second-level heading before the detail section headings. The final recipient detail Lighthouse run scored **1.00** for accessibility and **1.00** for best practices.

### 4.5 Final build

- Final production build passed.
- Main chunk: 591.13 kB (176.98 kB gzip).
- Chart chunk: 372.12 kB (107.11 kB gzip).
- Chunk-size warning only; no build failure.

## 5. Acceptance criteria

| ID | Criterion | Result |
| --- | --- | --- |
| AC-7.01 | Search matches gift name, recipient, category, and store. | Pass |
| AC-7.02 | Search is case-insensitive, diacritic-insensitive, and substring-based. | Pass |
| AC-7.03 | Recipient, category, bought, wrapped, and sent filters work individually. | Pass |
| AC-7.04 | Filters combine with AND semantics and search composes with them. | Pass |
| AC-7.05 | Tri-state status filters distinguish any/yes/no. | Pass |
| AC-7.06 | Sorting works for name, recipient, planned, actual, status, and updated date, with a deterministic default. | Pass |
| AC-7.07 | Clear-all restores search, filters, and default sorting. | Pass |
| AC-7.08 | No-results state differs from no-data and offers clear filters. | Pass |
| AC-7.09 | Search and filters never write to storage. | Pass |
| AC-7.10 | Recipient detail route resolves one recipient and shows cap, planned, spent, remaining cap, utilisation, progress, and gifts. | Pass |
| AC-7.11 | Recipient detail totals match the domain layer and the dashboard. | Pass |
| AC-7.12 | Invalid recipient IDs render a not-found/return state without crashing. | Pass |
| AC-7.13 | Results update correctly when data changes while filters are active. | Pass |
| AC-7.14 | Filter controls have accessible labels and keyboard operation. | Pass |
| AC-7.15 | Archived/read-only and no-active-season states remain correct. | Pass |
| AC-7.16 | No heavy state-management library or duplicate business logic was introduced. | Pass |

## 6. Honest limitations

- **No browser E2E suite.** Playwright is deferred. The E-marked acceptance criteria were exercised through automated integration/UI tests and manual Chromium checks, but a dedicated E2E suite has not been added.
- **Manual browser verification is partial for every criterion.** The final browser session covered the principal M7 flows; the automated suite owns the exhaustive matrix. The report does not claim full manual coverage of every E-marked criterion.
- **No mobile, Firefox, or Safari verification.** Chromium desktop verification only.
- **No global gift search.** M7 intentionally scopes search to the Gifts page.
- **No persisted filter state.** Intended behavior, but it means reloads reset controls.
- **No archive controls.** Archived behavior was verified through local data state, but user-facing archive management remains Milestone 8.
- **No offline, persistence, backup, or recovery claims.** The milestone adds no such capability.
- **No SEO readiness claim.** The local preview response had an invalid robots.txt; SEO is not an acceptance target.
- **Build size.** The main app chunk is still above the Vite 500 kB warning threshold; route-level splitting remains future work.

## 7. Next step

Milestone 7 is complete and ready for owner review. Milestone 8 — Seasons, archives, backup, and export — begins only after owner review and authorization.
