# Christmas Gift Tracker

A local-first Christmas gift planning application: recipients, gifts, budgets, ideas, shopping lists, seasons, backups, and offline use.

> **Status: Milestone 5 — budget engine and dashboard complete and verified.**
> The shell is runnable, responsive, and tested. A private local IndexedDB database stores real seasons, recipients, gifts, and season budgets, and no customer plan or sample records are created automatically. Nothing is transmitted.

---

## What works today

- A React + TypeScript + Vite application with a locked dependency tree.
- Seven navigable destinations: Dashboard, Recipients, and Gifts are implemented; Idea Bank, Shopping List, and Archives remain labeled previews. Settings is available.
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
- Archived-season recipient and gift views are read-only and explain how to proceed later.
- A version-1 Dexie/IndexedDB schema with typed validation for seasons, recipients, gifts, ideas, settings, and diagnostics.
- Typed repositories with cross-season checks, transactional recipient policies, idea conversion, gift integrity, and explicit season lifecycle operations.
- Safe startup: settings and meta are created only when absent; startup never creates a season, seeds sample data, or deletes records.
- A boot screen, a storage recovery screen with guidance, a health-check engine, a migration harness, and an explicit `DELETE`-confirmed reset API.
- 190 Vitest tests, including `fake-indexeddb` integration tests for persistence, validation, atomic rollback, health, migration failure, recipient policies, gift status transitions, first-season setup, the full recipient and gift workflows, and dashboard calculations.
- GitHub Actions CI for formatting, type checking, linting, tests, and the production build.

Ideas, shopping lists, search, archive management, backup, and offline packaging remain deliberate placeholders. There are no sample records, invented totals, hidden calculations, or storage-management screens.

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

Installed through Milestone 5:

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

No runtime CDN assets, remote fonts, analytics, or telemetry are used. The interface uses a local system font stack until self-hosted brand fonts are introduced in Milestone 9.

---

## Repository map

| Path | Purpose |
| --- | --- |
| `src/app/` | Composition root, router, shell, navigation metadata, and error boundaries |
| `src/pages/` | Route-level pages and deliberate feature placeholders |
| `src/components/ui/` | Reusable interface primitives with no domain knowledge |
| `src/components/layout/` | Brand, sidebar, header, navigation, and mobile drawer |
| `src/lib/` | Generic utilities |
| `src/styles/` | Design tokens and global base styles |
| `src/test/` | Test setup, memory-router helper, fake-indexeddb storage harness, and fixtures |
| `src/features/` | Recipient, gift, and dashboard cards, dialogs, page-data hooks, and feature styles |
| `src/domain/` | Branded entities, Zod schemas, money/date/locale utilities, and typed errors |
| `src/storage/` | Dexie schema, initialization, repositories, migration harness, health, and reset |
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
| 6 | Idea Bank and Shopping List | Not started |
| 7 | Search, filters, recipient details | Not started |
| 8 | Seasons, archives, backup, CSV | Not started |
| 9 | Professional UI, themes, accessibility | Not started |
| 10 | Offline delivery | Not started |
| 11 | Online edition and sync | Not started |
| 12 | QA, packaging, Etsy launch | Not started |

Milestone 5 is complete and verified. Milestone 6 — Idea Bank and Shopping List — begins only after owner review and authorization.

---

## Data, privacy, and offline status

- **Storage:** a version-1 local IndexedDB database stores the active season, its optional overall budget, recipients, and gifts. Startup creates settings and diagnostics only when needed; it never creates a season, seeds sample data, or deletes records. A season exists only after an explicit first-season setup action.
- **Calculations:** season budget, planned, actual, remaining, and unallocated figures, recipient metrics, progress, chart series, data-quality findings, and the countdown are derived from saved records through pure domain functions. No totals are stored. Unbought gifts do not count as spent, and a bought gift without an actual cost contributes zero.
- **Backup and reset:** a tested explicit reset API requires the confirmation `DELETE` and preserves `databaseId`; it has no UI and is never called automatically. Backup/restore and CSV export are not implemented.
- **Accounts and sync:** not implemented.
- **Analytics/telemetry:** none.
- **Browser storage risk:** the app does not call `navigator.storage.persist()` yet. Browser cleanup or site-data clearing can remove local records. The current UI does not claim protection from eviction; persistence timing and buyer-facing explanation remain open for a later milestone.
- **Offline delivery:** not built or verified. The intended launch edition is an installable offline-first PWA, with the actual artifact validated in Milestone 10. A raw `file://` HTML file is not assumed to persist data and will not be advertised without passing the browser test matrix.
- **Customer data:** entered season, budget, recipient, and gift data stays in the browser profile. No names, addresses, notes, or diagnostics are transmitted. Diagnostic health reports contain counts, codes, and storage estimates only.

The interface copy is intentionally conservative until backup and offline behavior are implemented and tested.

---

## Current next step

1. Owner reviews `docs/MILESTONE_5_REPORT.md` and the running budget dashboard.
2. Owner authorizes Milestone 6 — Idea Bank and Shopping List.
3. Milestone 6 must use the existing repositories and domain rules, and must not bypass validation or create sample data.

Until authorized: **do not start Milestone 6.**

---

## License and distribution

This is intended to be a commercial digital product. Licensing, Etsy distribution terms, and support terms are to be finalized before the release milestone. Do not redistribute the source without the owner’s permission.
