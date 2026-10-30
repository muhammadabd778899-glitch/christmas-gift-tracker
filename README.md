# Christmas Gift Tracker

A local-first Christmas gift planning application: recipients, gifts, budgets, ideas, shopping lists, seasons, backups, and offline use.

> **Status: Milestone 11 — Online accounts and synchronization complete and verified locally.**
> The delivered Etsy edition remains the account-free, offline-first PWA. The same codebase also builds an optional online edition (`npm run build:online`) with Supabase email/password accounts, password recovery, account export and deletion, device linking, automatic sync, retry, duplicate protection, and conflict choices. The private local IndexedDB database stays authoritative for offline work in both editions; nothing is transmitted unless the user links a device in the online edition. Light, dark, and system themes apply before first paint; currency formatting, diagnostics, privacy details, install guidance, and persistent-storage requests live in Settings. Backups and CSV exports are explicit local downloads.

---

## What works today

- A React + TypeScript + Vite application with a locked dependency tree.
- Seven navigable destinations: Dashboard, Recipients, Gifts, Idea Bank, Shopping List, Seasons & archives, and Settings are implemented.
- A responsive application shell with a desktop sidebar, mobile navigation drawer, skip link, and visible focus states.
- Warm design tokens for typography, spacing, surfaces, borders, radii, shadows, and brand/status colors.
- Reusable primitives: Button, IconButton, Input, Textarea, Select, Card, Badge, Dialog, Table, EmptyState, PageHeader, and error states.
- A dashboard that reflects no-season, active-season, archived-season, loading, and storage-error states without inventing data.
- A live budget dashboard with separate season budget, planned spending, actual spending, remaining budget, and unallocated budget cards.
- Planned-over-budget and spent-over-budget warnings shown separately, with negative remaining and unallocated values kept instead of clamped at zero.
- A Christmas countdown, bought/wrapped/sent progress, and data-quality alerts for missing costs, unbudgeted gifts, recipient caps, and overspending.
- A budget-vs-actual chart by recipient with an accessible table of the same numbers.
- Minimal season-budget editing from the dashboard, with live recalculation and no page reload.
- Explicit first-season setup for a season name, holiday date, and optional overall budget.
- Recipient management: create, edit, optional relationship, optional cap, notes, duplicate names, and responsive cards.
- Gift management: create, edit, and delete gifts with a required same-season recipient, category, store, purchase link, planned budget, actual cost, delivery method, address, and notes.
- Independent bought, wrapped, and sent statuses with optional dates; direct wrapped/sent changes require the gift to be bought first.
- Confirmation before un-buying: wrapped and sent states are cleared only after the user confirms.
- A bought gift without an actual cost is accepted, counts as zero spending, and is visibly flagged.
- Derived planned, spent, remaining-cap, and utilization figures calculated from gift records through the pure domain layer and updated live.
- Season totals, progress, chart series, data-quality findings, and countdown calculated once in the pure domain layer; dashboard components render the results without recalculating totals.
- Safe recipient deletion: cancel, reassign gifts to another recipient, or explicit cascade deletion with typed confirmation.
- Safe gift deletion with confirmation; deleting a converted gift reopens its source idea when that link exists.
- Idea Bank management: create, edit, delete, search by idea name, recipient, category, or store, and keep converted ideas as visible linked records.
- Idea conversion with recipient selection, copied gift fields, atomic writes, and idempotent retries; one gift per source idea is enforced by a unique index.
- Gift search across name, recipient, category, and store, with case- and accent-insensitive substring matching.
- Gift filters for recipient, category, and independent any/yes/no bought, wrapped, and sent states, combined with AND semantics.
- Deterministic gift sorting by recipient, name, planned budget, actual cost, derived status, and last-updated date, plus one-action reset of search, filters, and sorting.
- A distinct no-results state with a clear-filters action, separate from the no-gifts-yet state.
- Recipient detail pages at `/recipients/:recipientId` with cap, planned, spent, remaining-cap, utilisation, gift progress, notes, and only that recipient’s gifts.
- Recipient detail gift editing uses the same status rules and domain calculations as the Gifts page; archived seasons and unknown recipient IDs have explicit read-only and not-found states.
- A Shopping List derived from unbought gifts, grouped case-insensitively by store with “No store specified” last, plus group subtotals and a visible total.
- Optional “Mark bought” from the Shopping List using the existing gift status rules; the item disappears immediately and the dashboard updates live.
- A print view containing the list title, season, print date, groups, rows, and totals, with navigation and controls hidden.
- Archived-season recipient, gift, and idea views are read-only and link to Seasons & archives for restore.
- A Seasons & archives page with one active season, archived season cards, read-only preview, and clear zero-active state.
- Season creation with optional recipient copying and a required consent step before archiving the current active season.
- Confirmed archive, restore-and-switch, and exact-name deletion flows; no season operation silently replaces another.
- Complete JSON backup export with format, formatVersion, and schemaVersion, including settings and every season.
- Strict backup validation before any write: format, versions, entity fields, duplicate IDs, settings consistency, foreign keys, cross-season references, and size/count limits.
- Atomic replace-all restore that requires a fresh backup download and the typed word `RESTORE`, preserves `databaseId`, and leaves data untouched on failure.
- CSV export for the active season or all seasons with RFC 4180 quoting, UTF-8 BOM, CRLF, ISO dates, decimal money, `Yes`/`No`, human delivery labels, source markers, and formula-injection protection.
- CSV privacy default: addresses and notes are excluded unless explicitly included, with a visible warning.
- Optional sample data with a fixed, clearly labeled sample season; it is archived when any season exists, never mixes into real totals, and is idempotent to load.
- Sample removal that deletes only sample records, plus a reset flow that requires a downloaded backup and the typed word `DELETE`.
- Light, dark, and system themes with persisted choice, live system-preference updates, and pre-paint application without a flash of the wrong theme.
- A rebuilt Settings page with appearance, currency symbol/code/fraction digits, PII-free diagnostics, privacy explanation, app/schema versions, and the backup/reset tools.
- Monetary format changes are display-only: stored minor units are never converted, and a change with data present requires confirmation.
- Responsive polish at 360/768/1024/1440 px, including stacked gift and shopping cards, full-width mobile actions, and 44×44 px targets.
- Keyboard-accessible metric explanations for planned, spent, remaining, unallocated, and utilization figures, plus visible gold focus rings in both themes.
- Accessible chart equivalents, reduced-motion support, and screen-only mobile table rules that keep the print layout tabular.
- An installable offline-first PWA built with `vite-plugin-pwa`: web manifest, 192/512 px and maskable icons, Apple touch icon, and 21 precached assets with an SPA navigation fallback.
- A consent-based update banner: the app reports a waiting version, never reloads on its own, and refuses to reload while a dialog with unsaved work is open.
- A truthful footer connection status (“Saved on this device” / “Offline — all data saved on this device”) that never claims cloud sync.
- Settings install guidance for Chrome/Edge desktop, Android, iPhone/iPad Safari, and Firefox, plus a one-time-online-visit explanation.
- A user-initiated persistent-storage request with plain-language granted/declined/unsupported results and backup guidance; storage-unavailable and quota messages explain that data was not deleted and recommend a backup before freeing space.
- The production artifact was verified offline: cached launch and reload, all seven routes, create/edit across seasons, recipients, and gifts, persistence after browser restart, backup/CSV downloads offline, and the update flow.
- Two editions from one codebase: the default `npm run build` is the account-free offline edition, and `npm run build --mode online` adds the Account route; an automated bundle scan fails if account, Supabase, sync-RPC, or privileged-key strings leak into the offline artifact.
- Online accounts with Supabase email/password sign-up, sign-in, sign-out, email confirmation, password recovery, password change, account data export, and typed-confirmation account deletion.
- Explicit device linking with a connection plan (upload, download, or merge), a typed `CONNECT` confirmation, and a mandatory fresh local backup before a merge; connecting never silently deletes or overwrites either side.
- Automatic sync through a transactional local outbox and tombstones: per-record revision checks, a resumable sequence cursor, idempotent retries, duplicate protection, safe interruption recovery, and no last-write-wins.
- Surfaced conflicts with both versions and explicit choices to keep this device’s version or accept the cloud version/deletion; sync status is visible as synced, pending, syncing, offline, conflict, error, or disconnected.
- Device linkage blocks restore/reset/sample tools while linked; disconnecting keeps the local planner and clears only sync state and credentials.
- Supabase schema with row-level security, per-user isolation policies, validated RPC writes, soft-delete tombstones, scoped export, and a server-side account-deletion function.
- A version-2 Dexie/IndexedDB schema with typed validation for seasons, recipients, gifts, ideas, settings, diagnostics, and sync outbox/tombstones/state/conflicts/link metadata.
- Typed repositories with cross-season checks, transactional recipient policies, idea conversion, gift integrity, season lifecycle operations, and data portability.
- Safe startup: settings and meta are created only when absent; startup never creates a season, seeds sample data, or deletes records.
- A boot screen, a storage recovery screen with guidance, a health-check engine, a migration harness, and explicit restore/reset APIs.
- 377 Vitest tests across 43 files, including `fake-indexeddb` integration tests for persistence, validation, atomic rollback, health, migration failure, recipient policies, gift status transitions, first-season setup, the full recipient, gift, idea, and shopping workflows, gift search/filter/sort calculations, recipient detail calculations, dashboard calculations, season lifecycle, backup export/validation/restore, CSV encoding and safety, sample-data isolation, theme resolution and pre-paint behavior, Settings flows, install-prompt behavior, offline status, update consent, persistent-storage results, schema-2 upgrade, transactional change capture, connection planning, merge safety, push/pull retry, conflict resolution, fake-cloud isolation, and Account UI flows.
- GitHub Actions CI for formatting, type checking, linting, tests, and the production build.

The hosted installable PWA is the delivered offline edition. A single-file build was produced and evaluated from `file://` but is **not shipped**, because service workers cannot run there and Firefox, Safari, and iOS were not available for the required matrix. There are no invented totals, hidden calculations, automatic cloud backups, or silent data repair.

---

## Quick start

Requires Node.js **20.19 or newer** (Node 22 LTS is used in CI) and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Run the TypeScript project build check |
| `npm run lint` | Run ESLint across the repository |
| `npm run test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage |
| `npm run build` | Type-check and produce the production PWA bundle in `dist/` |
| `npm run build:standalone` | Build the evaluated single-file `file://` spike into `dist-standalone/` (not shipped) |
| `npm run preview` | Serve the production bundle locally |
| `npm run format` | Format code and configuration with Prettier |
| `npm run format:check` | Verify formatting without changing files |

---

## Current technology

Installed through Milestone 10:

- React 19 + TypeScript
- Vite 8
- React Router 7
- Lucide icons
- CSS Modules with design tokens
- Dexie 4 for IndexedDB
- Zod 4 for boundary validation
- Recharts for the budget-vs-actual chart, loaded as a separate chunk
- `vite-plugin-pwa` 2 / Workbox for the manifest, precache, service worker, and update flow
- Vitest 5, Testing Library, `jsdom`, `fake-indexeddb`
- ESLint 9, Prettier
- GitHub Actions

Evaluation-only tooling:

- `vite-plugin-singlefile` builds the unshipped `file://` spike (`npm run build:standalone`).

Not installed yet — each arrives with the milestone that needs it:

- Playwright (no end-to-end suite has been installed yet; manual browser checks are recorded per milestone)

Reactive reads use a small typed `useLiveQueryState` hook over Dexie's own `liveQuery`, rather than the separate `dexie-react-hooks` package (D-025). Recipient and season forms use shared React state, the Zod schemas, and the existing validation utilities; React Hook Form is not installed.

No runtime CDN assets, remote fonts, analytics, or telemetry are used. The interface uses a local system font stack; no brand font is bundled or fetched.

---

## Repository map

| Path | Purpose |
| --- | --- |
| `src/app/` | Composition root, router, shell, navigation metadata, theme controller, and error boundaries |
| `src/pages/` | Route-level pages and deliberate feature placeholders |
| `src/components/ui/` | Reusable interface primitives with no domain knowledge |
| `src/components/layout/` | Brand, sidebar, header, navigation, and mobile drawer |
| `src/lib/` | Generic utilities |
| `src/pwa/` | Service-worker update hook, install-prompt hook, support detection, and the test/standalone register stub |
| `public/icons/` | PWA and Apple touch icons |
| `src/styles/` | Design tokens and global base styles |
| `src/test/` | Test setup, memory-router helper, fake-indexeddb storage harness, and fixtures |
| `src/features/` | Recipient, gift, dashboard, idea, shopping, season, and settings cards, dialogs, page-data hooks, and feature styles |
| `src/domain/` | Branded entities, Zod schemas, money/date/locale utilities, and typed errors |
| `src/storage/` | Dexie schema, initialization, repositories, migration harness, health, reset, backup, CSV, and sample data |
| `e2e/` | Reserved for an end-to-end suite; Playwright is not installed yet |
| `docs/` | Product, architecture, data, decisions, acceptance criteria, and reports |
| `.github/workflows/ci.yml` | Continuous verification on push and pull request |

### Documentation

| Document | Purpose |
| --- | --- |
| `docs/PRODUCT_SPEC.md` | Product definition, scope, pages, rules, privacy, and claims guardrails |
| `docs/ARCHITECTURE.md` | Stack, layering, folder structure, storage design, offline strategy, and risks |
| `docs/DATA_MODEL.md` | Entities, invariants, calculations, IndexedDB schema, backup, and CSV formats |
| `docs/ACCEPTANCE_CRITERIA.md` | Testable completion criteria for every milestone |
| `docs/DECISIONS.md` | Architecture decisions, assumptions, and open owner decisions |
| `docs/IMPLEMENTATION_PLAN.md` | Milestone sequence, gates, status, and Git checkpoints |
| `docs/MILESTONE_0_REPORT.md` | Specification milestone report |
| `docs/MILESTONE_1_REPORT.md` | Foundation milestone report and verification evidence |
| `docs/MILESTONE_2_REPORT.md` | Storage milestone report and verification evidence |
| `docs/MILESTONE_3_REPORT.md` | Recipients and first-season milestone report and verification evidence |
| `docs/MILESTONE_4_REPORT.md` | Gifts and safe deletion milestone report and verification evidence |
| `docs/MILESTONE_5_REPORT.md` | Budget engine and dashboard milestone report and verification evidence |
| `docs/MILESTONE_6_REPORT.md` | Idea Bank and Shopping List milestone report and verification evidence |
| `docs/MILESTONE_7_REPORT.md` | Search, filters, and recipient details milestone report and verification evidence |
| `docs/MILESTONE_8_REPORT.md` | Seasons, archives, and data portability milestone report and verification evidence |
| `docs/MILESTONE_9_REPORT.md` | Professional interface, themes, and accessibility milestone report and verification evidence |
| `docs/MILESTONE_10_REPORT.md` | Offline delivery milestone report and verification evidence |
| `docs/OFFLINE_SETUP.md` | Customer-facing install and offline setup guide |
| `AI_DEVELOPMENT_PROTOCOL.md` | Permanent working rules for the AI agent |

**Reading order for a new session:** protocol → product spec → architecture → data model → acceptance criteria → decisions → implementation plan → latest milestone report.

---

## Milestones

| # | Milestone | Status |
| --- | --- | --- |
| 0 | Specification | Complete — approved |
| 1 | Foundation and shell | Complete — verified |
| 2 | Data model and persistent storage | Complete — verified |
| 3 | Recipients | Complete — verified |
| 4 | Gifts | Complete — verified |
| 5 | Budget engine and dashboard | Complete — verified |
| 6 | Idea Bank and Shopping List | Complete — verified |
| 7 | Search, filters, recipient details | Complete — verified |
| 8 | Seasons, archives, backup, CSV | Complete — verified |
| 9 | Professional UI, themes, accessibility | Complete — verified |
| 10 | Offline delivery | Complete — verified |
| 11 | Online edition and sync | Complete — verified locally; remote RLS run pending test credentials |
| 12 | QA, packaging, Etsy launch | Not started |

Milestone 11 is complete locally. The remote Supabase cross-account run (`npm run verify:supabase`) still requires the owner’s dedicated test project; see `docs/ONLINE_SETUP.md`. Milestone 12 — final QA, packaging, and the Etsy release of the offline edition — begins only after owner review and authorization.

---

## Data, privacy, and offline status

- **Storage:** a version-2 local IndexedDB database stores seasons (at most one active), their optional overall budgets, recipients, gifts, and ideas, plus sync bookkeeping used only after a device is linked. Startup creates settings and diagnostics only when needed; it never creates a season, seeds sample data, or deletes records. A season exists only after an explicit setup, restore, or sample-load action.
- **Calculations:** season budget, planned, actual, remaining, and unallocated figures, recipient metrics, progress, chart series, data-quality findings, countdown, Idea Bank search results, gift search/filter/sort results, recipient detail figures, and the Shopping List are derived from saved records through pure domain functions. No totals, filter state, or shopping-list snapshots are stored. Unbought gifts do not count as spent, and a bought gift without an actual cost contributes zero.
- **Shopping List:** generated at read time from unbought gifts. Marking a gift bought writes through the gift repository, removes the row, and updates budgets. The print view is browser printing only; there is no saved PDF export.
- **Backup and reset:** JSON backups and CSV exports are downloaded locally on demand. Restore is replace-all only and requires a fresh backup download plus the typed word `RESTORE`; reset requires a fresh backup plus `DELETE`. Both preserve `databaseId` and never run automatically. There is no cloud, scheduled, or automatic backup, and no merge restore.
- **Sample data:** optional and explicit. It uses a flagged sample season, stays isolated from real totals, is archived whenever any season exists, and can be removed independently.
- **Theme and currency:** the theme choice (light, dark, or system) is stored in Settings and mirrored to `localStorage` only for first-paint styling; IndexedDB remains authoritative. Currency symbol, code, and fraction digits affect display only and never convert stored minor units.
- **Accounts and sync:** not present in the offline edition, which remains account-free and transmits nothing. The separately built online edition adds optional Supabase accounts. After the user signs in and confirms `CONNECT`, records sync to that user’s own rows; row-level security prevents cross-account access, and only the public anon key is embedded (no service-role key). The local database remains the working copy, and conflicts are always surfaced for a decision rather than overwritten. Disconnecting or deleting the account does not delete the local planner; cloud data is removed by the user’s explicit deletion request.
- **Analytics/telemetry:** none.
- **Browser storage risk:** browser cleanup or site-data clearing can remove local records. Settings explains this and offers a user-initiated `navigator.storage.persist()` request, reporting granted, declined, unsupported, or unavailable results. The app never claims protection from every eviction; backups remain the recovery path.
- **Offline delivery:** the hosted app is an installable offline-first PWA. One online visit caches the app shell (21 precached assets), after which launch, reload, and all core workflows work without a network. The service worker updates only when the user chooses to reload, and it refuses while a dialog with unsaved work is open. A raw `file://` build was evaluated but is not shipped and is not advertised as reliably storing data. See `docs/OFFLINE_SETUP.md`.
- **Offline status:** the footer states whether data is saved on this device and whether the app is offline; the offline edition makes no sync claim and has no accounts, cloud backup, or cross-device access. The online edition shows a separate sync indicator with pending, offline, conflict, and error states.
- **Customer data:** entered season, budget, recipient, gift, and idea data stays in the browser profile. No names, addresses, notes, or diagnostics are transmitted. Diagnostic health reports contain counts, codes, and storage estimates only.

The interface copy is intentionally conservative: local downloads are offered, but no automatic, cloud, or guaranteed recovery is claimed.

---

## Current next step

1. Owner reviews `docs/MILESTONE_11_REPORT.md`, the offline build, the online build, and `docs/ONLINE_SETUP.md`.
2. Owner creates the dedicated Supabase test project, applies the migration, and supplies the URL and anon key through the git-ignored `.env.online.local` only.
3. Owner runs `npm run verify:supabase`; the result completes the remote RLS/cross-account evidence.
4. Owner authorizes Milestone 12 — final QA, packaging, and the Etsy release of the account-free offline edition.
5. Milestone 12 must preserve both editions and keep the offline edition account-free.

Until authorized: **do not start Milestone 12.**

---

## License and distribution

This is intended to be a commercial digital product. Licensing, Etsy distribution terms, and support terms are to be finalized before the release milestone. Do not redistribute the source without the owner’s permission.
