# Milestone 2 — Completion Report

> Date: 2026-10-26 · Status: Complete and verified; delivered for owner review before Milestone 3
> This report follows the reporting format in `AI_DEVELOPMENT_PROTOCOL.md` §9.

---

## Completed

- Added the pure domain layer: branded IDs, entity types, typed errors, money parsing/formatting, date utilities, locale acceptance, Zod schemas, currency presets, and shared validation.
- Added a version-1 Dexie/IndexedDB schema with the stores and indexes defined in `DATA_MODEL.md` §4.2.
- Added safe startup that opens the database, reads or creates the settings singleton, validates existing settings without overwriting them, preserves a valid `databaseId`, and updates `appVersion` and `lastOpenedAt`.
- Added typed repositories for seasons, settings, recipients, gifts, and ideas, plus a data repository for health checks and reset.
- Added transactional recipient deletion with reassign or cascade policies, exact-name confirmation, gift reassignment/cascade, and idea unassignment.
- Added transactional idea conversion, idempotent conversion reads, reopening, and unlinking on idea deletion.
- Added season lifecycle rules: one active season at a time, archiving, restoration with automatic archival of the previous active season, exact-name deletion, and optional recipient copying.
- Added gift status rules that keep bought, wrapped, sent, and their dates coherent.
- Added cross-season and missing-reference checks before writes, plus validation of every entity read from storage.
- Added a generic data-migration harness, a synthetic prior-version migration test, and a failing-upgrade test that proves the database is not deleted or recreated.
- Added a non-mutating health check with counts, version, storage estimate/persistence, and typed issue codes for active-season, orphan, cross-season, source-idea, status, date, money, and settings problems. Reports contain no names, addresses, or notes.
- Added an explicit reset API that requires the exact confirmation `DELETE`, clears planning stores, recreates default settings and four meta records, and preserves the database identity. No startup or recovery path calls it.
- Added a branded boot screen and a recovery screen with reload guidance and no destructive action.
- Split the storage entry point into a dynamic production chunk, keeping the shell responsive while storage loads.
- Added `fake-indexeddb` test infrastructure with unique database names and cleanup.
- Updated the Dashboard, Settings, About panel, sidebar, header, mobile navigation, README, architecture, data model, decisions, acceptance criteria, and implementation plan for Milestone 2.
- Added no season onboarding UI, recipient/gift/idea management UI, dashboard data, charts, backup/restore UI, CSV export, sample-data loader, theme switcher, PWA, or offline artifact.

## Files changed

Key additions and changes:

- `src/domain/` — `entities.ts`, `errors.ts`, `money.ts`, `dates.ts`, `locale.ts`, `schemas.ts`, and their tests
- `src/storage/` — `db.ts`, `defaults.ts`, `initialize.ts`, `errors.ts`, `migrations.ts`, `health.ts`, `reset.ts`, `index.ts`
- `src/storage/repositories/` — `context.ts`, `index.ts`, `seasons.ts`, `settings.ts`, `recipients.ts`, `gifts.ts`, `ideas.ts`
- `src/lib/ids.ts`, `src/lib/appInfo.ts`
- `src/main.tsx`, `src/app/BootScreen.tsx`, `src/app/StorageRecoveryPage.tsx`
- `src/app/App.test.tsx`, `src/app/StorageRecoveryPage.test.tsx`
- `src/test/fixtures.ts`, `src/test/storage.ts`, `src/test/setup.ts`
- `src/pages/DashboardPage.tsx`, `src/pages/SettingsPage.tsx`, shell navigation and About copy
- `package.json`, `package-lock.json`, `README.md`, `docs/ACCEPTANCE_CRITERIA.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, `docs/IMPLEMENTATION_PLAN.md`
- Removed obsolete `src/domain/.gitkeep` and `src/storage/.gitkeep`; updated the `src/features/.gitkeep` note for Milestone 3.

## Verification

All commands were run from the repository root on 2026-10-26 with Node 24.21.0 and npm 12.0.2.

| Check | Command | Result |
| --- | --- | --- |
| Formatting | `npm run format:check` | **PASS** — all matched files use Prettier style |
| TypeScript | `npm run typecheck` | **PASS** — no errors |
| Lint | `npm run lint` | **PASS** — no errors or warnings |
| Tests | `npm run test` | **PASS** — 11 files, 90 tests |
| Coverage | `npm run test:coverage` | **PASS** — 87.11% statements, 75.67% branches, 90.71% functions, 87.20% lines |
| Production build | `npm run build` | **PASS** — built in 1.06 s; no chunk-size warning |
| Development server | `npm run dev` | **PASS** — served `http://127.0.0.1:5173/` |
| Production preview | `npm run preview` | **PASS** — served `http://127.0.0.1:4173/`; no console errors |

Build output:

```text
dist/index.html                       0.67 kB │ gzip:   0.40 kB
dist/assets/index-DkqMpET2.css       37.00 kB │ gzip:   8.12 kB
dist/assets/initialize-D9oG1447.js  194.37 kB │ gzip:  58.52 kB
dist/assets/index-C2Xz9H1V.js       364.55 kB │ gzip: 114.75 kB
```

The storage entry point is a separate chunk. The shell loads first; storage initialization then runs before the planner renders.

### Browser and persistence checks

Performed with Microsoft Edge 156.0.4314.42 using the Chrome DevTools Protocol. The restart check launched a real headless Edge process, created data through the repositories, reloaded, exited the browser process, and relaunched with the same user-data directory.

- **Fresh startup:** Dashboard rendered; settings count 1; seasons, recipients, gifts, and ideas count 0; meta keys were exactly `appVersion`, `databaseId`, `lastOpenedAt`, and `schemaVersion`; `schemaVersion` was 1; `activeSeasonId` was null.
- **Page refresh:** a season, recipient, and gift created through the repositories survived a full page reload. Counts were 1/1/1 and `databaseId` was unchanged.
- **Browser restart:** after the Edge process exited and was relaunched with the same profile, the same season, recipient, and gift were present and `databaseId` was unchanged.
- **No startup seeding or deletion:** the initial browser database had zero seasons; startup did not create a season, sample record, or recipient.
- **Reset:** `resetAllData('DELETE')` cleared seasons, recipients, gifts, and ideas, recreated one settings record and four meta records, preserved `databaseId`, and left health `ok: true`. A final launch after reset still showed zero planning records.
- **Recovery path:** a deliberate invalid saved-settings value forced the startup validation failure path. The app rendered “Your planner needs a safe update.” with a Reload app control and no clear/delete/reset control. A season, recipient, and gift that were already present remained intact; a later explicit reset restored a clean database.
- **Health check in a real browser:** `ok: true`; counts all zero after cleanup; `databaseVersion: 1`; `usageBytes: 73728`; `quotaBytes: 1600914021`; `persisted: false`; no issues. `persisted: false` is expected because the app does not request persistent storage yet.
- **Production preview:** the built application rendered the Dashboard, initialized settings and meta without a season, reported the Milestone 2 label, had no page-level horizontal overflow, and produced no console errors.

The health report uses the following shape in practice:

```json
{
  "ok": true,
  "databaseVersion": 1,
  "counts": { "seasons": 0, "activeSeasons": 0, "archivedSeasons": 0, "recipients": 0, "gifts": 0, "ideas": 0 },
  "storage": { "usageBytes": 73728, "quotaBytes": 1600914021, "persisted": false },
  "issues": []
}
```

### Dexie version note

Dexie reports application schema version `1` through `db.verno` and the health check. IndexedDB itself reports the same database as version `10` because Dexie encodes its version as `verno * 10`. This is expected; it is not a second schema version.

### Not run

- **Playwright/E2E:** intentionally deferred to Milestone 4, when the first real end-to-end workflow exists. AC-2.12 was verified manually in a real browser instead of through the prescribed E2E harness. The same checks must be added to the Playwright suite in M4.
- **Browser matrix:** only Microsoft Edge 156 on Windows was exercised. Chrome, Firefox, Safari, mobile browsers, and private-window behavior remain untested.
- **Storage persistence request:** `navigator.storage.persist()` is not called yet. The browser currently reports `persisted: false`, so browser storage can still be evicted under pressure. This must be addressed and explained in the onboarding/diagnostics milestone.
- **Actual migration failure in a real browser:** the failing-upgrade behavior is covered by a `fake-indexeddb` integration test that reopens the untouched prior database. The manual recovery check used an invalid saved-settings value, not a real Dexie upgrade failure. The recovery UI path is shared, but the real-browser migration-specific path remains to be exercised in a later browser suite.
- **Lighthouse/axe:** not run. Automated accessibility testing begins with the M4 browser suite.
- **Offline/network-disabled artifact:** no PWA or installable package exists yet. A `file://` standalone file is not claimed to persist data.
- **GitHub Actions for this commit:** not observed at report time.

## Acceptance criteria status

| Criterion | Status | Evidence |
| --- | --- | --- |
| AC-2.01 | PASS | `db.ts` defines version 1 with the required stores/indexes; initialization tests assert the open schema. IndexedDB reports Dexie's encoded version 10. |
| AC-2.02 | PASS | Initialization tests and browser meta records show all four keys with correct values and updates. |
| AC-2.03 | PASS | Initialization test preserves a modified existing settings record; startup creates defaults only when absent. |
| AC-2.04 | PASS | Repository tests cover create/read/update/delete for seasons, recipients, gifts, and ideas, and read/update for settings. |
| AC-2.05 | PASS | UUID assertions and stable-ID updates cover the entity types; duplicate primary keys are rejected. |
| AC-2.06 | PASS | Domain and repository tests cover integer minor units and reject negative, fractional, unsafe, and out-of-range values. |
| AC-2.07 | PASS | Date utility and schema tests reject invalid date-only values and timestamps. |
| AC-2.08 | PASS | Schema tests assert `ValidationError` field details; repository tests prove failed validation leaves no write. |
| AC-2.09 | PASS | Gift tests reject missing recipients and recipients in another season before writing. |
| AC-2.10 | PASS | Recipient tests accept duplicate names and assign distinct IDs; duplicate IDs are rejected. |
| AC-2.11 | PASS | Rollback tests cover recipient reassignment, idea conversion, and season restoration failures with no partial changes. |
| AC-2.12 | PASS — manual | A season, recipient, and gift survived a full page reload in Edge. Playwright is deferred to M4. |
| AC-2.13 | PASS | The Edge process was closed and relaunched with the same user-data directory; all three records and `databaseId` were preserved. |
| AC-2.14 | PASS | A synthetic version-0 fixture migrates to version 1 and preserves every valid record. |
| AC-2.15 | PASS | A failing Dexie upgrade leaves the prior database intact and reopenable; the recovery page test shows no destructive action. A real-browser invalid-settings failure showed the same recovery guidance with data intact. |
| AC-2.16 | PASS | Initialization tests and the browser check show zero seasons after startup; no sample data is seeded or deleted. |
| AC-2.17 | PASS | Reset requires exactly `DELETE`; tests prove a wrong confirmation makes no change. No startup or recovery path imports or calls reset. |
| AC-2.18 | PASS | Health tests cover counts, multiple active seasons, orphans, cross-season links, source-idea links, status/date/money invariants, and storage fields. The real-browser report returned `ok: true`, estimate/quota values, `persisted: false`, and no issues on a clean database. |
| AC-2.19 | PASS | Health tests serialize the report and assert that names, notes, addresses, and gift names are absent; the check is read-only. |
| AC-2.20 | PASS | Error-mapping tests cover quota, version, upgrade, constraint, open, invalid-state, unknown, and wrapped transaction failures. Storage operations are wrapped in typed errors. |
| AC-2.21 | PASS | A repository-wide search found no `react` or `react-dom` imports in `src/domain` or `src/storage`; storage tests run against `fake-indexeddb` without React. |
| AC-2.22 | PASS | Tests use unique throwaway databases and explicit cleanup. The only real-browser clear was an explicit `DELETE` reset after verification; startup never resets data. |

**Result: 22 of 22 Milestone 2 acceptance criteria pass under the evidence above.** AC-2.12 used manual browser evidence because the E2E harness is deferred to Milestone 4; that limitation is explicit rather than treated as an automated pass.

## Limitations

- **No data-entry UI:** there are no recipient, gift, idea, season, or settings forms yet. Customers cannot create plan data through the interface.
- **No dashboard data:** Dashboard remains a preview and does not read or display stored records.
- **No backup, restore, CSV, or diagnostics UI:** the repositories, health engine, and reset API exist, but their customer-facing surfaces arrive later.
- **No persistence request:** `navigator.storage.persist()` is not called. Browser storage may be evicted under pressure, and the app does not yet explain that risk in onboarding.
- **No sample-data loader:** the sample module is not implemented; no sample season is present.
- **No theme switching:** settings store a theme value, but the UI remains light-only until Milestone 9.
- **No online sync:** local IndexedDB is the source of truth; there is no account, server, or sync path.
- **No offline package:** the development and preview builds are not installable offline artifacts. PWA delivery remains Milestone 10.
- **Browser coverage is narrow:** only Edge 156 on Windows was exercised for persistence and recovery.
- **No E2E suite:** Playwright and the real end-to-end workflow begin in Milestone 4.
- **No automated accessibility audit:** accessibility of new recovery/boot surfaces was reviewed, but axe/Lighthouse is not part of M2.
- **Coverage is good but not exhaustive:** 87.11% statements and 75.67% branches. Some UI primitives and rare health/settings branches remain uncovered.
- **No production-version restart test:** persistence/restart was exercised against the dev server; the production preview was checked for startup and rendering.
- **No true migrated-version fixture in a real browser:** the upgrade failure is covered by `fake-indexeddb`; only the shared recovery UI was exercised manually.

## Decisions / assumptions

- D-002 through D-009, D-016, D-018, D-019, O-3, O-4, O-7, and O-8 are accepted/decided for Milestone 2. See `docs/DECISIONS.md`.
- IndexedDB via Dexie 4 is the source of truth; localStorage is not used.
- Zod 4 validates every entity boundary and repository input.
- Money is stored only as integer minor units. Currency presets are display metadata; no exchange-rate conversion is implemented or implied.
- At most one season is active. Zero active seasons is valid and currently renders the honest “No active season” shell label.
- A gift without a source idea omits `sourceIdeaId`; the unique index is not weakened by `null`.
- Existing settings and `databaseId` are preserved on startup. Invalid identity/settings data produces recovery guidance rather than replacement.
- Reset is an explicit repository API only. No UI, startup, or recovery path can clear data.
- The storage chunk is dynamically imported so the shell can paint before Dexie/Zod load. The production build has two chunks and no warning.
- No new architecture decision was required. Low-risk implementation details are recorded in `DATA_MODEL.md`, `ARCHITECTURE.md`, and this report.

## Next milestone

**Milestone 3 — Recipients and first-season setup.** Not started.

Before it begins, the owner must:

1. Review this report and the running storage foundation.
2. Authorize Milestone 3.
3. Confirm the first-season onboarding UX, including the zero-active-season empty state and the choice not to create a sample season.
4. Decide when to request persistent storage and how to explain browser storage risk to a non-technical customer.

Milestone 3 must use the existing repositories and must not bypass validation, create sample data automatically, or add a destructive reset.

## Git checkpoint

- Commit: `feat: add persistent local storage`
- Tag: `milestone-2`
- Previous verified checkpoint: `b978097`, tag `milestone-1`.

## Blockers / questions

- **Owner review:** Milestone 2 is awaiting review before M3 authorization.
- **Persistent storage:** the app currently reports `persisted: false`. Decide whether to request persistence in M3 onboarding or wait until the first save plus diagnostics.
- **Browser matrix:** decide how much of the M4 Playwright matrix must run before Etsy release.
- **No critical M2 defect is known.**

## Recommended owner review

1. Run `npm install`, `npm run dev`, and open the Dashboard. Confirm the boot screen and Milestone 2 copy.
2. Open DevTools → Application → IndexedDB → `christmas-gift-tracker` and confirm the six stores (`gifts`, `ideas`, `meta`, `recipients`, `seasons`, `settings`) and one settings record.
3. Reload. Confirm no season or sample data appears and the same `databaseId` remains.
4. Review the recovery screen copy and confirm that offering only “Reload app” is the right non-technical behavior.
5. Review the M3 first-season flow and the persistent-storage question before authorizing further UI work.
