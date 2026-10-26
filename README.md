# Christmas Gift Tracker

A local-first Christmas gift planning application: recipients, gifts, budgets, ideas, shopping lists, seasons, backups, and offline use.

> **Status: Milestone 1 — application foundation complete and verified.**
> The shell is runnable, responsive, and tested. It does **not** create, store, or transmit customer data yet. Milestone 2 has not started.

---

## What works today

- A React + TypeScript + Vite application with a locked dependency tree.
- Seven working destinations: Dashboard, Gifts, Recipients, Idea Bank, Shopping List, Archives, and Settings.
- A responsive application shell with a desktop sidebar, mobile navigation drawer, skip link, and visible focus states.
- Warm design tokens for typography, spacing, surfaces, borders, radii, shadows, and brand/status colors.
- Reusable primitives: Button, IconButton, Input, Select, Card, Badge, Dialog, Table, EmptyState, PageHeader, and error states.
- A desktop header with the product name and an honest season placeholder.
- Route-level and application-level error boundaries, plus a friendly not-found page.
- Seven automated smoke tests covering navigation, every destination, the dialog, the 404 page, and both error boundaries.
- GitHub Actions CI for formatting, type checking, linting, tests, and the production build.

Every feature page is a deliberate placeholder. There are no sample recipients, invented totals, hidden calculations, or fake persistence.

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

Installed for Milestone 1:

- React 19 + TypeScript
- Vite 8
- React Router 7
- Lucide icons
- CSS Modules with design tokens
- Vitest 5, Testing Library, `jsdom`
- ESLint 9, Prettier
- GitHub Actions

Not installed yet — each arrives with the milestone that needs it:

- Dexie 4 and `dexie-react-hooks` (Milestone 2)
- Zod and React Hook Form (Milestones 2–3)
- fake-indexeddb (Milestone 2)
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
| `src/test/` | Test setup and the memory-router render helper |
| `src/features/` | Reserved for feature UI from later milestones |
| `src/domain/` | Reserved for the pure domain layer starting in Milestone 2 |
| `src/storage/` | Reserved for IndexedDB and repositories starting in Milestone 2 |
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
| `AI_DEVELOPMENT_PROTOCOL.md` | Permanent working rules for the AI agent |

**Reading order for a new session:** protocol → product spec → architecture → data model → acceptance criteria → decisions → implementation plan → latest milestone report.

---

## Milestones

| # | Milestone | Status |
| --- | --- | --- |
| 0 | Specification | Complete — approved |
| 1 | Foundation and shell | Complete — verified |
| 2 | Data model and persistent storage | Not started |
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

Do not start Milestone 2 without owner authorization. Its blocking decisions are listed in `docs/DECISIONS.md`.

---

## Data, privacy, and offline status

- **Storage:** not implemented. Refreshing the preview cannot lose planning data because none can be entered.
- **Accounts and sync:** not implemented.
- **Analytics/telemetry:** none.
- **Offline delivery:** not built or verified. The intended launch edition is an installable offline-first PWA, with the actual artifact validated in Milestone 10. A raw `file://` HTML file is not assumed to persist data and will not be advertised without passing the browser test matrix.
- **Customer data:** no customer data is created or transmitted by this build.

The interface copy is intentionally conservative until storage, backup, and offline behavior are implemented and tested.

---

## Current next step

1. Owner reviews `docs/MILESTONE_1_REPORT.md` and the running shell.
2. Owner authorizes Milestone 2.
3. Before Milestone 2 begins, confirm D-002 through D-005, D-018, D-019, O-3, O-7, and O-8 in `docs/DECISIONS.md`.

Until authorized: **do not start Milestone 2.**

---

## License and distribution

This is intended to be a commercial digital product. Licensing, Etsy distribution terms, and support terms are to be finalized before the release milestone. Do not redistribute the source without the owner’s permission.
