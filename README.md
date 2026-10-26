# Christmas Gift Tracker

A local-first Christmas gift planning application: recipients, gifts, budgets, ideas, shopping lists, seasons, backups, and offline use.

> **Status: Milestone 2 — data model and persistent storage complete and verified.**
> The shell is runnable, responsive, and tested. A private local IndexedDB database is initialized safely, but there are **no data-entry screens yet**. No customer plan or sample records are created, and nothing is transmitted.

---

## What works today

- A React + TypeScript + Vite application with a locked dependency tree.
- Seven working destinations: Dashboard, Gifts, Recipients, Idea Bank, Shopping List, Archives, and Settings.
- A responsive application shell with a desktop sidebar, mobile navigation drawer, skip link, and visible focus states.
- Warm design tokens for typography, spacing, surfaces, borders, radii, shadows, and brand/status colors.
- Reusable primitives: Button, IconButton, Input, Select, Card, Badge, Dialog, Table, EmptyState, PageHeader, and error states.
- A desktop header with the product name and an honest season placeholder.
- Route-level and application-level error boundaries, plus a friendly not-found page.
- A version-1 Dexie/IndexedDB schema with typed validation for seasons, recipients, gifts, ideas, settings, and diagnostics.
- Typed repositories with cross-season checks, transactional recipient policies, idea conversion, gift integrity, and explicit season lifecycle operations.
- Safe startup: settings and meta are created only when absent; startup never creates a season, seeds sample data, or deletes records.
- A boot screen, a storage recovery screen with guidance, a health-check engine, a migration harness, and an explicit `DELETE`-confirmed reset API.
- 90 Vitest tests, including `fake-indexeddb` integration tests for persistence, validation, atomic rollback, health, migration failure, and reset.
- GitHub Actions CI for formatting, type checking, linting, tests, and the production build.

Every feature page is still a deliberate placeholder. There are no sample recipients, invented totals, hidden calculations, or storage-management screens.

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

Installed through Milestone 2:

- React 19 + TypeScript
- Vite 8
- React Router 7
- Lucide icons
- CSS Modules with design tokens
- Dexie 4 for IndexedDB
- Zod 4 for boundary validation
- Vitest 5, Testing Library, `jsdom`, `fake-indexeddb`
- ESLint 9, Prettier
- GitHub Actions

Not installed yet — each arrives with the milestone that needs it:

- `dexie-react-hooks` (when live queries arrive with the first data screens)
- React Hook Form (Milestone 3)
- Recharts (Milestone 5)
- Playwright (Milestone 4, when the first end-to-end workflow exists)
- `vite-plugin-pwa` (Milestone 10)

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
| `src/features/` | Reserved for feature UI from Milestone 3 |
| `src/domain/` | Branded entities, Zod schemas, money/date/locale utilities, and typed errors |
| `src/storage/` | Dexie schema, initialization, repositories, migration harness, health, and reset |
| `e2e/` | Reserved for Playwright tests from Milestone 4 |
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
| `AI_DEVELOPMENT_PROTOCOL.md` | Permanent working rules for the AI agent |

**Reading order for a new session:** protocol → product spec → architecture → data model → acceptance criteria → decisions → implementation plan → latest milestone report.

---

## Milestones

| # | Milestone | Status |
| --- | --- | --- |
| 0 | Specification | Complete — approved |
| 1 | Foundation and shell | Complete — verified |
| 2 | Data model and persistent storage | Complete — verified |
| 3 | Recipients | Not started |
| 4 | Gifts | Not started |
| 5 | Budget engine and dashboard | Not started |
| 6 | Idea Bank and Shopping List | Not started |
| 7 | Search, filters, recipient details | Not started |
| 8 | Seasons, archives, backup, CSV | Not started |
| 9 | Professional UI, themes, accessibility | Not started |
| 10 | Offline delivery | Not started |
| 11 | Online edition and sync | Not started |
| 12 | QA, packaging, Etsy launch | Not started |

Do not start Milestone 3 without owner authorization. Its storage-facing decisions are already accepted; remaining M3 work is UI and first-season setup.

---

## Data, privacy, and offline status

- **Storage:** a version-1 local IndexedDB database is implemented and validated. Startup creates settings and diagnostics only when needed; it never creates a season, seeds sample data, or deletes records. There are no data-entry screens yet, so customers cannot enter plan data through the UI.
- **Backup and reset:** a tested explicit reset API requires the confirmation `DELETE` and preserves `databaseId`; it has no UI and is never called automatically. Backup/restore and CSV export are not implemented.
- **Accounts and sync:** not implemented.
- **Analytics/telemetry:** none.
- **Offline delivery:** not built or verified. The intended launch edition is an installable offline-first PWA, with the actual artifact validated in Milestone 10. A raw `file://` HTML file is not assumed to persist data and will not be advertised without passing the browser test matrix.
- **Customer data:** no customer data is entered, transmitted, or seeded by this build. Diagnostic health reports contain counts, codes, and storage estimates only — no names, addresses, or notes.

The interface copy is intentionally conservative until data screens, backup, and offline behavior are implemented and tested.

---

## Current next step

1. Owner reviews `docs/MILESTONE_2_REPORT.md` and the running storage foundation.
2. Owner authorizes Milestone 3 — recipients and first-season setup.
3. Milestone 3 must use the existing repositories and must not bypass validation or create sample data.

Until authorized: **do not start Milestone 3.**

---

## License and distribution

This is intended to be a commercial digital product. Licensing, Etsy distribution terms, and support terms are to be finalized before the release milestone. Do not redistribute the source without the owner’s permission.
