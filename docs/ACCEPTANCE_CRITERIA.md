# Christmas Gift Tracker — Acceptance Criteria

> Status: Approved; Milestones 0-10 verified · Version 0.10 · 2026-10-30
> A milestone is complete only when every criterion marked for it passes. Verification methods: **U** = unit, **I** = integration (fake-indexeddb), **C** = component, **E** = Playwright E2E, **M** = manual/real browser, **D** = document review.
> Playwright remains deferred and no E2E suite exists. For Milestones 3–9, criteria marked **E** were verified with UI/integration tests and manual checks in the development or production build where stated; each milestone report records that substitution.

---

## How to use this document

- Criteria are normative. If implementation and criteria disagree, stop and either fix the code or amend this document with owner approval.
- Each milestone report must state, criterion by criterion, pass/fail/not run. “Not run” is not a pass.
- Automated evidence is a command and its summary output. Manual evidence is a browser/device, steps, and observed result.
- Tests must not be weakened, skipped, or deleted to make a milestone pass.
- Use disposable data for destructive checks; never test deletion or restore against the only copy of real records.

---

## Global criteria (apply to every milestone)

| ID | Criterion | Verification |
| --- | --- | --- |
| G-01 | No monetary total is calculated with floating-point arithmetic. Totals sum integer minor units. | Code review, U |
| G-02 | No expected console errors or unhandled promise rejections occur in normal workflows. | E, M |
| G-03 | No placeholder, sample, or hardcoded values appear as if they were the customer's real data. | Code review, E |
| G-04 | The offline edition makes no analytics, telemetry, advertising, or third-party runtime requests. | Network inspection, M |
| G-05 | No operation silently deletes, resets, overwrites, or repairs user data. | Code review, I, E |
| G-06 | No secrets, service-role keys, or privileged credentials exist in client code or the repository. | Code review, secret scan |
| G-07 | Required checks (`typecheck`, `lint`, `test`, `build`, and `test:e2e` when available) are actually run and reported honestly. | Command output |
| G-08 | Relevant docs are updated after the milestone, including limitations and remaining work. | D |
| G-09 | The AI development protocol is followed; no next milestone is started without authorization. | D |
| G-10 | Destructive operations require explicit user confirmation, and irreversible ones state the consequences. | C, E |
| G-11 | User text is rendered safely; URL fields allow only `http:`/`https:`. | U, C, code review |
| G-12 | Keyboard-only operation reaches every interactive control, with visible focus. | M, C |
| G-13 | Layout has no page-level horizontal overflow at 360 px, 768 px, 1024 px, and 1440 px. | E, M |
| G-14 | Light and dark themes both meet readable contrast for text, status, and controls (WCAG 2.2 AA target). | M, automated check where possible |
| G-15 | Empty, loading, no-results, error, archived, and no-active-season states are implemented wherever applicable. | C, E |

---

## Milestone 0 — Specification and development contract

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-0.01 | `docs/PRODUCT_SPEC.md` exists and defines editions, scope, routes, features, business rules, privacy, and claims guardrails. | D |
| AC-0.02 | `docs/ARCHITECTURE.md` exists and defines stack, layering, folder structure, data flow, offline strategy, testing, and risks. | D |
| AC-0.03 | `docs/DATA_MODEL.md` exists and defines entities, fields, IDs, money/date rules, storage indexes, invariants, transactions, calculations, migrations, backup, and CSV. | D |
| AC-0.04 | `docs/ACCEPTANCE_CRITERIA.md` exists and covers every milestone with testable criteria. | D |
| AC-0.05 | `docs/DECISIONS.md` exists and separates accepted decisions, assumptions, and open owner decisions. | D |
| AC-0.06 | `docs/IMPLEMENTATION_PLAN.md` exists and defines milestone order, deliverables, exit gates, and current status. | D |
| AC-0.07 | `AI_DEVELOPMENT_PROTOCOL.md` exists and defines scope control, verification, data safety, reporting, and Git policy. | D |
| AC-0.08 | The documents answer all owner review questions: bought/wrapped/sent, recipient vs season budgets, gift deletion, idea conversion, new season, backup, and offline delivery. | D |
| AC-0.09 | The offline delivery caveat is explicit: no unsupported claim about `file://` or “forever offline.” | D |
| AC-0.10 | Material open decisions are listed with recommendations and blocking milestones. | D |
| AC-0.11 | No application implementation code or fake application scaffold was created. | Repository review |
| AC-0.12 | The next milestone is not started automatically. | D |

---

## Milestone 1 — Application foundation and shell

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-1.01 | The repository has a React + TypeScript + Vite project with locked dependencies and documented scripts. | Build |
| AC-1.02 | `npm run dev` starts successfully with no startup errors. | M |
| AC-1.03 | `npm run build` produces a production build with no TypeScript errors. | Build |
| AC-1.04 | `npm run typecheck` passes. | Command |
| AC-1.05 | `npm run lint` passes with no errors (warnings documented if any). | Command |
| AC-1.06 | `npm run test` runs and passes at least a smoke test. | Command |
| AC-1.07 | Navigation exposes Dashboard, Gifts, Recipients, Idea Bank, Shopping List, Archives, and Settings. | E |
| AC-1.08 | Every navigation destination renders a working page with a meaningful placeholder, not a blank screen or crash. | E |
| AC-1.09 | A not-found route renders a friendly page with a link home. | E |
| AC-1.10 | A route-level error boundary catches a thrown render error and offers recovery without losing stored data. | C, E |
| AC-1.11 | Layout is usable at 360 px, 768 px, 1024 px, and 1440 px, with mobile navigation and no page-level horizontal scroll. | E, M |
| AC-1.12 | Design tokens define typography, spacing, surfaces, borders, radii, shadows, brand colors, and status colors; components consume tokens. | Code review |
| AC-1.13 | Reusable primitives exist for button, input, select, card, badge, dialog, table/surface, empty state, and page header. | Code review, C |
| AC-1.14 | The dialog primitive traps focus, closes on Escape, restores focus, and has an accessible title. | C, M |
| AC-1.15 | The layout is keyboard navigable with visible focus indicators. | M |
| AC-1.16 | Light theme tokens are defined; dark theme is not required until Milestone 9. | Code review |
| AC-1.17 | The header shows the product name; any season label is clearly a placeholder and not fake persisted data. | E |
| AC-1.18 | Pages do not contain invented business logic, fake totals, or fake user records. | Code review |
| AC-1.19 | Folder structure separates app, pages, features, components, domain, storage, lib, and tests as specified. | Code review |
| AC-1.20 | README documents install, dev, build, test, and the current milestone status. | D |
| AC-1.21 | `docs/IMPLEMENTATION_PLAN.md` and decisions are updated with completed and remaining work. | D |

---

## Milestone 2 — Data model and persistent storage

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-2.01 | IndexedDB database opens with the version-1 stores and indexes from `DATA_MODEL.md` §4.2. | I |
| AC-2.02 | Meta records (`schemaVersion`, `databaseId`, `appVersion`, `lastOpenedAt`) are created/updated correctly. | I |
| AC-2.03 | A settings singleton is created only when absent; existing settings are never overwritten on startup. | I |
| AC-2.04 | Create, read, update, and delete work for seasons, recipients, gifts, and ideas; settings support read and update through typed repositories. | I |
| AC-2.05 | IDs are UUIDs, stable across updates, and unique. | I |
| AC-2.06 | Money is stored as integer minor units; validation rejects negative, non-integer, unsafe, and out-of-range values. | U, I |
| AC-2.07 | Date-only and timestamp values are validated; invalid dates are rejected. | U |
| AC-2.08 | Invalid entities are rejected with a typed `ValidationError` and field details before any write. | I |
| AC-2.09 | A gift referencing a missing recipient or a recipient in another season is rejected. | I |
| AC-2.10 | Duplicate recipient names are allowed; duplicate IDs are not. | I |
| AC-2.11 | A failed multi-record write (recipient cascade, conversion, season operation) leaves no partial changes. | I |
| AC-2.12 | Records survive a page refresh. | E |
| AC-2.13 | Records survive closing and reopening the browser in the supported test environment. | M |
| AC-2.14 | A synthetic prior-version fixture migrates to version 1 with all valid records preserved (the migration harness is proven even though v1 is the first shipped schema). | I |
| AC-2.15 | A migration failure does not delete the database or recreate it silently; the app shows recovery guidance. | I, M |
| AC-2.16 | Startup never creates a season, seeds sample data, or deletes records. | I |
| AC-2.17 | A reset/clear operation requires an explicit call and confirmation; no startup path can trigger it. | I, code review |
| AC-2.18 | The health check reports counts, multiple-active-season violations, orphans, cross-season references, status-invariant violations, storage estimate, and persistence status. | I |
| AC-2.19 | The health check never mutates data and its report contains no names, addresses, or notes. | I |
| AC-2.20 | Storage quota and open failures are caught and surfaced through typed errors, not unhandled rejections. | I |
| AC-2.21 | The storage layer has no React imports and is independently testable. | Code review |
| AC-2.22 | Existing user data is never cleared or reset to make tests pass. | Code review, I |

---

## Milestone 3 — Recipients

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-3.01 | The Recipients page lists recipients for the active season only. | E, I |
| AC-3.02 | A recipient can be created with name, optional relationship, optional cap, and optional notes. | E |
| AC-3.03 | Required-name and max-length validation produces accessible inline errors. | C |
| AC-3.04 | A recipient can be edited; changes persist after refresh. | E |
| AC-3.05 | Duplicate names are accepted without conflating records. | I |
| AC-3.06 | A budget cap of zero is accepted and displayed distinctly from “no cap.” | U, C |
| AC-3.07 | Negative or malformed cap input is rejected with a clear message. | C, U |
| AC-3.08 | Each recipient shows cap, planned, spent, remaining cap, and progress computed from gift data (zero when no gifts). | U, E |
| AC-3.09 | A recipient with no gifts can be deleted after confirmation. | E |
| AC-3.10 | A recipient with gifts cannot be deleted without choosing reassign or explicit cascade; cancel makes no changes. | E, I |
| AC-3.11 | Reassigning moves all gifts to another recipient in the same season in one transaction and deletes the source recipient. | I, E |
| AC-3.12 | Cascading deletion states the gift count, requires confirmation, deletes gifts and recipient atomically, and leaves ideas unassigned. | I, E |
| AC-3.13 | The page has loading, empty, no-active-season, archived read-only, and error states. | C, E |
| AC-3.14 | Archived-season recipients are not editable. | E |
| AC-3.15 | All recipient changes persist in IndexedDB and update live queries without reload. | E, I |
| AC-3.16 | No placeholder recipients or fabricated spending values exist. | Code review, E |
| AC-3.17 | When no active season exists, the user can create a minimal season (name, holiday date, optional budget) and proceed; this is the only season-creation UI required before Milestone 8. | E |
| AC-3.18 | The app never auto-creates a season or recipients on load; the minimal setup is an explicit user action. | I, E |

---

## Milestone 4 — Gifts

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-4.01 | The Gifts page lists gifts for the active season with name, recipient, category, planned, actual, and status. | E |
| AC-4.02 | A gift can be created with all approved fields and a recipient in the same season. | E, I |
| AC-4.03 | A gift cannot be saved with a missing or cross-season recipient. | I, C |
| AC-4.04 | A gift can be edited and changes persist after refresh. | E |
| AC-4.05 | A gift can be deleted after confirmation; the list and totals update. | E, I |
| AC-4.06 | Purchase links accept only valid `http`/`https` URLs; other schemes are rejected. | U, C |
| AC-4.07 | Money inputs accept documented formats, reject negatives/extra decimals, and store integer minor units. | U, C |
| AC-4.08 | Bought, wrapped, and sent statuses are independently stored booleans with optional dates. | I |
| AC-4.09 | A gift must be bought before wrapped or sent; attempted direct transitions are rejected or offered as a combined atomic action. | U, I, C |
| AC-4.10 | Wrapping is not required before sending. | U, E |
| AC-4.11 | Un-marking bought while wrapped or sent requires confirmation and clears those statuses. | C, I |
| AC-4.12 | Status dates are set/cleared consistently with their booleans. | I |
| AC-4.13 | A bought gift with no actual cost is accepted, contributes zero to spending, and is flagged. | U, E |
| AC-4.14 | An unbought gift's recorded actual cost does not count as spent. | U |
| AC-4.15 | Status is conveyed by text/icon, not color alone. | C, M |
| AC-4.16 | The gift table becomes usable cards or a controlled scroll on mobile; the page does not overflow. | E |
| AC-4.17 | Empty, loading, no-results, error, and archived read-only states are implemented. | C, E |
| AC-4.18 | All gift changes persist and update live recipient summaries without reload. | E, I |
| AC-4.19 | No dashboard charts or Idea Bank functionality is implemented in this milestone. | Code review |

---

## Milestone 5 — Budget engine and dashboard

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-5.01 | `plannedTotalMinor` equals the sum of all gifts' planned budgets, treating null as 0. | U, fixture |
| AC-5.02 | `actualSpentMinor` sums actual costs only for bought gifts; unbought costs and null costs are excluded. | U, fixture |
| AC-5.03 | Remaining budget is `season budget − actual spent`, and is `null` when no budget is set. | U |
| AC-5.04 | Unallocated budget is `season budget − planned total`, displayed separately from remaining. | U, C |
| AC-5.05 | Overspend produces a negative remaining value and a visible over-budget state, not a clamp at zero. | U, C |
| AC-5.06 | Planned-over-budget and spent-over-budget are distinct warnings. | U, C |
| AC-5.07 | Recipient planned, spent, cap remaining, utilization, over-cap, and exceeded amount are correct for all fixtures. | U |
| AC-5.08 | Cap of 0 yields null utilization but correct over-cap detection. | U |
| AC-5.09 | Progress counts/ratios for bought, wrapped, and sent are correct; empty gifts yield null ratios and an empty state, not `NaN`. | U, C |
| AC-5.10 | Bought-without-cost and unbudgeted counts are correct and surfaced as alerts. | U, E |
| AC-5.11 | Budget-vs-actual chart data matches fixtures, includes recipients with gifts or caps, and sorts deterministically. | U |
| AC-5.12 | The chart has an accessible table alternative with identical numbers. | C, M |
| AC-5.13 | Holiday countdown handles future, today, past, year boundaries, and DST transitions correctly. | U |
| AC-5.14 | Dashboard cards, progress, charts, alerts, and countdown render from real persisted data only. | E |
| AC-5.15 | Changing a gift's cost or bought status updates the dashboard without a reload. | E |
| AC-5.16 | Changing the season budget updates remaining/unallocated without a reload. | E |
| AC-5.17 | Archived seasons do not affect any active-season metric. | I, U |
| AC-5.18 | All calculations are implemented once in the domain layer; no component re-implements a total. | Code review |
| AC-5.19 | Unit tests cover zero gifts, null vs zero money, missing costs, overspending, caps, multiple recipients, archived isolation, and boundaries. | U |
| AC-5.20 | No chart or metric is hardcoded. | Code review, E |

---

## Milestone 6 — Idea Bank and Shopping List

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-6.01 | Ideas can be created, edited, deleted, listed, and searched within the active season. | E, I |
| AC-6.02 | Idea fields and validation match the data model; purchase URLs are restricted to http/https. | U, C |
| AC-6.03 | An idea with no recipient can be converted only after selecting a recipient in the same season. | C, E |
| AC-6.04 | Conversion copies name, category, store, link, estimated price to planned budget, and notes. | I |
| AC-6.05 | Conversion sets the idea to converted, links the gift, and is atomic. | I |
| AC-6.06 | Repeated clicks/retries cannot create a duplicate gift for one idea; the existing gift is returned. | I, E |
| AC-6.07 | A unique index or equivalent guarantee enforces at most one gift per source idea. | I, code review |
| AC-6.08 | Converted ideas are visibly marked and link to the gift; they are excluded from budgets and shopping. | E, U |
| AC-6.09 | A converted idea can be reopened only when the linked gift no longer exists; the UI explains why otherwise. | C, I |
| AC-6.10 | Deleting a converted gift returns its idea to active and preserves the idea's content. | I, E |
| AC-6.11 | Deleting an idea clears the gift's source reference and leaves the gift intact. | I |
| AC-6.12 | The Shopping List is derived from unbought gifts, with no separately stored list. | I, code review |
| AC-6.13 | Purchased gifts are excluded, and marking a gift bought removes it immediately without affecting others. | E, I |
| AC-6.14 | Gifts are grouped by store, case-insensitively, with “No store specified” last. | U, E |
| AC-6.15 | Rows show recipient, gift, planned budget, and a safe external link when present. | E |
| AC-6.16 | Group subtotals and a visible total are correct. | U, E |
| AC-6.17 | Print output contains only the list title, season, date, groups, and rows; navigation and controls are hidden. | E (`emulateMedia`), M |
| AC-6.18 | Empty list and no-active-season states are meaningful. | C, E |
| AC-6.19 | If “mark bought” is offered from the list, it follows the same status rules and is excluded from print. | I, E |
| AC-6.20 | No duplicate source of truth for shopping items exists. | Code review |

---

## Milestone 7 — Search, filters, and recipient details

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-7.01 | Search matches gift name, recipient, category, and store. | U, E |
| AC-7.02 | Search is case-insensitive, diacritic-insensitive, and substring-based. | U |
| AC-7.03 | Recipient, category, bought, wrapped, and sent filters work individually. | E |
| AC-7.04 | Filters combine with AND semantics and search composes with them. | U, E |
| AC-7.05 | Tri-state status filters distinguish any/yes/no. | E |
| AC-7.06 | Sorting works for name, recipient, planned, actual, status, and updated date, with a deterministic default. | U, E |
| AC-7.07 | Clear-all restores search, filters, and default sorting. | E |
| AC-7.08 | No-results state differs from no-data and offers clear filters. | C, E |
| AC-7.09 | Search and filters never write to storage. | I, code review |
| AC-7.10 | Recipient detail route resolves one recipient and shows cap, planned, spent, remaining cap, utilization, progress, and gifts. | E |
| AC-7.11 | Recipient detail totals match the domain layer and the dashboard. | U, E |
| AC-7.12 | Invalid recipient IDs render a not-found/return state without crashing. | E, C |
| AC-7.13 | Results update correctly when data changes while filters are active. | E |
| AC-7.14 | Filter controls have accessible labels and keyboard operation. | C, M |
| AC-7.15 | Archived/read-only and no-active-season states remain correct. | E |
| AC-7.16 | No heavy state-management library or duplicate business logic was introduced. | Code review |

---

## Milestone 8 — Seasons, archives, backup, and export

**Status:** Complete and verified on 2026-10-30. Criterion-by-criterion evidence is in `docs/MILESTONE_8_REPORT.md`. E-marked criteria were verified with UI/integration tests plus manual checks in the development build; no Playwright suite exists.

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-8.01 | A season can be created with name, holiday date, and optional budget. | E, I |
| AC-8.02 | Creating a season optionally copies recipient names/relationships/caps with new IDs; it does not copy gifts or ideas. | I |
| AC-8.03 | At most one season is active at any time, enforced in storage. | I |
| AC-8.04 | Switching seasons changes all data pages immediately and never mixes records. | E, I |
| AC-8.05 | Two seasons with different recipients/gifts retain isolated totals. | I, E |
| AC-8.06 | Archiving is non-destructive and makes the season read-only. | E, I |
| AC-8.07 | Restoring an archived season while another is active requires confirmation and archives the current one in one transaction. | I, E |
| AC-8.08 | The app supports zero active seasons with a clear empty state and Create/Restore actions. | C, E |
| AC-8.09 | Deleting an archived season requires typing its exact name, deletes children atomically, and is not possible for the active season. | I, E |
| AC-8.10 | A new season never silently erases or replaces a previous season. | I, E |
| AC-8.11 | Archived-season data can be viewed, exported, and backed up. | E |
| AC-8.12 | The JSON backup includes settings, all seasons, recipients, gifts, and ideas, with format and schema versions. | I |
| AC-8.13 | Backup → clear/reset test data → restore reproduces counts, IDs, relationships, statuses, and settings exactly. | I, E |
| AC-8.14 | Restore validates format, version, types, money, dates, referential integrity, duplicates, and invariants before writing. | I |
| AC-8.15 | Invalid, malformed, newer, dangling, or cross-season backups are rejected with clear messages and zero changes. | I |
| AC-8.16 | Restore is replace-all only, requires confirmation, and offers/creates a pre-restore backup. | E, I |
| AC-8.17 | Restore is atomic; a failure leaves the previous data intact. | I |
| AC-8.18 | Restoring an older supported version migrates or is rejected with a documented reason; it is never partially imported. | I |
| AC-8.19 | CSV export produces valid RFC 4180 output with the documented columns, BOM, CRLF, and ISO dates. | U, M |
| AC-8.20 | CSV handles commas, quotes, newlines, Unicode, and empty fields. | U |
| AC-8.21 | CSV protects against spreadsheet formula injection as documented. | U |
| AC-8.22 | Addresses and notes are excluded from CSV by default and included only with explicit opt-in and a warning. | C, U |
| AC-8.23 | Reset-all requires typed confirmation and a pre-reset backup; it never runs automatically. | E, I |
| AC-8.24 | Season and backup operations update docs and are covered by regression tests. | D, I |
| AC-8.25 | Sample data can be loaded through an explicit action; it is clearly labeled, uses a flagged sample season, and loading twice does not duplicate it. | E, I |
| AC-8.26 | If real data exists, the sample season is added as archived and never changes active-season totals. | E, I |
| AC-8.27 | Removing sample data deletes only the sample season and its children; real seasons and records are untouched. | I, E |

---

## Milestone 9 — Professional UI, themes, responsiveness, accessibility

**Status:** Complete and verified on 2026-10-30. Criterion-by-criterion evidence is in `docs/MILESTONE_9_REPORT.md`. E-marked criteria were verified with UI/integration tests plus manual checks in headless Edge at 360/768/1024/1440; no Playwright suite exists.

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-9.01 | All pages share consistent typography, spacing, surfaces, borders, status badges, and action placement. | M |
| AC-9.02 | The palette is a restrained warm/evergreen/burgundy/gold system, not excessive holiday decoration. | D, M |
| AC-9.03 | Light, dark, and system themes work and persist across reloads. | E, M |
| AC-9.04 | Theme applies before first paint with no flash of the wrong theme. | M |
| AC-9.05 | Currency symbol/code/fraction digits are configurable, formatted consistently, and persisted. | E, U |
| AC-9.06 | Changing currency format with data present requires confirmation and does not alter stored values. | C, I |
| AC-9.07 | All routes are usable at 360 px, 768 px, 1024 px, and 1440 px. | E, M |
| AC-9.08 | Forms are touch-friendly; controls meet 44×44 px targets. | M |
| AC-9.09 | Tables/cards avoid page-level horizontal overflow and remain readable on mobile. | E |
| AC-9.10 | Every form control has a visible, associated label and accessible error message. | C, M |
| AC-9.11 | Keyboard navigation, focus order, dialog focus trapping, and Escape behavior are correct. | M |
| AC-9.12 | Focus indicators are clearly visible in both themes. | M |
| AC-9.13 | Status is never conveyed by color alone; icons/text accompany color. | C, M |
| AC-9.14 | Text and controls meet WCAG 2.2 AA contrast targets in both themes. | M, audit |
| AC-9.15 | Charts have accessible names and a table/text alternative. | C, M |
| AC-9.16 | `prefers-reduced-motion` is respected. | M |
| AC-9.17 | Shopping List print styles are correct and exclude navigation/controls. | E, M |
| AC-9.18 | Empty, error, loading, and read-only states are visually consistent. | M |
| AC-9.19 | Tooltips explain non-obvious metrics (planned vs spent vs remaining; utilization) and are keyboard accessible. | C, M |
| AC-9.20 | No working business logic or data behavior is replaced by static mockups. | Code review, E |
| AC-9.21 | The Settings page includes currency, theme, data tools, diagnostics (PII-free health report), privacy explanation, and app/schema version. | E, M |
| AC-9.22 | First-run onboarding is complete and matches the documented flow, including optional sample data. | E, M |
| AC-9.23 | Regression tests, typecheck, lint, and build pass. | Commands |

---

## Milestone 10 — Offline delivery

**Status:** Complete and verified on 2026-10-30. Criterion-by-criterion evidence is in `docs/MILESTONE_10_REPORT.md`. AC-10.12 and AC-10.13 are **partial**: only Chromium (Microsoft Edge 156) was available, so Firefox, Safari, iOS/iPadOS, and Android were not verified, and the standalone file is not shipped.

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-10.01 | The production build precaches HTML, JS, CSS, fonts, icons, and the manifest. | Build inspection, M |
| AC-10.02 | After the documented setup, the app launches with the network disabled. | E, M |
| AC-10.03 | Reloading while offline works. | E, M |
| AC-10.04 | All core workflows work offline: seasons, recipients, gifts, dashboard, ideas, shopping, search/filters, archives, backup, CSV. | E, M |
| AC-10.05 | Creating/editing records offline persists after reload and browser restart. | E, M |
| AC-10.06 | No essential font, icon, script, or API is loaded from a remote origin. | Network inspection |
| AC-10.07 | The app handles external purchase links gracefully when offline (link opens/attempts, app remains stable). | M |
| AC-10.08 | Persistent-storage support is requested and its result explained. | M |
| AC-10.09 | Service-worker updates are presented to the user and never silently discard unsaved form work. | E, M |
| AC-10.10 | Storage-unavailable/quota errors show actionable recovery guidance. | I, M |
| AC-10.11 | The actual deliverable artifact is tested, not only the dev server. | M |
| AC-10.12 | Chrome/Edge, Firefox, and Safari (incl. iOS if available) results are documented, including failures. | M |
| AC-10.13 | A standalone `file://` build is evaluated in the supported browsers; results are recorded. | M |
| AC-10.14 | If `file://` cannot reliably persist data, it is not shipped as the offline edition; an approved alternative is documented. | D |
| AC-10.15 | Customer-facing setup instructions match the tested artifact and required one-time internet access. | D |
| AC-10.16 | Offline/online status messaging is truthful; the offline edition never claims cloud sync. | M |
| AC-10.17 | No unsupported “forever offline” or “works from any HTML file” claim appears. | D |
| AC-10.18 | Regression tests, typecheck, lint, and build pass. | Commands |

---

## Milestone 11 — Online edition and cloud synchronization

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-11.01 | Registration, sign-in, sign-out, and password recovery work. | E |
| AC-11.02 | Authentication failures show safe, clear messages without leaking account existence where avoidable. | E, M |
| AC-11.03 | Each user can read/write only their own cloud records; server-side RLS/authorization is enforced. | Integration/security tests |
| AC-11.04 | User A cannot access User B's records by ID, query, or API manipulation. | Security tests |
| AC-11.05 | No privileged key or secret is present in the client bundle. | Review/scan |
| AC-11.06 | Cloud schema mirrors the domain without duplicating business rules. | D |
| AC-11.07 | Sync status is visible: synced, pending, offline, conflict, error. | E, M |
| AC-11.08 | Offline edits queue and sync when connectivity returns. | E, M |
| AC-11.09 | Duplicate submissions/retries do not duplicate records. | I |
| AC-11.10 | Concurrent edits to the same record are surfaced as conflicts with both versions; no silent overwrite. | I, E |
| AC-11.11 | Interrupted sync can be retried safely. | I |
| AC-11.12 | The offline edition and core local workflows still work without auth or cloud access. | E |
| AC-11.13 | Account deletion removes cloud data and explains local-data handling. | E, M |
| AC-11.14 | Account data export works and is documented. | E |
| AC-11.15 | Cross-account isolation, invalid input, auth failure, network failure, duplicate submission, and conflict tests pass. | Tests |
| AC-11.16 | Architecture, deployment, setup, and privacy docs are updated. | D |
| AC-11.17 | No payment processing or subscription enforcement was added. | Code review |

**Verification status (2026-10-30):** AC-11.01, 11.02, 11.05–11.14, 11.16, and 11.17 are covered by the automated suite, the offline bundle scan, and manual review. AC-11.03, 11.04, 11.09, 11.10, 11.11, and 11.15 are exercised against the committed fake cloud in tests and by the SQL review, but the live Supabase RLS/cross-account run (`npm run verify:supabase`) remains pending the owner's dedicated test project. See `docs/MILESTONE_11_REPORT.md` §5.

---

## Milestone 12 — Final QA, packaging, and Etsy release

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-12.01 | The full automated suite passes; failures are reported, not hidden. | Commands |
| AC-12.02 | Every core workflow passes end-to-end: recipients, gifts, statuses, budgets, ideas, shopping, search, seasons, archive/restore, backup/restore, CSV, themes/currency, offline. | E, M |
| AC-12.03 | Reliability checks pass: refresh, browser restart, empty data, large data, invalid input, malformed backup, storage failure where practical, mobile. | E, M |
| AC-12.04 | No unexpected console errors or missing assets appear in production. | E, M |
| AC-12.05 | No placeholder content or unimplemented-feature screenshots remain. | Review |
| AC-12.06 | The production build is created from the release commit and verified via `preview` or hosting. | Build, M |
| AC-12.07 | The actual offline artifact passes the documented setup and offline checks. | M |
| AC-12.08 | Customer package contains START-HERE, offline edition artifact, user guide, sample backup, license/support, and accurate structure. | Review |
| AC-12.09 | PDFs and instructions match actual behavior and tested browser support. | Review |
| AC-12.10 | Sample backup restores successfully into a clean app. | E |
| AC-12.11 | License and support terms are present and consistent with the listing. | Review |
| AC-12.12 | Etsy screenshots show only implemented features and real UI. | Review |
| AC-12.13 | Privacy statement covers local storage, backups, CSV, and (if included) cloud transmission. | Review |
| AC-12.14 | Known limitations are documented honestly. | Review |
| AC-12.15 | Release report covers features, test results, build status, offline results, online results if applicable, limitations, package contents, deployment, and unresolved issues. | Review |
| AC-12.16 | No known critical defect remains in data loss, security, calculation accuracy, or core workflow. | Review |
| AC-12.17 | Listing claims are verified and do not overpromise offline, sync, encryption, or backups. | Review |
| AC-12.18 | A Git release checkpoint/tag exists for the tested build. | Git |

---

## Manual browser matrix (used from Milestone 4 onward)

Record actual results, including failures.

| Scenario | Chrome/Edge | Firefox | Safari desktop | iOS Safari |
| --- | --- | --- | --- | --- |
| App loads and navigates | | | | |
| Create/edit/delete data | | | | |
| Refresh persistence | | | | |
| Browser restart persistence | | | | |
| Offline launch after setup | | | | |
| IndexedDB survives restart | | | | |
| Backup download | | | | |
| Backup restore | | | | |
| CSV export opens correctly | | | | |
| Print shopping list | | | | |
| Theme and currency persist | | | | |
| PWA install/Add to Home Screen | | | | |
| `file://` standalone (spike only) | | | | |

---

## Release blocker definition

A defect blocks release if it can cause:

- Loss or corruption of user data, including silent overwrite, partial restore, or a destructive action without confirmation.
- A materially incorrect budget, spending, or progress total.
- Cross-account data exposure (V2).
- An offline edition that does not work offline as instructed.
- A core workflow that cannot be completed.
- A false customer-facing claim about privacy, encryption, sync, or offline behavior.

Cosmetic issues may ship with documentation; data and trust issues may not.
