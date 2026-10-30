# Christmas Gift Tracker — Implementation Plan

> Status: Milestones 0–7 complete and verified; Milestone 8 not started · Version 0.7 · 2026-10-30
> Build order is deliberately capability-based. Each milestone must leave a working, verified application.

---

## 1. Current position

| Item | State |
| --- | --- |
| Repository | Runnable React/TypeScript/Vite application, approved specification, and tested local storage |
| Current milestone | **Milestone 7 - Search, filters, and recipient details** (complete; awaiting owner review before M8) |
| Application runnable | Yes - development server, tests, coverage, and production build pass |
| Tests | 247 Vitest tests across 26 files passing; no Playwright suite yet |
| Next milestone | Milestone 8 - Seasons, archives, backup, CSV (not started) |
| Next action | Owner reviews `docs/MILESTONE_7_REPORT.md` and authorizes Milestone 8 |

**Do not start Milestone 8 until the owner authorizes it. Storage mutations must go through the tested repositories; startup must never create a season or sample data.**

---

## 2. Milestone sequence

| # | Milestone | Primary capability | Status |
| --- | --- | --- | --- |
| 0 | Specification | Approved product, architecture, data model, criteria, decisions | Complete — approved |
| 1 | Foundation | Runnable shell, navigation, design tokens, quality tooling | Complete — verified |
| 2 | Persistent storage | IndexedDB schema, repositories, migrations, validation | Complete — verified |
| 3 | Recipients | Recipient management with caps and summaries | Complete — verified |
| 4 | Gifts | Gift records, costs, statuses, deletion | Complete - verified |
| 5 | Budget engine + dashboard | Central calculations and live dashboard | Complete - verified |
| 6 | Idea Bank + Shopping List | Ideas convert to gifts; derived shopping list | Complete — verified |
| 7 | Search, filters, details | Find and review data at scale | Complete – verified |
| 8 | Seasons, archives, backup | Reuse yearly; protect and export data | Not started |
| 9 | Professional UI | Themes, responsive polish, accessibility, print | Not started |
| 10 | Offline delivery | Validated offline artifact and customer setup | Not started |
| 11 | Online edition | Accounts, cloud, sync, conflicts | Not started |
| 12 | QA + packaging + launch | Tested, documented Etsy release | Not started |

Order rationale:

- Storage and calculations come before the dashboard so the UI is not built on a weak foundation.
- Offline is proven before cloud sync.
- The offline product is sellable before investing in the online edition.
- Packaging and claims come last, based on tested reality.

---

## 3. Milestone 0 — Specification

**Status:** Complete and approved by the owner on 2026-10-26.

**Objective:** Give implementation a precise, reviewable definition and a permanent working protocol.

**Deliverables**

- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/ACCEPTANCE_CRITERIA.md`
- `docs/DECISIONS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `AI_DEVELOPMENT_PROTOCOL.md`
- `README.md` (project orientation)

**Exit gate**

- All AC-0 criteria pass.
- Owner answers the review questions in PRODUCT_SPEC §17 / DECISIONS open decisions relevant to Milestone 1.
- No application code exists.
- Git checkpoint recommended after review.

**Not in scope:** scaffolding, installing dependencies, writing components.

---

## 4. Milestone 1 — Application foundation and shell

**Status:** Complete and verified on 2026-10-26. See `docs/MILESTONE_1_REPORT.md`.

**Depends on:** M0 approval (satisfied).

**Objective:** A runnable React/TypeScript/Vite application with a professional, responsive shell and reliable development tooling.

**Build**

- Vite/React/TypeScript project with a locked lockfile.
- Typecheck, lint, format, unit-test, build, and preview scripts.
- Folder structure from Architecture §5.
- Router with Dashboard, Gifts, Recipients, Idea Bank, Shopping List, Archives, Settings.
- Responsive app shell: sidebar/drawer/bottom navigation, header, season placeholder, theme placeholder.
- Design tokens and base styles (warm ivory, evergreen, burgundy, gold, type/spacing scale).
- Reusable primitives: Button, Input, Select, Card, Badge, Dialog, DataTable shell, EmptyState, PageHeader, toast/announcer.
- Not-found page, app/route error boundaries, and a recovery placeholder.
- Vitest setup with a smoke test.
- GitHub Actions CI (install, typecheck, lint, test, build).
- README with commands and status.
- Placeholder pages that state what is coming without fake data.

**Not in scope**

- Storage, calculations, onboarding, real seasons, charts, PWA registration.

**Exit gate**

- AC-1.01–AC-1.21 pass.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
- Manual desktop/mobile navigation verified.
- No placeholder numbers presented as user data.

**Git checkpoint:** `feat: establish application foundation` — committed and tagged `milestone-1` after verification.

**Implementation notes**

- Installed with the locked tree: React 19.3, Vite 8.3, React Router 7.18, Lucide 1.61, Vitest 5.0.
- Native `<dialog>` supplies modal focus containment, Escape handling, and focus restoration. The mobile navigation and About panel share this primitive.
- Desktop navigation uses a persistent sidebar. Mobile uses a drawer; a bottom navigation bar was not needed and is not included.
- The light-theme placeholder is the explicit “Light theme only — dark mode in Milestone 9” note in Settings. No theme toggle is presented.
- The toast/announcer primitive was deferred until the first feature that needs transient feedback (Milestone 3/4). Inline errors and the shared error states exist now.
- Playwright remains deferred; `e2e/` is reserved but no end-to-end suite has run.
- ESLint is pinned to 9.39.5 because `eslint-plugin-jsx-a11y` 6.10.2 does not support ESLint 10 yet. Revisit after the release milestone.
- System font stacks are used until self-hosted brand fonts are introduced in Milestone 9. No remote font or CDN request is made.
- GitHub Actions verifies formatting, type checking, linting, tests, and the production build on pushes and pull requests.
- No storage, domain calculations, onboarding, sample records, charts, or PWA registration were added.

---

## 5. Milestone 2 — Data model and persistent storage

**Status:** Complete and verified 2026-10-26. See `docs/MILESTONE_2_REPORT.md`.

**Depends on:** M1; decisions D-002, D-003, D-004, D-005, D-018, D-019; O-3, O-7, O-8.

**Objective:** A reliable local database with typed repositories, validation, migrations, and tests. This is the foundation for every later feature.

**Build**

- Dexie database v1 with stores/indexes from DATA_MODEL §4.2.
- Entity types, branded IDs, Zod schemas.
- Money parse/format and date utilities.
- Repositories for seasons, settings, recipients, gifts, ideas.
- Transactions for multi-record operations.
- Typed error classes and mapping.
- Settings singleton and meta diagnostics.
- Migration harness and v1 initialization.
- Storage health check.
- Test builders/fixtures and `fake-indexeddb` integration tests.
- Explicit reset mechanism (no UI required yet; no automatic reset).
- Documentation updates.

**Not in scope**

- Full management UIs, dashboard, charts, backup/restore UI, PWA.

**Exit gate — met**

- AC-2.01-AC-2.22 pass (AC-2.12 verified manually; Playwright remains deferred and no end-to-end suite has run).
- A record created through a console flow survived a full page reload; the database identity was preserved.
- Invalid data and cross-season references are rejected before writes.
- A forced multi-record failure rolled back every change.
- The synthetic migration fixture preserved its valid records.
- The storage layer has no React dependency.

**Git checkpoint:** `feat: implement persistent local storage`

**Risk gate:** Do not build recipient/gift UI until storage tests are green and the schema is stable.

---

## 6. Milestone 3 — Recipients

**Status:** Complete and verified on 2026-10-26. See `docs/MILESTONE_3_REPORT.md`.

**Depends on:** M2; D-007; O-4.

**Objective:** Complete recipient management backed by real storage and domain calculations.

**Build**

- Minimal first-season creation when no active season exists (name, holiday date, optional budget), so recipients are usable before the full season/archive milestone.
- Recipients list with responsive cards/table.
- Create/edit forms with validation.
- Budget cap, relationship, notes.
- Spending summaries computed through the domain layer (zero until gifts exist).
- Empty/loading/error/no-season/archived states.
- Delete flow: reassign or explicit cascade, with gift counts and confirmation.
- Recipient detail route stub if useful (full detail in M7).
- Tests for CRUD, validation, persistence, deletion policy, and zero-state calculations.
- Documentation updates.

**Not in scope**

- Gift creation (except test fixtures), dashboard charts, idea bank.

**Exit gate — met**

- AC-3.01-AC-3.18 pass through automated tests and recorded browser checks; Playwright remains deferred.
- Recipient changes persist across refresh.
- No recipient totals are stored; all are derived.
- A user with no season can create one explicitly; the app never invents one.
- No fake spending numbers.

**Implementation notes**

- A minimal `/onboarding` page creates one season from an explicit form. It never redirects automatically, never selects a season on the user's behalf, and never seeds recipients.
- Pages read typed repositories through `StorageProvider`. A custom `useLiveQueryState` wraps Dexie's `liveQuery` to expose explicit loading, success, and error states. This supersedes D-003's specific `dexie-react-hooks` wording through D-025.
- Recipient metrics come from pure functions in `src/domain/calculations/recipients.ts`; no selected, planned, spent, or remaining totals are persisted.
- Archived seasons render read-only. Normal archive selection and restore controls remain Milestone 8.
- The app does not call `navigator.storage.persist()`. Persistence timing and the buyer-facing browser-storage explanation remain open; no eviction-protection claim is made.
- Native `<dialog>` supplies modal focus containment and Escape handling. Focus returns to the invoking control after closing, with a fallback to the main content when the invoking control no longer exists.

**Git checkpoint:** `feat: implement recipient management`

---

## 7. Milestone 4 - Gifts

**Status:** Complete and verified on 2026-10-28. See `docs/MILESTONE_4_REPORT.md`.

**Depends on:** M2, M3; D-006, D-020; O-10.

**Objective:** The core gift workflow: create, edit, assign, cost, status, delete.

**Build**

- Gifts list/table with responsive mobile representation.
- Gift form with all approved fields.
- Recipient selection constrained to the active season.
- Money and URL validation.
- Bought/wrapped/sent controls and combined transitions.
- Un-buy confirmation and status-date handling.
- Delete confirmation and idea-link handling (idea UI arrives in M6; repository behavior is ready).
- Empty/loading/error/archived states.
- Recipient summaries update through shared domain logic.
- Tests for CRUD, validation, status transitions, persistence, and failures.
- Documentation updates.

**Not in scope**

- Dashboard charts, Idea Bank UI, Shopping List, search/filter, backup UI.

**Exit gate**

- AC-4.01–AC-4.19 pass.
- Full create/edit/delete workflow survives refresh.
- Invalid status transitions are rejected safely.
- Bought-without-cost is flagged, not fabricated.

**Git checkpoint:** `feat: implement gift management`

**Risk gate:** Status invariants and money handling must be green before dashboard work.

---

## 8. Milestone 5 - Budget engine and dashboard

**Status:** Complete and verified on 2026-10-28. See `docs/MILESTONE_5_REPORT.md`.

**Depends on:** M4; D-021, D-024; O-11.

**Objective:** One authoritative calculation layer and a live dashboard using real data.

**Build**

- Domain calculations: season summary, recipient metrics, progress, data-quality findings, chart series, countdown.
- Season budget editing surface (minimal; polished later).
- Dashboard cards: budget, planned, spent, remaining, unallocated.
- Progress indicators for bought/wrapped/sent.
- Budget-vs-actual chart with accessible table alternative.
- Countdown.
- Alerts and empty states.
- Live updates via Dexie queries.
- Comprehensive unit tests, including boundary fixtures.
- Documentation updates.

**Not in scope**

- Idea Bank, Shopping List, search/filter, seasons/backup UI.

**Exit gate — met**

- AC-5.01–AC-5.20 pass through automated tests and recorded browser checks; Playwright remains deferred.
- Changing a cost/status/budget updates the dashboard without reload.
- Empty data yields no NaN and a useful first-step state.
- Archived data cannot affect current totals.
- One calculation implementation; dashboard components do not recompute totals.

**Implementation notes**

- `src/domain/calculations/dashboard.ts` owns season totals, progress ratios, recipient chart series, data-quality findings, countdown state, and percentage formatting. Recipient metrics remain in the existing `recipients.ts` calculation.
- `useDashboardData` loads the active season, recipients, and gifts through Dexie `liveQuery`; budget and gift writes refresh the dashboard without a reload.
- `useLocalToday` checks the local calendar date every minute and on focus/visibility change, so the countdown recovers after device sleep.
- Recharts is loaded as a separate chunk. The chart is hidden from assistive technology and paired with an open, accessible data table using the same numbers.
- Season budget editing is limited to an optional amount. It uses the existing repository validation and does not add season-management UI.
- Archived seasons show read-only figures, hide edit and alert actions, and keep budget editing unavailable.

**Git checkpoint:** `feat: implement budget engine and dashboard`

---

## 9. Milestone 6 — Idea Bank and Shopping List

**Status:** Complete and verified on 2026-10-28. See `docs/MILESTONE_6_REPORT.md`.

**Depends on:** M5; D-008; O-9.

**Objective:** Convert early ideas into gifts and turn unbought gifts into a practical shopping workflow.

**Build**

- Idea Bank CRUD, search, list, converted state.
- Conversion flow with recipient selection, atomicity, idempotency, and duplicate prevention.
- Reopen/delete behavior consistent with the data model.
- Shopping List derived from unbought gifts.
- Store grouping, subtotals, links, optional mark-bought action.
- Print styles and print verification.
- Empty states and reactive updates.
- Tests for conversion, duplicates, grouping, exclusion, print, reactivity.
- Documentation updates.

**Not in scope**

- Full cross-entity search/filters (M7), seasons/backup (M8).

**Exit gate — met**

- AC-6.01–AC-6.20 pass through automated tests, code review, and recorded browser checks.
- Double-clicking Convert creates one gift; the repository also returns the existing gift on repeated conversion.
- Marking bought removes the item from shopping and updates budgets.
- Print output excludes UI chrome.
- No separately stored shopping list.

**Implementation notes**

- `src/domain/calculations/ideas.ts` owns case-insensitive Idea Bank filtering across idea name, recipient, category, and store.
- `src/domain/calculations/shopping.ts` derives the list from unbought gifts, groups stores case-insensitively, places missing stores last, sorts deterministically, and calculates group subtotals and the total.
- `useIdeaPageData` and `useShoppingPageData` use the existing `useLiveQueryState` hook over typed repositories.
- Conversion reuses the existing idea repository transaction and the unique `&sourceIdeaId` index; repeated conversion returns the linked gift instead of creating another.
- Converted ideas stay in the bank with a link to the gift and remain excluded from budgets and shopping.
- “Mark bought” calls the existing gift repository and refreshes the list and dashboard through `liveQuery`.
- Print uses `data-print-root` and `data-print-hide` plus global `@media print` rules. Chrome print-media emulation and a generated PDF verified the output; no PDF export or saved print file is built in.
- New UI tests cover create, edit, delete, search, conversion with recipient selection, double-click conversion, shopping grouping/exclusion, mark-bought, print structure, empty states, and archived read-only behavior.

**Git checkpoint:** `feat: add idea bank and shopping list`

---

## 10. Milestone 7 — Search, filters, and recipient details

**Depends on:** M6.

**Status:** Complete and verified on 2026-10-30. See `docs/MILESTONE_7_REPORT.md`.

**Objective:** Make a large gift list navigable and give each recipient a complete view.

**Build**

- Search across gift name, recipient, category, store.
- Filters and tri-state statuses; combined semantics.
- Sorting and deterministic defaults.
- Clear-all and no-results states.
- Recipient detail page with metrics and gifts.
- Accessible filter controls.
- Tests for matching, combining, sorting, details, and mutation safety.
- Documentation updates.

**Implemented**

- `src/domain/calculations/giftList.ts` owns normalized search, AND-composed filters, deterministic sorting, default sort, and category options. It never writes to storage.
- `GiftFilterBar` provides labelled search, recipient, category, bought, wrapped, sent, and sort controls plus a live result count and Clear all.
- The Gifts page keeps filter and sort state locally, derives the visible rows with `buildGiftList`, and distinguishes no-data from no-results.
- `/recipients/:recipientId` uses `buildRecipientDetail` and the existing recipient metrics and progress calculations, shows only that recipient’s gifts, and supports gift editing/status changes.
- Unknown recipient IDs render a not-found state; archived seasons remain read-only; no active season retains the create-season state.
- Recipient cards link to their detail page.
- Tests cover matching, diacritics, tri-state filters, AND semantics, sorting, clear-all, no-results, live updates, detail totals, edit access, not-found, no-season, and archived read-only behavior.

**Not in scope**

- Season management, backup UI, visual polish pass.

**Exit gate**

- AC-7.01–AC-7.16 pass.
- Filters compose; clearing restores defaults.
- Recipient detail matches dashboard/domain totals.
- Search/filter never mutates data.

**Git checkpoint:** `feat: add search, filters, and recipient details`

---

## 11. Milestone 8 — Seasons, archives, backup, and export

**Depends on:** M7; D-009, D-010, D-023; O-6.

**Objective:** Make the product reusable every Christmas and protect customer data.

**Build**

- Season management UI: create, switch, edit, copy recipients, archive, restore, delete.
- Zero-active-season state.
- Archived read-only behavior across pages.
- Versioned JSON backup export.
- Validated replace-all restore with pre-restore backup and atomic transaction.
- CSV export with options and escaping.
- Load/remove sample data, labeled and isolated; removal touches only sample records.
- Reset-all-data flow with typed confirmation.
- Tests for isolation, archive/restore, backup round-trip, invalid files, CSV edge cases, and sample isolation.
- Documentation updates.

**Not in scope**

- Online sync, merge restore, encryption.

**Exit gate**

- AC-8.01–AC-8.27 pass.
- Two seasons never mix.
- Backup → clear → restore matches exactly.
- Invalid imports change nothing.
- CSV opens correctly in Excel/Numbers/Sheets.
- Sample data is isolated, labeled, idempotent, and removable.
- No destructive action runs without confirmation.

**Git checkpoint:** `feat: add seasons, archives, and data portability`

**Risk gate:** Backup/restore must be green before visual polish and packaging.

---

## 12. Milestone 9 — Professional UI, themes, accessibility

**Depends on:** M8; D-015, D-017; O-2.

**Objective:** Turn the working app into a premium, comfortable, accessible product.

**Build**

- Visual consistency audit across all pages.
- Refined warm/evergreen/burgundy/gold design system.
- Light/dark/system themes with persistence and pre-paint application.
- Currency settings and formatting.
- Responsive refinements, touch targets, mobile forms, table handling.
- Keyboard access, focus styles, labels, error messaging.
- Empty/error/loading/read-only consistency.
- Settings page: currency, theme, data tools, diagnostics (PII-free), privacy, about/version.
- First-run onboarding polish, including optional sample data.
- Chart accessibility and tooltips.
- Shopping list print polish.
- Accessibility and responsive regression tests.
- Documentation updates.

**Not in scope**

- New business features, offline packaging.

**Exit gate**

- AC-9.01–AC-9.23 pass.
- Every route verified at 360/768/1024/1440.
- Themes persist and do not flash.
- Keyboard-only workflows succeed.
- No working logic replaced by mockups.

**Git checkpoint:** `feat: polish interface, themes, and accessibility`

---

## 13. Milestone 10 — Offline delivery

**Depends on:** M9; D-011; O-1, O-12.

**Objective:** Prove the product works offline as delivered and document the exact setup.

**Build**

- PWA service worker with precache, SPA fallback, update prompt.
- Manifest, icons, install guidance.
- Remove any remote runtime dependency.
- Persistent storage request and storage-error recovery.
- Offline/online messaging appropriate to the edition.
- Standalone `file://` spike and browser test matrix.
- Actual artifact tests: install, offline launch, CRUD, persistence, exports.
- Delivery package draft and setup instructions.
- Update listing claims to tested reality.
- Documentation updates.

**Not in scope**

- Cloud accounts or sync.

**Exit gate**

- AC-10.01–AC-10.18 pass.
- Offline launch and all core workflows verified with the network disabled.
- Data survives reload and browser restart.
- Tested browsers and limitations documented.
- A standalone file is either proven or explicitly not shipped.

**Git checkpoint:** `feat: implement validated offline delivery`

**Risk gate:** Do not start Milestone 11 until the offline edition passes its acceptance tests.

---

## 14. Milestone 11 — Online edition and cloud synchronization

**Depends on:** M10; D-012; O-5; owner approval to build it at all.

**Objective:** Add optional accounts and cross-device access without weakening the offline product.

**Build**

- Backend project with Auth, Postgres schema, RLS policies.
- Registration, login, logout, password recovery, account deletion, data export.
- Cloud repository/sync adapter and outbox/tombstones migration.
- Sync status and conflict UI.
- Offline queue, retry, duplicate protection.
- Security tests for cross-account isolation and invalid input.
- Regression of all offline workflows.
- Deployment, architecture, privacy, and setup documentation.

**Not in scope**

- Payments, subscriptions, collaboration, public sharing.

**Exit gate**

- AC-11.01–AC-11.17 pass.
- User A cannot access User B's data.
- Conflicts are surfaced, never silently overwritten.
- Offline edition remains account-free and functional.
- No secrets in the client.

**Git checkpoint:** `feat: add online accounts and synchronization`

**Note:** This milestone is optional for the first Etsy release. It must not delay selling the validated offline edition if the offline product is ready.

---

## 15. Milestone 12 — Final QA, packaging, and Etsy launch

**Depends on:** all shipped milestones; owner approval to release.

**Objective:** A tested, documented, legally and practically complete digital product.

**Build**

- Full regression and manual browser matrix.
- Offline artifact re-verification.
- Production readiness audit: types, lint, build, routes, console, assets, empty/error states, placeholder scan, claims, privacy.
- Customer package:
  - `START-HERE.pdf`
  - `Offline-Edition/` (validated artifact or install instructions)
  - `User-Guide.pdf`
  - `Sample-Data/Sample-Backup.json`
  - `License-and-Support.pdf`
- Select and document a PDF generation method; verify text, links, page size, and accessibility of the exported documents.
- Screenshots from the real product.
- Listing copy aligned with verified behavior.
- Release report with features, tests, build, offline results, online results (if any), limitations, package contents, deployment, unresolved issues.
- Git tag for the release candidate.

**Exit gate**

- AC-12.01–AC-12.18 pass.
- No unresolved critical data-loss, security, calculation, or core-workflow defect.
- Instructions match the tested artifact.
- Claims are defensible.

**Git checkpoint:** `release: prepare Christmas Gift Tracker`

---

## 16. Cross-cutting workstreams

| Workstream | Applies from | Practice |
| --- | --- | --- |
| Documentation | M0 | Update spec/plan/decisions after each milestone |
| Testing | M1 | Add tests with every feature; run all gates before reporting |
| Data safety | M2 | Transactions, validation, no silent destructive actions |
| Accessibility | M1 | jsx-a11y, keyboard checks, focus, labels; full audit in M9 |
| Privacy | M1 | No telemetry/CDN; sensitive-data warnings; no secrets |
| Performance | M5 | Scoped queries, lazy charts, measure before optimizing |
| Git checkpoints | M0 | Commit only verified states; tag milestones; no destructive resets |
| Claims accuracy | M9–M12 | Screenshots and copy only after verification |

---

## 17. Verification commands

Established in Milestone 1:

```
npm ci
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
npm run preview
# Playwright is not installed; no end-to-end script exists yet.
```

Manual checks supplement automation:

- Refresh and browser-restart persistence.
- Network-disabled launch from the production artifact.
- Mobile viewport and touch use.
- Keyboard-only workflow.
- Light/dark theme and print preview.
- Real browser matrix from `ACCEPTANCE_CRITERIA.md`.

Every milestone report states which commands ran, their outcomes, and which manual checks were performed.

---

## 18. Git checkpoint policy

| Checkpoint | Suggested message |
| --- | --- |
| M0 | `docs: define product specification and architecture` |
| M1 | `feat: establish application foundation` |
| M2 | `feat: implement persistent local storage` |
| M3 | `feat: implement recipient management` |
| M4 | `feat: implement gift management` |
| M5 | `feat: implement budget engine and dashboard` |
| M6 | `feat: add idea bank and shopping list` |
| M7 | `feat: add search, filters, and recipient details` |
| M8 | `feat: add seasons, archives, and data portability` |
| M9 | `feat: polish interface, themes, and accessibility` |
| M10 | `feat: implement validated offline delivery` |
| M11 | `feat: add online accounts and synchronization` |
| M12 | `release: prepare Christmas Gift Tracker` |

Rules:

- Commit only after the milestone gate passes.
- Review diffs before committing, especially data, security, config, and deletion logic.
- Never commit `node_modules`, build output, coverage, test artifacts, real customer backups, or secrets.
- Never use a destructive reset or force-push without explicit owner approval.
- Tag verified milestones for easy recovery.

---

## 19. Scope-change protocol

A proposed change is classified before work:

1. **Bug fix within the milestone** — proceed, test, report.
2. **Small low-risk improvement** — implement only if it does not expand the milestone; document it.
3. **New feature or architectural change** — stop, explain impact, add a decision entry, and wait for approval.
4. **Data-model or security change** — always requires approval and a migration/compatibility plan.

The roadmap is a sequence of gates, not a checklist to rush. Shipping a smaller, correct product is preferable to shipping a large, unverifiable one.

---

## 20. Definition of milestone complete

A milestone is complete only when:

1. Every acceptance criterion for that milestone is verified.
2. Typecheck, lint, tests, and production build pass.
3. E2E tests pass once available.
4. Manual checks are performed and recorded.
5. No known critical data, security, or core-workflow defect remains.
6. Documentation and the implementation plan are updated.
7. The completion report is honest about failures and limitations.
8. The next milestone has not been started without authorization.

---

## 21. Immediate next step

1. Owner reviews the Gifts search/filter controls, recipient detail pages, and `docs/MILESTONE_7_REPORT.md`.
2. Owner confirms the remaining browser-storage persistence timing and buyer-facing explanation before release packaging.
3. Owner authorizes Milestone 8 — Seasons, archives, backup, CSV.
4. Only then begin season management, archive, backup, and CSV work.

Milestone 8 is **not started**. Until authorization: **stop.**
