# Milestone 3 - Completion Report

> Date: 2026-10-26 - Status: Complete and verified; awaiting owner review before Milestone 4
> This report follows the reporting format in `AI_DEVELOPMENT_PROTOCOL.md` section 9.

---

## Completed

- Added a minimal `/onboarding` page that creates a season only after an explicit user action, using a name, holiday date, and optional overall budget.
- Added recipient create, edit, and delete flows for the active season, with optional relationship, cap, and notes.
- Added inline validation for required names, maximum lengths, malformed dates, negative or malformed money, and missing deletion choices.
- Added zero-cap support, displayed distinctly from "No cap."
- Added derived recipient metrics: planned, spent, cap, remaining cap, progress, gift count, and over-cap state. Metrics are calculated from gift records and are never stored.
- Added recipient deletion policies: direct deletion when no gifts exist; required reassignment or typed-confirmation cascade when gifts exist; cancel changes nothing.
- Added loading, empty, no-active-season, archived read-only, and storage-error states.
- Added responsive recipient cards, dialogs, form styling, and a production preview flow.
- Added a typed `useLiveQueryState` wrapper over Dexie `liveQuery` (D-025), provider-based repository access, and a shared test renderer that includes `StrictMode`.
- Added focus restoration for dialogs, route-change focus to `#main-content`, scroll reset on route changes, and focus to main content after recipient deletion.
- Improved accessibility contrast and recipient heading order after Lighthouse found active-card issues.

### Key files

- `src/pages/SeasonSetupPage.tsx`, `src/pages/RecipientsPage.tsx`, and their tests and styles.
- `src/features/recipients/` - recipient card, form dialog, delete dialog, page-data hook, and styles.
- `src/domain/calculations/recipients.ts` - pure derived metrics.
- `src/app/providers/` - storage provider, live-query hook, and active-season hook.
- `src/storage/repositories/recipients.ts` - deletion policy and transactional writes.
- `src/components/ui/Dialog.tsx` - modal focus restoration and close behavior.
- `src/app/AppShell.tsx` - route scroll reset and main-content focus.
- `src/test/render.tsx` - StrictMode-aware, provider-backed test renderer.
- `docs/`, `README.md`, and `package.json` - milestone status, architecture, decisions, data model, and version `0.3.0`.

---

## Acceptance criteria

Playwright remains deferred to Milestone 4. Criteria that call for an E2E workflow were verified manually in the production preview; that substitution is disclosed in the relevant rows and in the limitations below.

| ID | Result | Evidence |
| --- | --- | --- |
| AC-3.01 | Pass | Integration tests create multiple seasons and assert only the active season's recipients render; browser preview showed the active season's list. |
| AC-3.02 | Pass | Automated create flow covers name, relationship, cap, and notes; browser-created "Cara" with all optional fields. |
| AC-3.03 | Pass | Tests assert accessible inline errors for missing and over-length names; browser submission with an empty name showed "Recipient name is required." |
| AC-3.04 | Pass | Browser edited "Cara" to "Cara M.", reloaded, and confirmed the new name remained. |
| AC-3.05 | Pass | Integration test confirms duplicate names produce separate records with distinct IDs. |
| AC-3.06 | Pass | Browser created "No Cap Nell" and "Zero Cap Zoe"; cards showed "No cap" versus "Zero cap." Tests cover both. |
| AC-3.07 | Pass | Browser entered `-5` and received a clear amount-format error; tests cover negative, malformed, and over-limit caps. |
| AC-3.08 | Pass | Pure calculation tests plus temporary gift records in the dev IndexedDB showed planned, spent, remaining cap, and progress. Gift entry itself remains Milestone 4. |
| AC-3.09 | Pass | Browser deleted a recipient with no gifts after confirmation; test covers the same path. |
| AC-3.10 | Pass | Browser and tests confirm a recipient with gifts requires reassignment or explicit cascade; cancel left records unchanged. |
| AC-3.11 | Pass | Browser confirmed reassignment and source deletion; integration tests verified both changes in one transaction. |
| AC-3.12 | Pass | Browser confirmed the gift count, typed confirmation, and atomic deletion; integration tests also assert unassigned ideas after cascade. |
| AC-3.13 | Pass | Tests cover loading, empty, no-season, archived, and error states; browser reached empty, active, archived, and no-season states. |
| AC-3.14 | Pass | Archived view was rendered read-only in the browser: no add, edit, or delete controls, with a read-only notice. Archive management remains Milestone 8. |
| AC-3.15 | Pass | Create, edit, delete, and first-season creation updated the live UI without reload; edits persisted after reload. |
| AC-3.16 | Pass | No sample records, demo recipients, or stored spending values exist. A fresh origin showed no season and no records; metrics are derived from gifts. |
| AC-3.17 | Pass | Browser created "Localhost Christmas 2026" with a blank overall budget and proceeded to the empty recipient list with a clear notice. |
| AC-3.18 | Pass | Fresh production origin stayed in the no-season state until the user created a season; startup never seeds or deletes records. |

---

## Verification commands

| Command | Outcome |
| --- | --- |
| `npm run format` | Pass |
| `npm run format:check` | Pass - all files use Prettier style |
| `npm run typecheck` | Pass - `tsc -b` |
| `npm run lint` | Pass - `eslint .` |
| `npm test -- --reporter=dot` | Pass - 14 test files, 120 tests |
| `npm run test:coverage` | Pass - 120 tests; 89% statements, 79.64% branches, 91.73% functions, 89.33% lines |
| `npm run build` | Pass - 2,135 modules; main JS 501.24 kB (157.16 kB gzip). Vite warns that the main chunk exceeds 500 kB. |

Coverage values are shown as printed by Vitest; statement coverage rounds to 89%. There is no Playwright or other end-to-end suite.

### Production preview

- Served `dist/` with `npm run preview` on `http://127.0.0.1:4173` and exercised the latest build in Chromium 152 (OpenCode browser, Electron 44).
- Confirmed the no-season state on a fresh origin, explicit first-season creation, recipient creation, edit, cancellation, reload persistence, no-gift deletion, focus return, and main-content focus after deletion.
- Confirmed route navigation from a scrolled dashboard reset the page to `scrollY: 0` and moved focus to `#main-content`.
- Confirmed archived rendering by directly setting the season status to archived, then restored the status. This was a test-only IndexedDB write because archive management is not part of Milestone 3.
- Observed no console errors or warnings in the final production-preview session.
- Microsoft Edge 156.0.4314.42 opened the production build headlessly; the captured frame showed the boot screen before hydration completed, so interactive checks in this pass are attributed to Chromium 152.

### Accessibility audit

Lighthouse in the production preview reported:

| Page | Accessibility | Best practices | SEO |
| --- | --- | --- | --- |
| First-season setup | 100 | 100 | 80 |
| Active recipient list with cards | 100 | 100 | 80 |

SEO is 80 only because the preview server returns the SPA fallback for `/robots.txt`, which Lighthouse treats as an invalid `robots.txt`. That is a hosting/configuration issue, not an application accessibility failure. A later deployment should serve a deliberate `robots.txt` or intentionally exclude the demo from indexing.

The first active-card audit found low-contrast muted text and a skipped heading level. Both were corrected before the final audit: `--color-text-muted` was darkened from `#79827b` to `#626d65`, and recipient card names now use `h2` beneath the page `h1`.

---

## Browser evidence and test data

- The related dev-origin check used two temporary gift records to exercise metrics and deletion policies. They were inserted directly into IndexedDB because gift entry is not implemented until Milestone 4. They were removed by the cascade test. The app itself never seeds gifts.
- The archived state was reached by directly changing the season status because archive management is not implemented until Milestone 8.
- Recipient creation, editing, empty-name validation, negative-cap validation, zero-cap display, reload persistence, no-gift deletion, focus restoration, and route scroll/focus reset were exercised through the production UI.
- The browser database is local test data, not part of the repository. No customer-like data was committed.

---

## Limitations and disclosures

- Gift entry, idea conversion, shopping lists, search, archive management, backup/restore, CSV export, and season editing are not implemented. Their pages remain honest placeholders or previews.
- Milestone 3 does **not** request `navigator.storage.persist()`, provide backups, or protect against browser storage eviction. IndexedDB data can be removed by clearing site data or by browser cleanup.
- There is no service worker and no installable offline package. Offline delivery is not claimed.
- No Playwright suite exists, and no Firefox, Safari, or mobile-device interaction matrix was run. Responsive CSS was exercised visually at the available browser viewport, not across named devices.
- Live updates are verified for repository writes. Direct raw IndexedDB changes require a reload before the UI reflects them; this is expected.
- The production build exceeds Vite's 500 kB warning threshold. Route-level code splitting remains deferred.
- The `/onboarding` page is a minimal first-season flow and intentionally does not set `hasCompletedOnboarding`; full onboarding remains deferred.
- Browser key-press automation was inconsistent for Enter and Escape. Close-button behavior, focus containment, and focus restoration were verified directly and in tests. Escape-driven cancellation of the native dialog could not be reliably automated in this pass and remains a manual gap.

---

## Decisions and open items

- D-025 is accepted: reactive reads use Dexie's `liveQuery` through `useLiveQueryState`; `dexie-react-hooks` is not installed.
- Recipient metrics are derived by pure functions and are never persisted.
- Zero or one active season is valid. Startup never creates a season, seeds records, or deletes records.
- Recipients with gifts require reassignment or typed-confirmation cascade deletion. Cancel makes no changes.
- Archived seasons are read-only until archive management arrives in Milestone 8.
- Persistent-storage request timing and buyer-facing browser-eviction wording remain open but do not block Milestone 3 publication.

---

## Next milestone

Milestone 4 (gifts and safe deletion) has not started. The owner should review this report and the production preview, then explicitly authorize Milestone 4.

**Publication checkpoint:** commit the Milestone 3 tree, tag it `milestone-3`, and push `main` to `origin`. Previous published tag: `milestone-2` at `e057b15`.
