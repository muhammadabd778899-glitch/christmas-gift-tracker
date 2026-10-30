# Christmas Gift Tracker

A local-first Christmas gift planning application: recipients, gifts, budgets, ideas, shopping lists, seasons, backups, and offline use.

> **Status: Milestone 9 — Professional interface, themes, and accessibility complete and verified.**
> The shell is runnable, responsive, themed, and tested. A private local IndexedDB database stores real seasons, recipients, gifts, ideas, and season budgets, and no customer plan or sample records are created automatically. Light, dark, and system themes apply before first paint; currency formatting, diagnostics, and privacy details live in Settings. Backups and CSV exports are explicit local downloads. Nothing is transmitted.

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
- A version-1 Dexie/IndexedDB schema with typed validation for seasons, recipients, gifts, ideas, settings, and diagnostics.
- Typed repositories with cross-season checks, transactional recipient policies, idea conversion, gift integrity, season lifecycle operations, and data portability.
- Safe startup: settings and meta are created only when absent; startup never creates a season, seeds sample data, or deletes records.
- A boot screen, a storage recovery screen with guidance, a health-check engine, a migration harness, and explicit restore/reset APIs.
- 307 Vitest tests across 33 files, including `fake-indexeddb` integration tests for persistence, validation, atomic rollback, health, migration failure, recipient policies, gift status transitions, first-season setup, the full recipient, gift, idea, and shopping workflows, gift search/filter/sort calculations, recipient detail calculations, dashboard calculations, season lifecycle, backup export/validation/restore, CSV encoding and safety, sample-data isolation, theme resolution and pre-paint behavior, and the Settings flows.
- GitHub Actions CI for formatting, type checking, linting, tests, and the production build.

Offline packaging remains a deliberate future milestone. There are no invented totals, hidden calculations, automatic cloud backups, or silent data repair.

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
| `npm run build` | Type-check and produce the production bundle in `dist/` |
| `npm run preview` | Serve the production bundle locally |
| `npm run format` | Format code and configuration with Prettier |
| `npm run format:check` | Verify formatting without changing files |

---

## Current technology

Installed through Milestone 9:

- React 19 + TypeScript
- Vite 8
- React Router 7
- Lucide icons
- CSS Modules with design tokens
- Dexie 4 for IndexedDB
- Zod 4 for boundary validation
- Recharts for the budget-vs-actual chart, loaded as a separate chunk
- Vitest 5, Testing Library, `jsdom`, `fake-indexeddb`
- ESLint 9, Prettier
- GitHub Actions

Not installed yet — each arrives with the milestone that needs it:

- Playwright (no end-to-end suite has been installed yet; manual browser checks are recorded per milestone)
- `vite-plugin-pwa` (Milestone 10)

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
| 10 | Offline delivery | Not started |
| 11 | Online edition and sync | Not started |
| 12 | QA, packaging, Etsy launch | Not started |

Milestone 9 is complete and verified. Milestone 10 — Offline delivery — begins only after owner review and authorization.

---

## Data, privacy, and offline status

- **Storage:** a version-1 local IndexedDB database stores seasons (at most one active), their optional overall budgets, recipients, gifts, and ideas. Startup creates settings and diagnostics only when needed; it never creates a season, seeds sample data, or deletes records. A season exists only after an explicit setup, restore, or sample-load action.
- **Calculations:** season budget, planned, actual, remaining, and unallocated figures, recipient metrics, progress, chart series, data-quality findings, countdown, Idea Bank search results, gift search/filter/sort results, recipient detail figures, and the Shopping List are derived from saved records through pure domain functions. No totals, filter state, or shopping-list snapshots are stored. Unbought gifts do not count as spent, and a bought gift without an actual cost contributes zero.
- **Shopping List:** generated at read time from unbought gifts. Marking a gift bought writes through the gift repository, removes the row, and updates budgets. The print view is browser printing only; there is no saved PDF export.
- **Backup and reset:** JSON backups and CSV exports are downloaded locally on demand. Restore is replace-all only and requires a fresh backup download plus the typed word `RESTORE`; reset requires a fresh backup plus `DELETE`. Both preserve `databaseId` and never run automatically. There is no cloud, scheduled, or automatic backup, and no merge restore.
- **Sample data:** optional and explicit. It uses a flagged sample season, stays isolated from real totals, is archived whenever any season exists, and can be removed independently.
- **Theme and currency:** the theme choice (light, dark, or system) is stored in Settings and mirrored to `localStorage` only for first-paint styling; IndexedDB remains authoritative. Currency symbol, code, and fraction digits affect display only and never convert stored minor units.
- **Accounts and sync:** not implemented.
- **Analytics/telemetry:** none.
- **Browser storage risk:** the app does not call `navigator.storage.persist()` yet. Browser cleanup or site-data clearing can remove local records. The current UI does not claim protection from eviction; persistence timing and buyer-facing explanation remain open for a later milestone.
- **Offline delivery:** not built or verified. The intended launch edition is an installable offline-first PWA, with the actual artifact validated in Milestone 10. A raw `file://` HTML file is not assumed to persist data and will not be advertised without passing the browser test matrix.
- **Customer data:** entered season, budget, recipient, gift, and idea data stays in the browser profile. No names, addresses, notes, or diagnostics are transmitted. Diagnostic health reports contain counts, codes, and storage estimates only.

The interface copy is intentionally conservative: local downloads are offered, but no automatic, cloud, or guaranteed recovery is claimed.

---

## Current next step

1. Owner reviews `docs/MILESTONE_9_REPORT.md`, the light/dark/system themes, and the responsive layouts.
2. Owner authorizes Milestone 10 — Offline delivery.
3. Milestone 10 must use the existing repositories and domain rules, and must not weaken the data-safety gates.

Until authorized: **do not start Milestone 10.**

---

## License and distribution

This is intended to be a commercial digital product. Licensing, Etsy distribution terms, and support terms are to be finalized before the release milestone. Do not redistribute the source without the owner’s permission.
