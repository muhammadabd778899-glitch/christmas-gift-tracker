# Christmas Gift Tracker

A local-first Christmas gift planning application: recipients, gifts, budgets, ideas, shopping lists, seasons, backups, and offline use.

> **Status: Milestone 0 — specification complete, awaiting approval.**
> There is no runnable application yet. Application code starts in Milestone 1, after the specification is approved.

---

## What this repository contains

| Path | Purpose |
| --- | --- |
| `docs/PRODUCT_SPEC.md` | Product definition, scope, pages, business rules, privacy, claims guardrails |
| `docs/ARCHITECTURE.md` | Stack, layering, folder structure, storage design, offline strategy, testing, risks |
| `docs/DATA_MODEL.md` | Entities, fields, invariants, calculations, IndexedDB schema, migrations, backup/CSV formats |
| `docs/ACCEPTANCE_CRITERIA.md` | Testable completion criteria for every milestone |
| `docs/DECISIONS.md` | Architecture decisions, assumptions, open owner decisions |
| `docs/IMPLEMENTATION_PLAN.md` | Milestone sequence, gates, status, Git checkpoints |
| `docs/MILESTONE_0_REPORT.md` | Completion report for the specification milestone |
| `AI_DEVELOPMENT_PROTOCOL.md` | Rules for how the AI agent works on this project |

**Reading order for a new session:** protocol → product spec → architecture → data model → acceptance criteria → decisions → implementation plan.

---

## Product in one paragraph

Customers plan Christmas gifts for family, friends, and colleagues, track planned and actual spending, move gift ideas into a real shopping list, reuse the product across years with seasons and archives, and protect their data with complete backups. The launch edition is account-free and offline-first. An online edition with accounts and synchronization is a later, separate milestone.

**Important:** the offline edition is an installable offline-first web application (PWA), with the exact delivery method validated in Milestone 10. A raw HTML file opened from `file://` is **not** assumed to persist data reliably and will not be advertised as such without passing the browser test matrix.

---

## Planned technology

- React 19 + TypeScript
- Vite
- IndexedDB via Dexie 4
- React Router
- Zod, React Hook Form
- Recharts
- CSS Modules with design tokens
- Vitest, Testing Library, fake-indexeddb
- Playwright
- `vite-plugin-pwa`

Nothing is installed yet. Dependency choices and rationale are in `docs/ARCHITECTURE.md` §3 and `docs/DECISIONS.md`.

---

## Milestones

| # | Milestone | Status |
| --- | --- | --- |
| 0 | Specification | Complete — awaiting approval |
| 1 | Foundation and shell | Not started |
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

Do not start a milestone without owner authorization.

---

## Development commands

Available after Milestone 1 scaffolding:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
npm run test:e2e
```

The exact scripts will be confirmed in Milestone 1 and documented here.

---

## Current next step

1. Review the specification and decisions — start with `docs/PRODUCT_SPEC.md` §20 (the seven review questions), then offline delivery (D-011/O-1), the budget model, status rules, and deletion behavior.
2. Approve or override the open decisions.
3. Commit/tag the specification.
4. Authorize Milestone 1.

Until then, no application code should be written.

---

## License and distribution

This is intended to be a commercial digital product. Licensing, Etsy distribution terms, and support terms are to be finalized before the release milestone. Do not redistribute the source without the owner’s permission.
