# Christmas Gift Tracker — Architecture

> Status: Version 0.4 · 2026-10-28 · Milestone 4 gifts and safe deletion recorded
> Companion to `docs/PRODUCT_SPEC.md` and `docs/DATA_MODEL.md`. The shell, version-1 storage, recipient workflow, and gift workflow now exist; later sections remain target architecture.

---

## 1. Architectural goals

1. **Local-first.** Every core operation reads and writes local data. No API call is required to plan a gift, calculate a budget, or export a backup.
2. **One set of business rules.** Calculations and validation live in a pure domain layer used by every screen and by import/export.
3. **One product, two editions.** The offline edition is the foundation. The online edition later wraps the same domain and UI with authentication and cloud sync.
4. **Data safety over convenience.** Transactions, validation, explicit destructive actions, and tested migrations.
5. **A genuinely offline artifact.** The delivered package, not just the dev server, must launch without a network.
6. **Commercial polish.** Responsive, accessible, themeable, and quiet enough to use for an hour.

Non-goals for the launch architecture: SSR, microservices, real-time collaboration, native apps, or a backend dependency for core planning.

---

## 2. System context

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (customer device)                                    │
│                                                              │
│  React UI ──> Domain (pure TS) ──> Storage repositories      │
│      │              │                     │                  │
│      │              └── validation,       ├──> IndexedDB     │
│      │                  calculations      │    (Dexie)       │
│      │                                    └──> Backup / CSV  │
│      └── styles, routes, charts                              │
│                                                              │
│  Service worker: precached app shell and assets              │
└──────────────────────────────────────────────────────────────┘

Offline edition: no server calls for core features.
Online edition (V2): adds Auth + Postgres + sync adapter; local DB remains the working copy.
```

External services at launch: none required. Optional static hosting for initial PWA installation. No fonts, scripts, icons, or analytics loaded from third parties at runtime.

---

## 3. Technology stack

| Concern | Choice | Rationale |
| --- | --- | --- |
| UI | React 19 + TypeScript | Mature ecosystem, strong typing, broad component knowledge |
| Build | Vite | Fast dev server, static production build, first-class PWA plugin |
| Persistence | IndexedDB via Dexie 4 | Versioned migrations, transactions, compound indexes, live queries |
| Reactive data | Dexie `liveQuery` through a typed `useLiveQueryState` | Dashboard and lists update automatically with explicit loading and error states; no separate hooks package or bespoke event bus (D-025) |
| Routing | React Router | Standard client routing, lazy routes, error boundaries |
| Validation | Zod | One schema source for forms, storage writes, and backup import |
| Forms | Shared React state + Zod schemas | Small forms stay explicit, avoid another dependency, and reuse the same validation as storage. Revisit React Hook Form only if form complexity grows |
| Charts | Recharts | Declarative, responsive, accessible table fallback possible |
| Icons | Lucide React | Tree-shakeable SVGs bundled locally, no icon CDN |
| Styling | CSS Modules + CSS custom properties | Design tokens, no runtime CSS-in-JS, no utility-framework lock-in |
| Unit/integration tests | Vitest + Testing Library + `fake-indexeddb` | Fast, jsdom-based, storage-realistic |
| Browser tests | Playwright | Real workflows, offline emulation, viewports, print media |
| Offline | `vite-plugin-pwa` (Workbox) | Precaching, update flow, SPA navigation fallback |
| Lint/format | ESLint + typescript-eslint + jsx-a11y, Prettier | Consistency and accessibility checks |
| CI | GitHub Actions | Repeatable verification from Milestone 1 onward |

### Rejected or deferred

- **Raw IndexedDB / `idb`:** more custom migration and reactivity code, higher defect risk.
- **localStorage as primary storage:** small synchronous store, no structured transactions; it is used only for the theme pre-paint mirror.
- **Redux/Zustand:** unnecessary; live queries plus local form state cover the needs.
- **Tailwind:** no hard requirement; tokens + CSS Modules keep the bundle and design system explicit. Revisit only if velocity suffers.
- **date-fns / dayjs:** native `Intl` plus ~100 lines of date helpers is sufficient and removes a dependency.
- **Cloud backend now:** deferred to Milestone 11; not needed to validate the product.
- **Desktop wrapper / Electron / Tauri:** evaluate in Milestone 10 only if standalone file delivery is required and PWA is insufficient.

Dependency policy: pin with a lockfile, avoid CDN/runtime remote assets, review licenses before packaging, and do not add a dependency for a single trivial function.

---

## 4. Layering and dependency rules

```
app/          composition root, router, providers, layout, boundaries
pages/        route-level containers; read route params, compose features
features/     feature UI + hooks (forms, dialogs, tables, filters)
components/   reusable UI primitives and layout (no domain knowledge)
domain/       entities, schemas, money, dates, calculations, rules (pure)
storage/      Dexie schema, migrations, repositories, backup, CSV, health
lib/          generic utilities (download, ids, result, sorting)
styles/       tokens, global CSS, print CSS
test/         setup, fixtures, builders
```

**Allowed dependency direction:** `app → pages → features → components/domain`; `features → storage`; `storage → domain`; `domain → lib` only for generic primitives. `components/ui` imports no storage or domain logic.

Forbidden:

- Domain importing React, Dexie, or browser storage.
- Components calculating totals independently.
- Storage writing unvalidated objects.
- Pages importing the Dexie instance directly (use repositories/hooks).

The domain is the only place where budget formulas, status transitions, and validation rules live. Storage orchestrates persistence; features orchestrate interaction.

---

## 5. Proposed folder structure

```
christmas-gift-tracker/
├── docs/                          # Approved specifications and plans
├── e2e/                           # Playwright specs and fixtures
├── public/                        # Static icons, manifest inputs, no remote assets
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers/
│   │   ├── layout/                # Shell, sidebar, mobile nav, header
│   │   └── boundaries/            # App/route error boundaries
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── gifts/
│   │   ├── recipients/
│   │   ├── ideas/
│   │   ├── shopping/
│   │   ├── seasons/
│   │   ├── settings/
│   │   ├── onboarding/
│   │   ├── recovery/
│   │   └── not-found/
│   ├── features/
│   │   ├── dashboard/
│   │   ├── gifts/
│   │   ├── recipients/
│   │   ├── ideas/
│   │   ├── shopping/
│   │   ├── seasons/
│   │   ├── settings/
│   │   ├── backup/
│   │   └── onboarding/
│   ├── components/
│   │   ├── ui/                    # Button, Input, Dialog, Table, Badge, ...
│   │   ├── layout/
│   │   └── charts/
│   ├── domain/
│   │   ├── entities.ts
│   │   ├── schemas.ts
│   │   ├── money.ts
│   │   ├── dates.ts
│   │   ├── locale.ts
│   │   ├── errors.ts
│   │   ├── calculations/         # Pure derived summaries (recipient metrics now; season totals in M5)
│   │   └── rules/                # as feature rules arrive
│   ├── storage/
│   │   ├── db.ts
│   │   ├── defaults.ts
│   │   ├── initialize.ts
│   │   ├── errors.ts
│   │   ├── migrations.ts
│   │   ├── health.ts
│   │   ├── reset.ts
│   │   ├── repositories/
│   │   ├── backup/               # Milestone 8
│   │   ├── csv/                  # Milestone 8
│   │   └── sample/               # Milestone 8
│   ├── lib/
│   ├── styles/
│   ├── test/
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── eslint.config.js
└── README.md
```

Folders are created only when their milestone needs them. Empty scaffolding is allowed only if it does not fake behavior.

---

## 6. Domain design

### 6.1 Pure modules

- `entities.ts` — branded ID types and entity interfaces (`docs/DATA_MODEL.md` §3).
- `schemas.ts` — Zod schemas mirroring entity and input rules; used by forms, repositories, and import.
- `money.ts` — parse input to minor units, format minor units, safe integer checks, currency metadata.
- `dates.ts` — date-only parsing/validation, local today, calendar-day difference, timestamp helpers, formatting.
- `calculations/` — season totals, recipient metrics, progress, chart series, countdown, data-quality findings.
- `rules/` — status transition checks, deletion policies, conversion preconditions, season lifecycle invariants.
- `errors.ts` — typed error classes/codes.

### 6.2 Contract

- Functions are synchronous, deterministic, and free of side effects/I/O.
- Inputs are validated at boundaries; calculation functions accept well-typed records and may still assert invariants.
- Results use explicit `null` semantics from the data model; no `NaN`, no `Infinity`, no accidental `0` for "not set".
- Every public calculation has unit tests with fixtures.

### 6.3 Selectors

A page loads records for one season via live queries and passes them to domain selectors:

```
const { gifts, recipients } = useSeasonData(activeSeasonId);
const summary = calculateSeasonSummary(season, gifts);
const recipientRows = calculateRecipientMetrics(recipients, gifts);
const chart = buildBudgetActualSeries(recipientRows);
```

Selectors are memoized by React (`useMemo`) where records are stable; the domain itself stays pure.

---

## 7. Storage design

### 7.1 Initialization sequence

Implemented in `src/main.tsx` and `src/storage/initialize.ts`:

1. Render a branded boot screen before the router loads.
2. Dynamically load the storage entry point, then open the Dexie database.
3. Dexie runs pending schema upgrades. A failed upgrade aborts; the app never clears or recreates the database.
4. Read an existing settings singleton. Create defaults **only if absent**; validate but never overwrite existing settings.
5. Read `databaseId`, or generate one when meta is genuinely absent. Invalid identity data is reported, not replaced.
6. Write/update diagnostics: `schemaVersion`, `databaseId`, `appVersion`, and `lastOpenedAt`.
7. Render the application only after initialization succeeds. On failure, render `StorageRecoveryPage` with recovery guidance outside the router.
8. Never create a season, seed sample data, or delete records during startup.

Routing to `/onboarding` is available in Milestone 3, but it is a normal route reached from explicit links. Startup does not redirect, choose a season, or create one. The recovery screen remains deliberately outside the router so a router render cannot mask a storage failure.

### 7.2 Repositories

Repositories are the only code that touches Dexie. They:

- Accept validated domain inputs.
- Open a transaction for writes.
- Re-check preconditions inside the transaction.
- Set timestamps consistently.
- Return stored entities.
- Throw typed errors.

Bulk operations (restore, season delete, recipient cascade, conversion) are single transactions across all affected stores.

### 7.3 Live data

- **Implemented in Milestone 3:** a typed `useLiveQueryState` wraps Dexie's `liveQuery`, returning explicit `loading`, `data`, and `error` states. Pages consume repositories through `StorageProvider`; they never import the Dexie instance directly.
- Queries are scoped by the active season and re-run after writes.
- Recipient cards re-render after create, edit, reassign, and cascade deletion without a manual reload.
- Gift rows and recipient summaries re-render after gift create, edit, status changes, and deletion through repository writes.
- A gift's status dates follow its boolean states: the quick status controls default a newly set state to the local date, and the edit form can change or clear each optional date.
- A settings/active-season hook exposes the selected season and formatting preferences.
- No duplicate in-memory copy of records; query results are the source for rendering.
- Cross-tab updates are expected through Dexie's change events. This has not been added to the browser test matrix yet, and the current milestone makes no cross-tab guarantee.
- External raw IndexedDB writes are not a supported integration path. Only repository writes are verified to refresh the UI.

### 7.4 Settings and theme

- Settings live in IndexedDB (authoritative).
- A small `localStorage` mirror stores only `theme` for pre-paint application and is treated as a cache; on mismatch, the IndexedDB value wins after load.
- `data-theme="light|dark"` on `<html>` drives CSS custom properties; `system` follows `prefers-color-scheme` and updates live.
- No flash of the wrong theme on reload.

### 7.5 Storage persistence and health

- **Deferred:** request `navigator.storage.persist()` during onboarding or after the first save, explain the result, and never block the workflow. Milestone 4 does **not** call it. Persistence timing and the buyer-facing explanation remain open.
- Settings → Diagnostics is planned: `healthCheck()` exists in the storage layer and can produce a PII-free report, but the Settings diagnostics UI does not exist yet.
- Quota errors are caught and surfaced with backup guidance.
- The app never clears storage on its own.

Milestone 3 implements seasons and recipients on top of the health engine. Milestone 4 adds gifts and the status rules above. Neither milestone adds a persistence request, diagnostics UI, backup, or eviction protection. Browser cleanup can still remove local records, and the interface does not claim otherwise.

Milestone 4 keeps gift status changes behind repository validation. The row quick controls use `setPurchaseState`, which rejects wrapped or sent without bought and defaults a newly set date. Un-buying through the row requires an explicit confirmation dialog; the edit form uses an inline confirmation and clears all dependent states and dates only after acceptance. Gift deletion runs in one transaction and reopens a converted idea when a source link exists.

Milestone 2 implements the health engine (`src/storage/health.ts`) but not the Settings diagnostics UI. It returns typed counts, storage estimate/persistence fields, and stable issue codes without names, addresses, or notes. It performs reads only.

### 7.6 Explicit reset and error contract

- `resetAllData('DELETE')` is the only full-reset path. It is not called by startup or recovery.
- Reset clears planning stores and meta, then recreates default settings and four diagnostics records. `databaseId` is preserved so the local database keeps its identity.
- Reset is transactional. A wrong or partial confirmation raises `ValidationError` before any deletion.
- Storage failures map to typed `AppError` subclasses: validation, not found, conflict, storage unavailable, quota exceeded, migration, import/export.
- Dexie may wrap an error thrown inside a transaction. The mapper follows `cause`, `inner`, and aggregate `errors` so the original typed error reaches the UI and tests.
- The recovery screen offers reload and guidance only. It never offers “clear data”.

---

## 8. UI architecture

### 8.1 Composition

- Route-level pages are thin: resolve the active season, fetch data, render feature components.
- Feature modules own forms, dialogs, and feature-specific tables.
- UI primitives are domain-agnostic, keyboard-accessible, and theme-token driven.
- A single dialog primitive handles focus trap, Escape, labelled titles, destructive emphasis, and focus restoration.
- Inline notices and shared error states handle routine confirmations and failures. A dedicated toast/announcer remains deferred.

### 8.2 Routing

- `BrowserRouter` with static-host SPA fallback (and the PWA navigation fallback for offline).
- Lazy-load heavy routes/charts to keep initial load small.
- Route-level error boundary with retry and a link home.
- Unknown routes render the not-found page.
- No active season: data pages render a season-empty state without redirect loops.
- Archived season: editing actions disabled and explained; data remains viewable.

### 8.3 Forms

- Milestone 3 and 4 forms use typed local React state, visible labels, inline errors, and the shared Zod rules. Submissions call repositories; the repository validates again before writing.
- Money inputs use `inputMode="decimal"`, keep raw text in form state, and parse at submit via `money.ts`.
- Status toggles enforce transitions in the UI and re-check in the repository.
- Destructive dialogs require an explicit action and, where specified, typed confirmation.
- Unsaved-changes prompting is not implemented yet; dialogs close on explicit cancel and do not save partial values.

### 8.4 Tables and mobile

- Semantic `<table>` on desktop with sortable headers and accessible labels.
- At narrow widths, rows become cards or a horizontally scrollable region with a visible affordance; the page itself never scrolls horizontally.
- Sticky action columns are avoided; actions are reachable via a menu.
- Print CSS hides navigation, filters, and controls.

### 8.5 Charts and accessibility

- Recharts with explicit text labels/tooltips and a color-independent pattern or direct labels.
- Each chart has a visually hidden or expandable data table equivalent.
- Status uses text + icon + color; never color alone.
- Focus rings are visible in both themes; motion respects `prefers-reduced-motion`.

### 8.6 Design tokens

CSS custom properties for:

- Surfaces: warm ivory, elevated card, muted panel.
- Brand: deep evergreen, muted burgundy, soft gold.
- Text: primary, secondary, inverse.
- Borders, shadows, radii, spacing scale, type scale, status colors.
- Dark theme overrides under `[data-theme='dark']`.
- Print overrides under `@media print`.

Tokens are defined in Milestone 1 and refined in Milestone 9; components never hardcode raw colors.

---

## 9. Error handling and resilience

- Typed errors from domain/storage; mapping to user-facing copy in a single error presenter.
- Route error boundary catches render failures without destroying stored data.
- Storage initialization failure shows a blocking recovery page, not a broken shell.
- Import errors list actionable problems and make zero changes.
- Network failures are irrelevant at launch; in the online edition they map to sync-status messages and queued work.
- Console errors are treated as defects; the release check includes “no unexpected console errors”.
- No retry loop that could duplicate writes. Conversion and restore are idempotent by design.

---

## 10. Offline architecture (Milestone 10)

### 10.1 PWA baseline

- `vite-plugin-pwa` with `registerType: 'prompt'` (never silently reload).
- Precache the built HTML, JS, CSS, fonts, icons, and manifest.
- SPA navigation fallback to `index.html`.
- No runtime caching of third-party origins; there are none.
- Update flow: detect a waiting service worker, show "A new version is ready", let the user reload when safe.
- Register the service worker only in production builds to avoid dev-server confusion.

### 10.2 Data

- IndexedDB is independent of the service worker and works offline.
- Request persistent storage where supported; explain browser eviction and the backup habit.
- Clearing site data deletes records; the UI warns and recommends backups.

### 10.3 Delivery validation

Milestone 10 must test the actual artifact:

1. Install or load the PWA per documented steps.
2. Disable the network.
3. Launch/reload.
4. Create and edit records.
5. Verify dashboard, search, ideas, shopping, archives, backup, and CSV offline.
6. Restart the browser and confirm persistence.
7. Repeat in Chrome/Edge, Firefox, and Safari (including iOS if available).
8. Evaluate a standalone `file://` build and record the result honestly.

If a self-contained HTML file cannot persist data reliably, it is not shipped as the offline edition without an approved alternative (thin launcher/desktop wrapper). The listing copy is updated to match.

### 10.4 Online/offline indicator

- Offline edition: a subtle "Saved on this device" status is sufficient; connectivity is not required.
- Online edition: show "Synced / Offline — changes queued / Sync error" with details.
- Never claim data is synced when it is not.

---

## 11. Security and privacy architecture

- Static client application; no server secrets.
- No third-party scripts, fonts, or analytics at runtime.
- Strict URL validation before storing or rendering links; `rel="noopener noreferrer"` on external links.
- No `dangerouslySetInnerHTML` for user content.
- Content Security Policy compatible build; add a restrictive CSP via hosting headers in Milestone 10/12 (and document limitations of `file://`).
- Backup and CSV downloads are generated client-side via Blob URLs.
- Backups are unencrypted at launch and clearly labeled as sensitive.
- Privacy copy is part of Settings, not buried in a README.
- Dependency audit and license review before packaging.
- Online edition (V2): server-side authorization and Row Level Security; never trust client-provided `user_id`.

---

## 12. Testing architecture

### 12.1 Pyramid

| Layer | Tool | Coverage focus |
| --- | --- | --- |
| Unit | Vitest | money, dates, calculations, validation, status rules, CSV escaping |
| Integration | Vitest + fake-indexeddb | repositories, transactions, migrations, conversion, cascades, backup round-trip, archive isolation |
| Component | Testing Library | forms, validation messages, dialogs, filters, status toggles, empty states |
| E2E | Playwright | onboarding, CRUD, dashboard math, idea conversion, shopping print, search, seasons, backup/restore, offline, mobile |
| Manual | Real browsers | PWA installation, storage persistence, iOS/Safari caveats, file:// spike, accessibility review |

### 12.2 Test data

- Builders/factories for entities with deterministic defaults.
- Fixed fixtures for calculations, including boundary cases from `DATA_MODEL.md` §7.8.
- Disposable test databases; tests never touch a developer's real browser data.
- Backup fixtures for valid, malformed, older, newer, and malicious-ish files.

### 12.3 Quality gates per milestone

```
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e    # once Playwright exists
```

A milestone is not complete if any required check fails. “It builds” is not proof of behavior; “it launches” is not proof of a production build.

### 12.4 CI

GitHub Actions from Milestone 1: install with a locked lockfile, typecheck, lint, unit/integration tests, build. Playwright remains deferred and no end-to-end suite runs yet. CI must not require secrets for the offline edition.

---

## 13. Build and release

- `npm run dev` — local development.
- `npm run build` — `tsc --noEmit` (or project build) then Vite production build.
- `npm run preview` — serve the production build for verification.
- `npm run test`, `npm run test:coverage`, `npm run test:e2e`.
- Output in `dist/`; source maps evaluated for size/privacy before release.
- Static hosting with HTTPS, SPA fallback, correct MIME types, and cache headers for hashed assets.
- Version shown in Settings and embedded in the build; backup envelope records `appVersion`.
- Release checklist in Milestone 12 covers artifact testing, packaging, PDFs, and listing claims.
- Git tags/checkpoints per milestone; never force-push or reset destructive work without owner approval.

---

## 14. Future online edition (Milestone 11 boundaries)

### 14.1 Recommended backend

Supabase (managed PostgreSQL, Auth, Row Level Security) for the first online release:

- Email/password auth plus password recovery.
- One row per entity, scoped by `user_id`.
- RLS policies on every table; no cross-account reads/writes.
- No service-role key in the client.
- Account deletion and data export implemented server-side or via a secured function.

Alternative: a small custom API with Postgres and an auth provider, if Supabase constraints prove unsuitable. The domain layer remains unchanged either way.

### 14.2 Sync design constraints

- Stable UUIDs and `updatedAt` already exist.
- Local DB remains authoritative for offline work; a sync engine pushes/pulls changes.
- Add a local outbox and tombstones (migration) for pending creates/updates/deletes.
- Per-record optimistic concurrency: detect server revision changes and surface conflicts; never silently overwrite.
- Duplicate prevention by primary key and idempotent operations.
- Sync status is visible; failures are actionable and retryable.
- Full-database sync between unrelated accounts is prohibited.
- The offline build must continue to function without auth or cloud access.

### 14.3 Code boundaries

- Domain stays pure and shared.
- A cloud adapter implements the same repository contract semantics for sync; UI does not call Supabase directly.
- Build-time edition flag excludes auth/sync code from the offline bundle where practical.
- Shared components remain edition-agnostic.

---

## 15. Browser support and constraints

| Browser | Supported | Notes |
| --- | --- | --- |
| Chrome / Edge (desktop, Android) | Current and previous major | Best PWA install and persistent storage behavior |
| Firefox (desktop, Android) | Current and previous major | PWA install UX differs; offline via service worker works; persistence support varies |
| Safari 16.4+ (macOS, iOS/iPadOS) | Supported with caveats | Add to Home Screen recommended; storage eviction risk for unused sites; test IndexedDB persistence carefully |
| Internet Explorer | Not supported | — |
| `file://` HTML | Not promised | IndexedDB/service-worker behavior is inconsistent; only ship if Milestone 10 proves it |

Required platform features: IndexedDB, service workers, `crypto.randomUUID`, ES2022, CSS custom properties, `Intl`. Feature detection shows a clear incompatibility message rather than failing silently.

---

## 16. Performance targets

- Initial route interactive < 2 s on a mid-range laptop, < 4 s on a mid-range phone (cold, cached assets).
- Dashboard and gift list < 1 s for 100 gifts / 30 recipients.
- Operations < 100 ms for typical datasets.
- Bundle discipline: lazy-load Recharts and non-dashboard routes; avoid duplicate icon imports; self-hosted font subsets only.
- Queries scoped by season and indexed; no full-database scans on navigation.
- Charts render at most the active season's recipients; table animation is minimal.
- If datasets exceed 250 gifts, introduce pagination/virtualization only with measured need; the launch target is 100.

---

## 17. Risks and mitigations

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Offline delivery promise exceeds browser reality | High | Medium | Milestone 10 spike; test the artifact; PWA-first copy; consider wrapper only if needed |
| IndexedDB eviction/data loss | High | Medium | Persistent storage request, backups, clear warnings, export before destructive actions |
| `file://` storage inconsistency | High | High if attempted | Do not advertise until tested; prefer hosted PWA |
| Migration bug corrupts data | High | Low–Medium | Versioned migrations, fixtures, transactional upgrades, recovery mode, no auto-reset |
| Money/rounding errors | High | Medium | Integer minor units, centralized parsing/formatting, boundary tests |
| Calculation drift between screens | Medium | Medium | Single domain module; no totals in components or storage |
| Archive leakage into current totals | High | Low | Season-scoped queries and explicit archived-season tests |
| iOS storage eviction | High | Medium | Document; recommend install + backups; avoid promising permanence |
| Sync conflicts (V2) | High | High | Deferred; conservative conflict surfacing design before implementation |
| Accessibility regressions | Medium | Medium | jsx-a11y, keyboard tests, manual audit in Milestone 9 |
| Scope creep | High | High | Milestone gates, protocol, owner approval, no auto-advance |
| Third-party dependency risk | Medium | Low–Medium | Minimal pinned dependencies, no CDN, license review, audit |
| Etsy package/file-size limits | Medium | Low | Verify current limits before packaging; keep instructions light; avoid bundling source |
| Backup privacy leak | High | Medium | Warnings, CSV opt-in for notes/addresses, no cloud in offline edition |

---

## 18. Architecture decision references

| Topic | Decision ID |
| --- | --- |
| Stack | D-001 |
| Local-first | D-002 |
| Dexie | D-003 |
| Money | D-004 |
| Season scoping | D-005 |
| Status model | D-006 |
| Deletion | D-007 |
| Conversion | D-008 |
| Archives read-only | D-009 |
| Replace-all restore | D-010 |
| PWA-first offline | D-011 |
| Supabase for V2 | D-012 |
| No runtime CDN | D-013 |
| Testing gates | D-014 |
| Currency scaling | D-015 |
| Sample isolation | D-016 |
| Theme pre-paint mirror | D-017 |
| Zero active seasons | D-018 |
| `sourceIdeaId` omission | D-019 |
| Gift requires recipient | D-020 |
| Countdown calendar days | D-021 |
| No offline telemetry | D-022 |
| CSV privacy defaults | D-023 |
| Wrapped progress denominator | D-024 |
| Typed liveQuery hook | D-025 |

The full rationale and open questions are in `docs/DECISIONS.md`.

---

## 19. Milestone 1 implementation boundaries

Milestone 1 creates the runnable shell only:

- Vite/React/TypeScript setup, scripts, lint, format, tests.
- Folder structure and design tokens.
- Router, layout, responsive navigation, header with a season placeholder.
- Reusable primitives: Button, Input, Select, Card, Badge, Dialog, Table, EmptyState, Toast region, PageHeader.
- Route placeholders that state what will be built later.
- Not-found and app-level error boundaries.
- README with setup and commands.

Milestone 1 must **not** invent storage, calculations, or fake user data. Pages stay honest placeholders until their milestone. The placeholder season label must not masquerade as persisted data.

---

## 20. Milestone 2 implementation boundaries

Milestone 2 implements the storage foundation only:

- Branded entity types, Zod schemas, money and date utilities, locale helpers, and typed errors in `src/domain`.
- Dexie version 1 with the stores and indexes from `DATA_MODEL.md` §4.2.
- Typed repositories for seasons, settings, recipients, gifts, ideas, data health, and explicit reset.
- Cross-season checks, recipient reassignment/cascade policies, gift/idea integrity, and transactional multi-record operations.
- Settings/meta initialization, a generic data-migration harness, storage health, and explicit reset.
- `fake-indexeddb` integration tests, boot screen, and a recovery screen.
- Documentation and status copy updates.

Milestone 2 does **not** implement season onboarding, management screens, dashboard data, backup/restore UI, CSV export, sample-data UI, themes, PWA, or an installable offline package. Pages remain honest about those gaps. No sample season is loaded and startup never chooses a season on the customer's behalf.

---

## 21. Milestone 3 implementation boundaries

Milestone 3 implements the first usable planning workflow:

- A minimal `/onboarding` page for season name, holiday date, and optional overall budget.
- A dashboard that distinguishes loading, error, no-season, active-season, and archived-season states.
- Recipient cards, create/edit dialogs, optional cap/relationship/notes, duplicate names, and validation.
- Derived planned, spent, remaining-cap, and utilization metrics from gift records through pure domain functions.
- Delete-with-policy dialogs for no gifts, reassignment, and explicit cascade deletion with typed confirmation.
- Archived-season recipient views that are read-only and explanatory.
- Repository access through `StorageProvider`, plus a typed `useLiveQueryState` and active-season hook.
- Component/integration coverage with StrictMode, a stable async-test timeout, and `fake-indexeddb`.

Milestone 3 does **not** implement gift entry, season switching/editing/restoring, archive management, dashboard charts, search, backup/restore, CSV, sample data, themes, persistent-storage requests, service workers, or an offline package. Gifts, ideas, shopping, and archive screens remain honest placeholders.

### 21.1 Known M3 limitations

- Season and recipient data can be removed by browser site-data clearing or storage eviction. No persistence request or backup exists yet.
- Chromium 152 (OpenCode browser) on Windows has been exercised manually; Microsoft Edge 156 opened the production build headlessly. Firefox, Safari, mobile browsers, and cross-tab updates remain unverified.
- Archived behavior is implemented defensively, but the normal archive-selection workflow arrives in Milestone 8.
- At the end of Milestone 3, gift creation was not yet available; gift metrics were verified with seeded records. Milestone 4 adds the customer-facing gift workflow.
- A production chunk-size warning remains. It is not a functional failure and is revisited with route splitting in a later milestone.

---

## 22. Milestone 4 implementation boundaries

Milestone 4 implements gift planning and safe deletion:

- A Gifts page for the active season with a responsive table, an empty state, a no-recipient state, loading skeletons, a storage-error state, and an archived read-only state.
- Gift create, edit, and delete flows. Every gift requires a recipient in the same season.
- Approved fields: name, recipient, category, store, purchase link, planned budget, actual cost, delivery method, delivery address, notes, bought/wrapped/sent flags, and optional dates for those flags.
- Purchase links accept only `http` and `https` URLs. Money accepts documented non-negative decimal formats, rejects extra decimals, and is stored as integer minor units.
- Repository-enforced status invariants: wrapping and sending require a bought gift; direct status changes reject invalid transitions; changing a status clears dependent states and dates when required.
- Quick status controls with busy and error handling. Un-buying from a row opens a confirmation dialog; un-buying in the edit form uses an inline confirmation. Cancelling changes nothing.
- A bought gift without an actual cost is accepted, counts as zero spending, and is visibly flagged as "Cost missing."
- Status dates are displayed in the row and may be cleared independently of their status when editing.
- Gift deletion requires confirmation. Deleting a gift with a source idea reopens that idea in the same transaction.
- Recipient planned, spent, remaining-cap, and utilization summaries update live after gift create, edit, status change, and deletion without a reload.
- A controlled horizontal scroll region keeps the gift table usable at narrow widths without making the page itself scroll horizontally.

Milestone 4 does **not** implement dashboard charts, Idea Bank UI, Shopping List, search or filters, backup/restore, CSV, sample data, archive management, season switching, themes, persistent-storage requests, service workers, or an offline package. Their screens remain honest placeholders.

### 22.1 Known M4 limitations

- Gift data can still be removed by clearing browser site data or by storage eviction. No persistence request, backup, or eviction protection exists.
- Archived-season gift rendering was exercised by directly changing the season status in IndexedDB because archive management remains Milestone 8.
- Interactive browser checks used Chromium 152 in the OpenCode browser. No Firefox, Safari, mobile-device, or cross-tab matrix was run.
- Mobile table behavior was verified at a 390 CSS-pixel iframe viewport by measuring the page and scroll-container widths, not on a physical device.
- No Playwright suite exists. Criteria that specify E2E verification were verified manually in the production preview; that substitution is disclosed in `MILESTONE_4_REPORT.md`.
- A production chunk-size warning remains because the main JavaScript chunk exceeds 500 kB.
- The gift table does not yet support sorting, filtering, or search. Those arrive in Milestone 7.
