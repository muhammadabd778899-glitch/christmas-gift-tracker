# Christmas Gift Tracker — Architecture

> Status: Version 0.10 · 2026-10-30 · Milestone 10 offline delivery recorded
> Companion to `docs/PRODUCT_SPEC.md` and `docs/DATA_MODEL.md`. The shell, version-1 storage, recipient, gift, idea, shopping, search/filter, recipient-detail, season/archive, backup/restore, CSV, sample-data, reset, and installable offline PWA workflows now exist; later sections remain target architecture.

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
- **Desktop wrapper / Electron / Tauri:** not built. Milestone 10 validated the PWA as sufficient; O-12 keeps a wrapper out of scope unless a separate owner decision reverses that.

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
│   │   ├── backup.ts              # Milestone 8: export, validate, atomic restore
│   │   ├── csv.ts                 # Milestone 8: RFC 4180 export
│   │   ├── sample.ts              # Milestone 8: isolated sample season
│   │   └── repositories/
│   ├── lib/
│   │   ├── download.ts            # Blob download helper (no network)
│   │   └── ...
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

Bulk operations (restore, season delete, recipient cascade, conversion) are single transactions across all affected stores. Milestone 8 adds `data.exportBackup`, `validateBackup`, `restoreBackup`, `exportCsv`, `loadSampleData`, and `removeSampleData` to the same repository boundary; only `restoreBackup` and reset write across every store, and each does so in one transaction.

### 7.3 Live data

- **Implemented in Milestone 3:** a typed `useLiveQueryState` wraps Dexie's `liveQuery`, returning explicit `loading`, `data`, and `error` states. Pages consume repositories through `StorageProvider`; they never import the Dexie instance directly.
- Queries are scoped by the active season and re-run after writes.
- Recipient cards re-render after create, edit, reassign, and cascade deletion without a manual reload.
- Gift rows and recipient summaries re-render after gift create, edit, status changes, and deletion through repository writes.
- A gift's status dates follow its boolean states: the quick status controls default a newly set state to the local date, and the edit form can change or clear each optional date.
- The dashboard reads the active season, recipients, and gifts through `useDashboardData` and recalculates from live query results after gift or budget writes.
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

- **Deferred:** request `navigator.storage.persist()` during onboarding or after the first save, explain the result, and never block the workflow. Milestones 4–9 do **not** call it. Persistence timing and the buyer-facing explanation remain open.
- Settings → Diagnostics (Milestone 9) renders the existing PII-free `healthCheck()` report: counts, issue codes, storage estimates, persistence status, and app/schema versions. It performs reads only and never repairs or deletes data.
- Quota errors are caught and surfaced with backup guidance.
- The app never clears storage on its own.

Milestone 3 implements seasons and recipients on top of the health engine. Milestone 4 adds gifts and the status rules above. Milestone 5 adds derived dashboard calculations. Milestone 6 adds the Idea Bank and a derived Shopping List. None of these milestones adds a persistence request, diagnostics UI, backup, or eviction protection. Browser cleanup can still remove local records, and the interface does not claim otherwise.

Milestone 4 keeps gift status changes behind repository validation. The row quick controls use `setPurchaseState`, which rejects wrapped or sent without bought and defaults a newly set date. Un-buying through the row requires an explicit confirmation dialog; the edit form uses an inline confirmation and clears all dependent states and dates only after acceptance. Gift deletion runs in one transaction and reopens a converted idea when a source link exists.

Milestone 5 adds a pure dashboard selector layer in `src/domain/calculations/dashboard.ts`. It derives season totals, progress ratios, recipient chart series, data-quality findings, and countdown state from the active season's records. The dashboard never stores these values. The chart module is lazy-loaded, and the countdown checks the local calendar date every minute plus on focus and visibility change. Budget edits go through the existing season repository and appear through `liveQuery` without a reload.

Milestone 6 adds the Idea Bank and Shopping List. `src/domain/calculations/ideas.ts` owns case-insensitive Idea Bank filtering. `src/domain/calculations/shopping.ts` builds the list from unbought gifts, groups stores case-insensitively, places missing stores last, sorts deterministically, and calculates group subtotals and the total. Neither calculation is persisted. Conversion reuses the existing idea repository transaction and the unique `&sourceIdeaId` index, so repeated conversion returns the same gift instead of creating a duplicate. The Shopping List page reads gifts through `liveQuery`; “Mark bought” calls the existing gift repository and refreshes the list and dashboard without a reload. Print output uses `data-print-root` and `data-print-hide` plus global `@media print` rules to show only the print header, groups, rows, and totals; the action controls and app chrome are hidden. The page exposes a browser print action only; it does not create or store a PDF file.

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
- `/seasons` is the season and data-management surface: active-season card, archived list with preview, and backup/CSV/sample/reset tools.
- No active season: data pages render a season-empty state without redirect loops.
- Archived season: editing actions disabled and explained; pages point to `/seasons` for restore.

### 8.3 Forms

- Milestone 3 and 4 forms use typed local React state, visible labels, inline errors, and the shared Zod rules. Submissions call repositories; the repository validates again before writing.
- Money inputs use `inputMode="decimal"`, keep raw text in form state, and parse at submit via `money.ts`.
- Status toggles enforce transitions in the UI and re-check in the repository.
- Destructive dialogs require an explicit action and, where specified, typed confirmation.
- Unsaved-changes prompting is not implemented yet; dialogs close on explicit cancel and do not save partial values.

### 8.4 Tables and mobile

- Semantic `<table>` on desktop with sortable headers and accessible labels.
- At narrow widths, Gifts and Shopping rows become stacked cards with visible `data-label` headings, full-width actions, and 44 px toggle targets (Milestone 9). Other wide tables use a bounded scroll region with a visible affordance.
- Chart data tables shrink their cell padding rather than forcing page-level scrolling; the page itself never scrolls horizontally at 360, 768, 1024, or 1440 px.
- Sticky action columns are avoided; actions are reachable via a menu.
- Print CSS hides navigation, filters, and controls; mobile card rules are scoped to `@media screen`, so print keeps the tabular layout.

### 8.5 Charts and accessibility

- Recharts with explicit text labels/tooltips and a color-independent pattern or direct labels.
- The chart SVG is hidden from assistive technology and Recharts' focusable accessibility layer is disabled. Each chart has an open, accessible data table equivalent with the same numbers.
- Status uses text + icon + color; never color alone.
- Progress indicators expose `role="progressbar"` with an accessible name and value text.
- Focus rings are visible in both themes; motion respects `prefers-reduced-motion`.

### 8.6 Design tokens

CSS custom properties for:

- Surfaces: warm ivory, elevated card, muted panel.
- Brand: deep evergreen, muted burgundy, soft gold.
- Text: primary, secondary, inverse.
- Borders, shadows, radii, spacing scale, type scale, status colors.
- Dark theme overrides under `[data-theme='dark']`, including surfaces, borders, shadows, status tones, focus rings, and chart colors.
- Print overrides under `@media print`.
- Currency and appearance tokens are driven by Settings; format changes never mutate stored minor units (D-015).

Tokens were defined in Milestone 1 and refined in Milestone 9; components never hardcode raw colors.

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

## 10. Offline architecture (implemented in Milestone 10)

### 10.1 PWA baseline

- `vite-plugin-pwa` 2 with `registerType: 'prompt'` and `injectRegister: false`; the app registers through `virtual:pwa-register/react`. It never silently reloads.
- Precache the built HTML, JS, CSS, fonts, icons, and manifest: 21 entries / 1279.74 KiB in the 0.10.0 build, emitted as `sw.js` plus the Workbox runtime.
- SPA navigation fallback to `index.html`; no runtime caching of third-party origins; there are none.
- Update flow: the waiting service worker surfaces a banner with “Reload to update” and “Later.” A reload is refused while any `<dialog open>` exists, so an open form is not discarded. `skipWaiting` and `clientsClaim` stay false until the user consents.
- The service worker is not enabled in the development server; tests and the standalone spike alias the virtual module to a no-op stub.
- `public/icons/` contains 192/512 px PNGs, a maskable 512 px icon, an SVG, and an Apple touch icon; the manifest supplies name, colors, scope, standalone display, and portrait orientation.

### 10.2 Data

- IndexedDB is independent of the service worker and works offline.
- Settings explains browser eviction and offers a user-initiated persistent-storage request (**D-030**). Granted, declined, unsupported, and unavailable results are reported in plain language with backup guidance.
- Clearing site data deletes records; the UI warns and recommends backups. No code path clears or repairs user data automatically.
- Storage-unavailable and quota errors keep the recovery page and now state explicitly that data was not deleted and that a backup should be downloaded before freeing space.

### 10.3 Delivery validation

The actual production artifact was tested, not the development server:

1. Installed/served the built PWA and loaded it once online.
2. Disabled the network through browser protocol emulation.
3. Launched and reloaded while offline.
4. Created and edited seasons, recipients, and gifts offline.
5. Verified dashboard, search/filters, ideas, shopping, archives, backup, and CSV offline.
6. Restarted the browser with the same profile and confirmed the records and cached app remained.
7. Exercised the update flow with a second build, including the open-dialog guard.
8. Built the standalone `file://` spike and recorded the result.

Only Microsoft Edge 156 (Chromium) was available on the test host. Firefox, Safari, iOS/iPadOS, and Android were not tested. The single-file build launched from `file://` and persisted IndexedDB records across reload and browser restart, but `file://` cannot register a service worker; because the required browser matrix is incomplete, the file is **not shipped**. The hosted PWA is the offline edition, and the listing copy states the one-time online visit.

### 10.4 Online/offline indicator

- Offline edition: the footer shows “Saved on this device” while online and “Offline — all data saved on this device” while offline; the wording makes no sync claim.
- Online edition: show “Synced / Offline — changes queued / Sync error” with details.
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
| `file://` HTML | Not shipped | The Milestone 10 spike launched and persisted data in Edge, but service workers are unavailable and Firefox/Safari/iOS were not tested; the file is not the offline edition |

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

---

## 23. Milestone 6 implementation boundaries

Milestone 6 implements the Idea Bank and a derived Shopping List:

- Idea Bank create, edit, delete, list, and case-insensitive search on idea name, recipient, category, and store.
- Converted ideas remain visible with a link to their gift and are excluded from budgets and shopping.
- Conversion copies the idea fields, requires a recipient in the same season when needed, and runs the gift write and idea update in one transaction.
- A unique `&sourceIdeaId` index enforces at most one gift per source idea. Repeated conversion returns the existing gift.
- Deleting a converted gift reopens its idea; deleting an idea clears the gift's source reference.
- The Shopping List is derived from unbought gifts, grouped case-insensitively by store with missing stores last, and includes subtotals and a total.
- “Mark bought” uses the existing gift repository and updates the list and dashboard live.
- Print output uses `data-print-root` and `data-print-hide` with global `@media print` rules. It includes the title, season, date, groups, rows, subtotals, and total, and hides app chrome and controls.
- Converted-idea links target the gift row, focus it, and highlight it.

Milestone 6 does **not** implement cross-entity search or filters, recipient detail pages, archive management, backup/restore, CSV, sample data, season switching, themes, persistent-storage requests, service workers, or an offline package.

### 23.1 Known M6 limitations

- No Playwright suite exists. Criteria that specify E2E verification were checked manually in Chromium and with UI/integration tests.
- Browser checks used Chromium at desktop widths. Firefox, Safari, mobile devices, and cross-tab updates remain unverified.
- Print output was verified with Chrome 135 print-media emulation and a generated PDF/PNG. There is no built-in PDF export, saved print file, or cross-browser print guarantee.
- The print view includes the visible “Open” link text when a purchase link exists.
- Idea Bank search is scoped to the active season; M7 added equivalent scoped Gifts-page gift search and filters. Global cross-entity search remains out of scope.
- A production chunk-size warning remains because the main JavaScript chunk exceeds 500 kB.

---

## 24. Milestone 7 implementation boundaries

Milestone 7 adds gift search, filters, sorting, and recipient detail pages:

- `src/domain/calculations/giftList.ts` owns normalized search text, AND-composed filters, deterministic sorting, default sort, and category options. It reads plain arrays and never writes to storage.
- Search matches gift name, recipient name, category, and store. Matching ignores case, surrounding whitespace, and common Latin diacritics, and uses substring matching.
- Bought, wrapped, and sent filters are independent tri-state controls (`any`, `yes`, `no`). Recipient and category filters are exact after normalization.
- Sorting supports recipient, gift name, planned budget, actual cost, derived status, and last-updated date. Missing money values sort last. The default is recipient A–Z, then gift name A–Z, with id as the final deterministic tie-breaker.
- The Gifts page keeps filter and sort state in local React state. The visible rows are derived with `buildGiftList` on every live data update. No filter state or result snapshot is persisted.
- The no-results state is distinct from the no-gifts-yet state and offers Clear filters; Clear all also restores the default sort.
- `src/features/gifts/GiftTable.tsx` is shared by the Gifts page and recipient detail page so table structure and status controls do not diverge.
- `/recipients/:recipientId` loads the active season through the existing page-data hook, resolves the recipient by id, and renders `buildRecipientDetail`, `calculateRecipientMetrics`, and `calculateProgress`. Totals therefore match the dashboard and domain layer.
- Recipient detail shows only that recipient’s gifts. Active seasons allow recipient editing and the same gift edit, delete, and status actions as the Gifts page. Archived seasons are read-only.
- Unknown recipient ids render a not-found state; a missing active season renders the create-season state.
- Recipient cards link to their detail page.

Milestone 7 does **not** implement global cross-entity search, saved filter presets, URL-persisted filters, archive management, backup/restore, CSV, sample data, season switching, themes, persistent-storage requests, service workers, or an offline package.

### 24.1 Known M7 limitations

- No Playwright suite exists. Criteria that specify E2E verification were checked manually in Chromium and with UI/integration tests.
- Search and filters are scoped to the Gifts page in the active season. They are not a global search and do not include Idea Bank or Shopping List rows.
- Filter and sort state lives only in the page session. Reloading or navigating away resets the controls; nothing is stored.
- Money sorting places gifts without a planned budget or actual cost last in both directions, rather than treating a missing amount as zero.
- Browser checks used Chromium at desktop widths. Firefox, Safari, mobile devices, and cross-tab updates remain unverified.
- A production chunk-size warning remains because the main JavaScript chunk exceeds 500 kB.

---

## 25. Milestone 8 implementation boundaries

Milestone 8 adds season management, archives, and local data portability:

- `/seasons` (nav label "Seasons", page title "Seasons & archives") is implemented by `src/pages/SeasonsPage.tsx`. `useSeasonsPageData` runs one live query over settings and seasons, then loads each season's recipients, gifts, and ideas to build overviews with domain totals. No totals are stored.
- At most one season is active. `seasons.create` accepts `archiveCurrent`; when true it archives every active season in the same transaction before creating and selecting the new one. Creating a second active season without that consent raises `ConflictError`.
- New seasons can copy recipient names, relationships, caps, and notes from an existing season; gifts, ideas, and statuses are never copied.
- Archive, restore, and delete are confirmed in dialogs. Restore archives the current active season in the same transaction. Delete is limited to archived seasons and requires the exact, trimmed, case-sensitive season name.
- Archived seasons are read-only across the app; their pages and banners point to `/seasons`. A preview dialog shows recipients, gifts, statuses, and totals without edit controls.
- `src/storage/backup.ts` owns the envelope, strict Zod entity validation, relation checks (duplicate IDs across record types, one active season, settings consistency, foreign keys, cross-season references, idea/gift agreement), size/count limits, and atomic replace-all restore. `restoreBackup` re-validates the source and requires `RESTORE` before writing.
- The UI requires a fresh download of current data **and** the typed word `RESTORE`; the download and confirmation are separate deliberate actions.
- `src/storage/csv.ts` owns deterministic row ordering, RFC 4180 quoting, BOM/CRLF output, decimal money, `Yes`/`No`, human delivery labels, source markers, formula neutralization, and opt-in `Address`/`Notes` columns.
- `src/storage/sample.ts` writes a fixed sample season with fixed IDs. It is active only when no season exists; otherwise it is archived. Loading twice is a no-op, and removal deletes only `isSample` records.
- Reset requires a downloaded backup and the typed word `DELETE`, then clears all data stores and returns to `/onboarding` with a notice.
- `src/lib/download.ts` performs local Blob downloads; no network request is involved.

Milestone 8 does **not** implement merge restore, automatic/scheduled backups, cloud sync, encryption, ZIP packaging, a printable backup, CSV import, global search, themes, service workers, or an offline package. Playwright remains unconfigured.

### 25.1 Known M8 limitations

- Backups and CSV files are generated on demand only. There is no automatic backup, reminder, or version history, and no protection from the browser clearing site data.
- Restore is replace-all only. There is no merge, selective restore, or per-season import.
- Backup validation rejects older schema versions because no migration exists yet.
- The pre-restore download is a UI gate; a technically determined user could bypass the UI and call the repository directly.
- Duplicate season names are allowed, so typed delete confirmation identifies the season by name rather than by a unique label.
- CSV has no import path and no per-recipient export.
- Browser checks used Chromium at desktop widths. Firefox, Safari, and mobile layouts remain unverified.
- A production chunk-size warning remains because the main JavaScript chunk exceeds 500 kB.

---

## 26. Milestone 9 implementation boundaries

Milestone 9 refines the interface without changing the data model or business rules:

- `src/lib/theme.ts` owns theme normalization, storage keys, and system-preference resolution. `src/app/ThemeController.tsx` applies `data-theme`, `color-scheme`, and the `theme-color` meta tag; it mirrors the choice to `localStorage` for pre-paint and treats IndexedDB settings as authoritative (D-017).
- `index.html` contains a small synchronous script that applies the mirrored theme before first paint. A verified snapshot shows dark applied at DOMContentLoaded without an intermediate wrong-theme mutation.
- Settings is rebuilt around appearance (light/dark/system), currency format (symbol, code, fraction digits), PII-free diagnostics, privacy explanation, app/schema versions, and the existing backup/restore/sample/reset tools. Monetary format changes never convert stored minor units and require confirmation when data exists (D-015).
- The palette remains warm ivory, deep evergreen, muted burgundy, and soft gold. Dark theme overrides every surface, border, shadow, status tone, and chart color. Components consume tokens only.
- Gifts and Shopping tables become stacked cards at narrow widths using screen-only CSS; print keeps the tabular layout. Chart tables reduce padding instead of forcing page scrolling. No route overflows horizontally at 360/768/1024/1440 px.
- `InfoTip` provides keyboard-focusable explanations for planned/spent/remaining/unallocated/utilization metrics. The budget chart keeps an accessible data table; motion respects `prefers-reduced-motion`.
- Buttons, icon buttons, season chips, dialog controls, and mobile table toggles meet 44×44 px targets. Focus rings use a visible gold outline in both themes.
- First-run onboarding includes name, holiday date, optional budget, theme, currency, and optional sample data; startup still creates nothing.

Milestone 9 does **not** add new business features, self-hosted fonts, a service worker, an offline package, cloud sync, or automatic storage persistence. Playwright remains unconfigured.

### 26.1 Known M9 limitations

- Browser verification used headless Edge (Chromium) at 360/768/1024/1440. Firefox, Safari, iOS, and real touch hardware remain unverified.
- Contrast was checked against token pairs and visual inspection, not a full automated WCAG audit or screen-reader session.
- Theme is stored per browser profile; there is no cross-device synchronization.
- The system-font stack is retained intentionally. No remote or self-hosted brand font is shipped.
- A production chunk-size warning remains because the main JavaScript chunk exceeds 500 kB.

