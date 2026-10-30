# Milestone 8 Report — Seasons, archives, and data portability

**Status:** Complete and verified on 2026-10-30  
**Version:** 0.8.0  
**Git checkpoint:** `feat: add seasons, archives, and data portability`  
**Tag:** `milestone-8`

Companion documents: `docs/ACCEPTANCE_CRITERIA.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, and `docs/ARCHITECTURE.md`.

---

## 1. What shipped

### 1.1 Season management at `/seasons`

- The former Archives placeholder is replaced by a **Seasons & archives** page. The navigation label is now `Seasons`, and the page title resolves to `Seasons & archives`.
- An **active season card** shows the season name, holiday date, overall budget, recipient/gift/idea counts, planned and actual totals, links to the dashboard, and `Edit details` and `Archive season` actions.
- **Create a season** with a name (up to 80 characters), a holiday date defaulting to Christmas Day, and an optional overall budget. When another season is active, creation requires explicit consent to archive it and the new season becomes active; the dialog states that nothing is deleted.
- **Copy recipients** from an existing season is optional and copies only names, relationships, caps, and notes with new recipient IDs. Gifts and ideas are never copied, and the dialog says so.
- **Edit details** updates name, date, and budget through the existing season validation and repository; changing a name does not affect records.
- **Archive season** is confirmed through a native dialog that explains records stay available for reference and editing is disabled until restore. Archiving is non-destructive and produces the zero-active state.
- **Restore** an archived season from its card or from the zero-active empty state. When another season is active, the dialog names both seasons and restores in one transaction that archives the current season; `Restore and switch` is a single explicit action.
- **Zero active seasons** shows a dedicated empty state with `Create season` and `Restore {name}` actions. Only non-sample archived seasons appear as restore options there.
- **Delete an archived season** requires typing its exact trimmed, case-sensitive name, states the recipient/gift/idea counts being removed, deletes the season and its children atomically, and is impossible for the active season.
- **View** opens a read-only preview dialog for an archived season, showing its identity, totals, recipients, gifts, and ideas without edit controls.
- Archived seasons remain viewable, exportable, and included in backups. The active season cannot be deleted, and no new season silently erases or replaces another.

### 1.2 JSON backup and restore

- **Complete backup** downloads a JSON file named `christmas-gift-tracker-backup-YYYY-MM-DD.json` with the envelope `{ format, formatVersion, schemaVersion, appVersion, exportedAt, data }`, where `data` contains `settings`, `seasons`, `recipients`, `gifts`, and `ideas`. Diagnostics/meta are intentionally excluded.
- The downloaded backup is validated against the same Zod schemas before it is written, so an exported file cannot contain records the app would reject.
- **Restore from a backup** is replace-all only. The chosen file is fully validated before any write: JSON parsing, format marker, format version, schema version, field types, money, dates, referential integrity, duplicate IDs across record types, cross-season references, active-season invariants, and size/record limits.
- Limits: 25 MB file size, 500 seasons, 10,000 recipients, gifts, and ideas per season. Issues are reported with clear messages and a bounded list.
- Invalid, malformed, newer, older, dangling, duplicate, or cross-season backups are rejected without changing current data.
- The UI shows a validated summary before restoring: exported timestamp, season counts with active/archived split, record counts, and app version.
- Restore is gated by **D-029**: the user must download a fresh backup of the current data and type `RESTORE`. The repository re-checks the confirmation word, so the gate is not only a disabled button.
- Restore runs in one Dexie transaction and preserves `databaseId`. A failure leaves the previous data intact.
- Older supported schema versions are rejected with a documented reason rather than partially imported; no migration path exists yet.

### 1.3 CSV export

- **Download CSV** produces `christmas-gift-tracker-gifts-YYYY-MM-DD.csv` with a UTF-8 byte-order mark, comma separation, CRLF line endings, and RFC 4180 quoting for commas, quotes, and newlines.
- Exact base columns: `Season,Recipient,Relationship,Gift,Category,Store,Purchase URL,Planned Budget,Actual Cost,Bought,Bought Date,Wrapped,Wrapped Date,Sent,Sent Date,Delivery Method,Source`.
- Optional `Address` and `Notes` columns are off by default and require explicit opt-in with a warning, because CSV files are often shared.
- Money is exported as a decimal without a currency symbol using the configured fraction digits. Dates are ISO `YYYY-MM-DD`. Booleans are `Yes`/`No`. Delivery methods use human labels. Idea-derived gifts export `Source=Idea`.
- Cells beginning with `=`, `+`, `-`, or `@` (after leading whitespace) are prefixed with an apostrophe to prevent spreadsheet formula injection.
- Scope is either the active season or all seasons. The active-season option is unavailable when there is no active season and the export fails with a clear message.
- Rows are deterministically sorted, and the CSV contains no internal IDs, schema metadata, or stored timestamps beyond bought/wrapped/sent dates.

### 1.4 Sample data

- **Load sample data** creates one fixed sample season flagged `isSample` with two recipients, three gifts, and two ideas.
- It is active only when no season exists. If any real season exists, it is added as archived and never changes active-season totals.
- Loading twice is idempotent: the fixed sample season ID prevents duplicates.
- **Remove sample data** deletes only the sample season and its children, and clears the active selection if the sample was active.

### 1.5 Reset flow

- **Reset all data** deletes every season, recipient, gift, idea, and sample record, and restores settings to defaults.
- It is gated by a fresh backup download and the exact word `DELETE`, re-checked by the reset API. It never runs automatically and preserves `databaseId`.
- After a successful reset the app routes to onboarding.

### 1.6 Supporting changes

- New `src/lib/download.ts` downloads blobs with object URLs and revokes them afterwards.
- New storage modules: `src/storage/backup.ts`, `src/storage/csv.ts`, and `src/storage/sample.ts`.
- Season repository additions: `SeasonCreateOptions.archiveCurrent`, `copyRecipients`, and the `archiveCurrent` lifecycle semantics, all transactionally enforced.
- New feature components under `src/features/seasons/`: season form dialog, confirm dialogs, read-only preview, data tools, and the page-data hook.
- App surfaces updated: navigation metadata, page titles, header/dashboard links to the Seasons page, About dialog milestone copy, and the Settings page reference to season management.
- Version metadata updated to 0.8.0 in `src/lib/appInfo.ts`, `package.json`, and `package-lock.json`.

## 2. What did not ship

- No Playwright or other browser E2E suite. Playwright remains deferred and the E-marked criteria were exercised with automated UI/integration tests plus a manual Chromium session.
- No merge or selective restore. Restore is replace-all only by decision (D-010).
- No automatic, scheduled, or cloud backups. Backups and CSV exports are user-initiated downloads only.
- No backup encryption or password protection. The UI warns that a complete backup contains addresses and notes and must be kept private.
- No schema migration for older backup files; older supported versions are rejected with a reason.
- No restore of the sample season as an active season. Sample data can only be loaded or removed through the sample actions.
- No PDF export, email sharing, or print of the backup/CSV.
- No new state-management library. Pages consume the existing repositories, `useLiveQueryState`, and domain calculations.
- No Milestone 9 UI/theming/accessibility work, no offline packaging, and no sync.

## 3. Decisions

- **D-010 accepted for Milestone 8:** restore replaces all data; there is no merge mode.
- **D-023 accepted for Milestone 8:** CSV excludes addresses and notes by default and includes them only with explicit opt-in.
- **D-029 accepted for Milestone 8:** destructive data tools require a fresh backup download and a typed word (`RESTORE` for restore, `DELETE` for reset); archived-season deletion requires the exact trimmed name; the repository re-checks the word rather than trusting the UI.
- **O-6 decided:** replace-all restore with a required fresh backup.
- Earlier decisions still apply: D-009 archived read-only, D-016 sample isolation, D-018 zero/one active season, D-025 liveQuery hook.

## 4. Verification evidence

### 4.1 Static checks and final machine evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | **31 files, 291 tests passed, 0 failed** |
| `npm run test:coverage` | Pass |
| `npm run build` | Pass |
| Prettier on changed files | Pass (`--end-of-line auto`, see limitations) |

Final coverage:

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All files | 85.98% | 78.69% | 86.92% | 86.73% |

Final production build:

- Main app chunk: 626.76 kB (185.30 kB gzip).
- Lazy chart chunk: 372.12 kB (107.11 kB gzip).
- Split `db`, `repositories`, and `initialize` chunks emitted separately.
- Vite reported only the expected main-chunk size warning; the build passed.

### 4.2 Automated coverage

Milestone 8 added **44 tests across 5 new files**, taking the suite from 247 to 291 tests:

- `src/storage/backup.test.ts` — 14 tests: envelope contents and versions, exact round-trip of counts/IDs/relationships/statuses/settings, exact `RESTORE` confirmation, unchanged data on a failed write transaction, not-JSON, wrong format marker, newer schema, older schema, dangling recipients, cross-season gifts, duplicate IDs across record types, archived active-season settings, invalid field values, and the 25 MB limit.
- `src/storage/csv.test.ts` — 8 tests: header/BOM/CRLF, active-season field mapping, RFC 4180 escaping and formula guarding, all-seasons scope including archived records, fraction digits without a currency symbol, active-scope error with no active season, delivery labels, and the stored-record export helper that returns a download-ready file.
- `src/storage/sample.test.ts` — 7 tests: flagged active sample creation, idempotent reload, archived sample with a real active season, archived sample when only archived real seasons exist, removal deleting only sample children, clearing the active selection, and no-op removal.
- `src/storage/season-lifecycle.test.ts` — 5 tests: atomic archive-on-create, refusal without consent, refusal when the new season is not active, zero-active round trip, and isolated totals between seasons.
- `src/pages/SeasonsPage.test.tsx` — 10 tests: page and data tools, create with archive consent, archive → zero-active → restore, restore-and-switch, exact-name delete, invalid backup rejection, fresh-download + `RESTORE` gate, CSV download summary, sample load/remove, and reset gate with onboarding redirect.

### 4.3 Manual browser verification

Environment: Chromium through the browser tools against the Vite development server at `http://localhost:5173`, using local IndexedDB data created during the session. These records were not shipped as sample data.

Observed during the final Milestone 8 browser session:

- `/seasons` empty state rendered with the zero-active copy, `New season`, and the Data/Backups/Exports sections; the document title read `Seasons & archives · Christmas Gift Tracker`.
- Loading sample data created `Sample Christmas` as active with 2 recipients, 3 gifts, 2 ideas, $140 planned, $92 actual, and a $450 budget.
- Archiving the sample produced the zero-active state; the empty state did not offer to restore the sample, and the sample card remained archived with a `Delete` action only.
- Opening `View` on an archived season showed a read-only preview with totals and no edit controls.
- Downloading a backup reported `Backup downloaded with 3 seasons, 2 recipients, and 3 gifts.`; the downloaded JSON contained the documented envelope and `appVersion` 0.8.0.
- Downloading CSV reported `CSV downloaded: 3 gift rows.` and `3 gift rows from 1 season exported.`; the file was 522 bytes with the expected gift rows.
- `New season` defaulted to `Christmas 2026` with 2026-12-25 and a blank optional budget; creating `Christmas 2027` while the sample was archived made it active, with the sample still archived and the message `Christmas 2027 is active.`
- Archiving `Christmas 2027` produced the zero-active state, and `Restore Christmas 2027` in the empty state restored it.
- Creating `Christmas 2028` required the `Archive Christmas 2027 and make this season active` consent checkbox before `Create season` was enabled; after creation the message read `Christmas 2028 is active. Christmas 2027 was archived, not deleted.`
- Restoring `Christmas 2027` while `Christmas 2028` was active showed `Christmas 2028 will be archived so that only one season is active. Nothing is deleted.` and `Restore and switch` archived 2028 while activating 2027.
- Uploading a JSON file with a different format marker showed `That file is not a Christmas Gift Tracker backup...` and left all three seasons unchanged.
- Uploading the downloaded backup showed `This file is a valid backup.` with the exported timestamp, 3 seasons (1 active, 2 archived), 2 recipients, 3 gifts, 2 ideas, and app version 0.8.0. The restore button stayed disabled until `Download current data again` was used and `RESTORE` was typed; the restore then reported `Backup restored: 3 seasons, 2 recipients, 3 gifts, and 2 ideas.` and reset the gate.
- Clicking `Delete` on an archived season showed the typed-name confirmation with `Delete season permanently` disabled; the dialog was cancelled without deleting anything.
- Accessibility labels were present on the copy-recipients checkbox, archive-consent checkbox, sensitive CSV checkbox, backup file input, and the restore/reset confirmation fields, and their descriptions were associated.

### 4.4 Lighthouse

No Lighthouse run was performed for Milestone 8. The accessibility milestone is Milestone 9, and this report makes no new Lighthouse or accessibility-audit claim.

## 5. Acceptance criteria

| ID | Criterion | Result |
| --- | --- | --- |
| AC-8.01 | A season can be created with name, holiday date, and optional budget. | Pass |
| AC-8.02 | Creating a season optionally copies recipient names/relationships/caps with new IDs; it does not copy gifts or ideas. | Pass |
| AC-8.03 | At most one season is active at any time, enforced in storage. | Pass |
| AC-8.04 | Switching seasons changes all data pages immediately and never mixes records. | Pass |
| AC-8.05 | Two seasons with different recipients/gifts retain isolated totals. | Pass |
| AC-8.06 | Archiving is non-destructive and makes the season read-only. | Pass |
| AC-8.07 | Restoring an archived season while another is active requires confirmation and archives the current one in one transaction. | Pass |
| AC-8.08 | The app supports zero active seasons with a clear empty state and Create/Restore actions. | Pass |
| AC-8.09 | Deleting an archived season requires typing its exact name, deletes children atomically, and is not possible for the active season. | Pass |
| AC-8.10 | A new season never silently erases or replaces a previous season. | Pass |
| AC-8.11 | Archived-season data can be viewed, exported, and backed up. | Pass |
| AC-8.12 | The JSON backup includes settings, all seasons, recipients, gifts, and ideas, with format and schema versions. | Pass |
| AC-8.13 | Backup → clear/reset test data → restore reproduces counts, IDs, relationships, statuses, and settings exactly. | Pass |
| AC-8.14 | Restore validates format, version, types, money, dates, referential integrity, duplicates, and invariants before writing. | Pass |
| AC-8.15 | Invalid, malformed, newer, dangling, or cross-season backups are rejected with clear messages and zero changes. | Pass |
| AC-8.16 | Restore is replace-all only, requires confirmation, and offers/creates a pre-restore backup. | Pass |
| AC-8.17 | Restore is atomic; a failure leaves the previous data intact. | Pass |
| AC-8.18 | Restoring an older supported version is rejected with a documented reason; it is never partially imported. | Pass |
| AC-8.19 | CSV export produces valid RFC 4180 output with the documented columns, BOM, CRLF, and ISO dates. | Pass |
| AC-8.20 | CSV handles commas, quotes, newlines, Unicode, and empty fields. | Pass |
| AC-8.21 | CSV protects against spreadsheet formula injection as documented. | Pass |
| AC-8.22 | Addresses and notes are excluded from CSV by default and included only with explicit opt-in and a warning. | Pass |
| AC-8.23 | Reset-all requires typed confirmation and a pre-reset backup; it never runs automatically. | Pass |
| AC-8.24 | Season and backup operations update docs and are covered by regression tests. | Pass |
| AC-8.25 | Sample data can be loaded through an explicit action; it is clearly labeled, uses a flagged sample season, and loading twice does not duplicate it. | Pass |
| AC-8.26 | If real data exists, the sample season is added as archived and never changes active-season totals. | Pass |
| AC-8.27 | Removing sample data deletes only the sample season and its children; real seasons and records are untouched. | Pass |

## 6. Honest limitations

- **No browser E2E suite.** Playwright is still deferred. The E-marked criteria were exercised through automated UI/integration tests and one manual Chromium session, not a repeatable E2E suite.
- **Manual verification is partial per criterion.** The browser session covered the principal M8 flows; the automated suite owns the exhaustive matrix. The report does not claim full manual coverage of every E-marked criterion.
- **No mobile, Firefox, or Safari verification.** Chromium desktop verification only.
- **Formatting quirk on Windows.** The worktree is checked out with CRLF while Prettier is configured with `endOfLine: lf`, so a repo-wide `npm run format:check` reports line-ending differences. Changed files were verified with `prettier --check --end-of-line auto`. No code-style reformat was applied across untouched files.
- **Replace-all restore only.** Users cannot merge a backup into existing data; this is a decision, not an omission.
- **Older backups are rejected, not migrated.** A future schema version needs an explicit migration path.
- **Restore requires a fresh download.** By design the restore button stays disabled until the current data is downloaded in that session; this is a safety gate, not an inconvenience bug.
- **Sample season is fixed.** There is exactly one flagged sample season; it cannot be restored as an active season from the restore action and is not counted in real totals.
- **No automatic or cloud backup.** A browser-profile loss without a downloaded backup is unrecoverable, and the UI says so.
- **No backup encryption.** Complete backups contain addresses and notes by necessity; the copy warns the file must be kept private.
- **Build size.** The main app chunk grew from 591.13 kB to 626.76 kB and remains above the Vite 500 kB warning threshold; route-level splitting remains future work.
- **No Lighthouse run.** No new accessibility score is claimed for Milestone 8.

## 7. Next step

Milestone 8 is complete and ready for owner review. Milestone 9 — Professional UI, themes, accessibility — begins only after owner review and authorization.
