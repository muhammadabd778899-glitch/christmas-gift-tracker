# Christmas Gift Tracker — Product Specification

> Status: Draft for owner approval · Version 0.1 · 2026-10-26
> Scope: Milestone 0 only. This document defines the product. It does not describe implemented code.

---

## 1. Summary

**Christmas Gift Tracker** is a local-first Christmas gift planning application for people who buy gifts for family, friends, colleagues, and other recipients.

It helps a customer:

1. Plan who they are buying for and how much they intend to spend.
2. Record gifts, costs, stores, links, and delivery details.
3. Track what has been bought, wrapped, and sent.
4. Keep an Idea Bank of possible gifts.
5. Generate a shopping list grouped by store.
6. Reuse the product across Christmas seasons without losing prior years.
7. Protect their data with a complete backup and a spreadsheet-friendly export.

The first commercial release is a **single-user, account-free, offline-first web application** sold as an Etsy digital download. An optional online edition with accounts and cross-device synchronization is planned after the offline edition is validated and selling.

---

## 2. Edition model

| Capability | Offline edition (launch) | Online edition (planned, V2) |
| --- | --- | --- |
| Opens in a modern browser | Yes | Yes |
| Works without a network connection | Yes, after the documented one-time setup | Core planning works offline; sync requires network |
| Account required | No | Yes |
| Recipients and gifts | Yes | Yes |
| Budget engine and dashboard | Yes | Yes |
| Idea Bank and Shopping List | Yes | Yes |
| Data location | Customer's browser (IndexedDB) | Local cache plus cloud database |
| Cross-device synchronization | No | Yes |
| Recovery after device loss | Customer-managed JSON backup | Account sign-in plus cloud data; local backup still supported |
| Seasons and archives | Yes | Yes |
| Export and backup | Yes | Yes |

**Critical delivery caveat.** A hosted website that stops working without a network is not an offline product. A raw HTML file opened from `file://` also cannot be assumed to have reliable persistent storage across browsers. The launch offline edition is therefore defined as an **installable offline-first web application (PWA)**, and the Milestone 10 spike confirmed this as the delivery method: the hosted PWA is shipped, while the single-file build is not advertised because it could not be tested across the required browsers. See §11 and `docs/DECISIONS.md` (D-011). Marketing copy MUST match the tested behavior; "works offline forever with no setup" is not an approved claim.

Both editions share one codebase, one domain model, and one set of business rules. The online edition adds authentication, cloud persistence, and synchronization around the same core.

---

## 3. Target customer and jobs

### Primary customer

A household gift planner who currently uses a spreadsheet, notes app, or paper list and wants a purpose-built tool that is pleasant to use and works on a laptop or phone.

Typical scale:

- 5–30 recipients.
- 20–100 gifts.
- A season budget of roughly $100–$3,000.
- Planning begins in October–November and ends in December.

### Jobs to be done

| Job | Desired outcome |
| --- | --- |
| "Help me not overspend" | See budget, planned spending, and actual spending without doing arithmetic |
| "Help me remember what I bought" | One reliable list of gifts, recipients, costs, and statuses |
| "Help me finish on time" | See what is unbought, unwrapped, and unsent; shop from a grouped list |
| "Help me remember ideas" | Capture ideas early and promote them to gifts later |
| "Help me next year" | Keep last Christmas intact and start a clean new season |
| "Help me not lose everything" | Export a complete backup and restore it safely |
| "Let me use it anywhere" | Comfortable desktop and mobile layouts, light and dark themes |

### Not the target customer (launch)

- Teams or multiple people editing one shared plan.
- Businesses managing client gifts at scale with invoicing.
- Users who need inventory, shipping labels, or payment processing.
- Users who require an AI gift recommendation engine.

---

## 4. Goals and non-goals

### Goals

- Make the basic gift-planning workflow faster and less error-prone than a spreadsheet.
- Keep all financial calculations integer-safe, consistent, and centrally tested.
- Never lose customer data through a silent reset, ambiguous delete, or failed import.
- Work reliably offline after a clearly documented setup.
- Be understandable without a manual for the core workflow.
- Package and document the product well enough to sell without hand-holding.

### Non-goals for the launch release

- Real payment processing, subscriptions, or license enforcement.
- Cloud accounts, multi-device sync, or collaboration (reserved for V2).
- AI-generated gift suggestions or chat features.
- Multi-currency portfolios, exchange rates, or tax handling.
- Refund/return accounting (a cost can be edited or the gift deleted instead).
- Attachments, photos, or scanned receipts.
- Email/SMS reminders or calendar integration.
- Native iOS/Android or desktop applications (unless Milestone 10 proves a wrapper is required for the delivery promise).
- Accessibility certification beyond a WCAG 2.2 AA implementation target.

---

## 5. Launch scope and priority

Priority describes business value, not build order. Build order is defined in `docs/IMPLEMENTATION_PLAN.md`.

### P0 — the product is not sellable without these

- Season creation and active-season context.
- Persistent local storage with schema versioning.
- Recipient management with optional per-recipient budget caps.
- Gift management with planned budget, actual cost, and statuses.
- Correct budget and progress calculations.
- Complete JSON backup and restore.
- Explicit, safe deletion behavior.
- Responsive, professional interface with light/dark themes.
- Offline launch validated against the actual delivered artifact.

### P1 — the core customer experience

- Dashboard with summary cards, progress, charts, and countdown.
- Idea Bank with conversion to gifts.
- Shopping List grouped by store and printable.
- Search, filters, sorting, and recipient detail pages.
- Multiple seasons, archives, and restoration.
- CSV export.
- Sample data that can be removed without touching real data.
- Onboarding for first-time customers.

### P2 — valuable after launch

- Online edition with accounts and synchronization.
- Password-encrypted backups.
- Additional charts (spending by category, season-over-season history).
- Budget templates and rollover.
- Gift photo attachments.
- Optional desktop application wrapper.
- Localization beyond currency/locale formatting.

### Explicitly out of scope

See §18.

---

## 6. Information architecture

### Routes

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Dashboard | Season budget, spending, progress, charts, countdown, quick actions |
| `/gifts` | Gifts | Full gift table with search, filters, sorting, create/edit/delete |
| `/recipients` | Recipients | Recipient cards/list with caps and spending progress |
| `/recipients/:recipientId` | Recipient detail | One recipient's budget, gifts, progress, and actions |
| `/ideas` | Idea Bank | Potential gifts, conversion to gifts |
| `/shopping` | Shopping List | Unpurchased gifts grouped by store, printable |
| `/seasons` | Seasons & Archives | Season list, create, switch, archive, restore, delete |
| `/settings` | Settings | Currency, theme, data tools, sample data, diagnostics, privacy |
| `/onboarding` | Onboarding | First-run setup (only when not completed) |
| `/recovery` | Storage recovery | Blocking error guidance when storage cannot be opened |
| `*` | Not found | Friendly recovery link to Dashboard |

The navigation shows: **Dashboard, Gifts, Recipients, Idea Bank, Shopping List, Archives, Settings**. "Archives" is the navigation label for `/seasons`, which contains both active-season management and archived seasons.

### Shell

- Desktop: persistent left sidebar, top header with product name, active season switcher, theme toggle.
- Tablet: collapsible sidebar.
- Mobile: top bar plus bottom navigation or accessible drawer; primary actions reachable with one hand.
- Header always makes the active season visible. Switching seasons is an explicit action.
- When there is no active season, all data pages show a "No active season" state with **Create season** and **Restore archived season** actions. Settings remains available.

### First run

1. Welcome and a one-sentence explanation of local data storage.
2. Create the first season: name (default `Christmas {year}`), holiday date (default 25 December; next upcoming if today is after 25 December), optional season budget.
3. Choose currency symbol/format and theme (defaults: USD/`$`, system theme).
4. Optional: load sample data, or continue to an empty dashboard.
5. Completion is stored; onboarding does not repeat unless the user resets it.

Onboarding can be skipped only by choosing "Start with an empty season"; the app must not create placeholder recipients or gifts automatically.

Implementation sequencing: a minimal first-season setup ships by Milestone 3 so recipients and gifts can be used; full onboarding polish and season/archive management arrive in Milestones 8–9. Until then, the app must never invent a season silently.

---

## 7. Functional requirements

### 7.1 Seasons and active context

- A season has a name, a holiday date, an optional overall budget, and a status of `active` or `archived`.
- The app supports **zero or one active season**. It never mixes records from two active seasons.
- Exactly one season is the active context for Dashboard, Gifts, Recipients, Ideas, and Shopping.
- Creating a season can optionally copy the current season's recipient names, relationships, and budget caps. It never copies gifts or ideas by default.
- Switching seasons is immediate and requires no reload.
- Archiving is non-destructive: all records remain and the season becomes read-only until restored.
- Restoring an archived season makes it active and, if another season is active, requires confirmation to archive that season in the same operation.
- Deleting a season is allowed only while it is archived and requires typing the season name. It permanently deletes its recipients, gifts, and ideas after an explicit confirmation.
- A new season MUST NOT silently replace or erase a previous season.

### 7.2 Dashboard

The Dashboard is computed entirely from persisted data in the active season. It updates automatically after any change without a manual refresh.

Required elements:

1. Season budget card, with "Set budget" action when unset.
2. Planned spending card (sum of gift planned budgets).
3. Actual spending card (sum of actual costs for bought gifts).
4. Remaining budget card, showing negative values as over budget.
5. Planned-vs-budget indicator, clearly distinct from actual-vs-budget.
6. Bought progress, wrapped progress, sent progress, each with count and percentage.
7. Budget-vs-actual grouped bar chart by recipient.
8. Holiday countdown.
9. Quick actions: Add gift, Add recipient, View shopping list, Backup.
10. Data-quality alerts when relevant:
    - Bought gifts without an actual cost.
    - Spending above the season budget.
    - Recipients above their budget caps.
    - Planned spending above the season budget.
    - Unbudgeted gifts.

Empty state: when the active season has no gifts, the dashboard shows a clear first-step panel instead of zero-filled charts, and explains the difference between budget, planned, and spent in one short sentence.

Archived seasons MUST NOT contribute to any dashboard figure.

### 7.3 Recipients

- List all recipients in the active season with name, relationship, budget cap, planned, spent, remaining cap, and progress.
- Create, edit, and delete recipients.
- Recipient fields: name (required), relationship (optional), budget cap (optional, non-negative money), notes (optional).
- Duplicate recipient names are allowed; stable IDs distinguish records.
- Spending and planned totals are computed from gifts, never entered or stored on the recipient.
- A recipient with gifts cannot be deleted in one thoughtless click. The delete dialog offers:
  1. Move gifts to another recipient, then delete, or
  2. Delete the recipient and its gifts, with the gift count stated.
  3. Cancel.
  Ideas assigned to the recipient become unassigned; they are never deleted by a recipient deletion.
- Recipient detail page shows the cap, planned, spent, remaining cap, utilization, progress, and the recipient's gifts with edit access.

### 7.4 Gifts

- Gifts are listed in a responsive table (cards on mobile) and can be created, edited, and deleted.
- A gift belongs to exactly one recipient in the same season. Every gift requires a recipient. (For ambiguous cases, the user can create a recipient such as "Family gifts".)
- Gift fields:
  - name (required)
  - recipient (required, same season)
  - category (optional, suggestions allowed)
  - store (optional)
  - purchase link (optional, `http`/`https` only)
  - planned budget (optional, non-negative money)
  - actual cost (optional, non-negative money)
  - bought (boolean), bought date (optional date)
  - wrapped (boolean), wrapped date (optional date)
  - sent (boolean), sent date (optional date)
  - delivery method (optional enum: hand-delivered, shipped, digital, retailer-direct, other)
  - address (optional, sensitive)
  - notes (optional, sensitive)
- Bought, wrapped, and sent are explicit, independently stored states. No status is inferred from another.
- Logical progression is enforced:
  - A gift must be bought before it can be marked wrapped or sent.
  - Wrapping is **not** required before sending; retailer-direct gifts can be bought and sent without being wrapped.
  - Un-marking bought while wrapped or sent requires confirmation and clears wrapped and sent.
- If a gift is marked bought without an actual cost, it counts toward purchased progress but contributes zero to actual spending and is flagged. The app does not silently substitute the planned budget.
- Actual cost may be entered before purchase, but it does not count as spent until the gift is bought.
- Deleting a gift requires confirmation. If the gift came from an idea, that idea returns to the Idea Bank (see §8.5).
- A deeplink ("Open store") opens in a new tab with `noopener noreferrer`. Invalid or missing links are rendered as unavailable, never as broken navigation.

### 7.5 Idea Bank

- Ideas are potential gifts stored in the active season, with name (required), optional recipient, category, store, purchase link, estimated price, and notes.
- Ideas can be searched, created, edited, and deleted.
- An idea can be converted into a gift in one action:
  - Requires a recipient. If the idea has no recipient, the user selects one during conversion.
  - Copies name, category, store, link, estimated price (as planned budget), and notes into the new gift.
  - Marks the idea `converted` and links it to the gift.
  - Is atomic and idempotent: repeated clicks or retries cannot create duplicate gifts.
- Converted ideas remain visible with a "Converted" badge and a link to the gift. They are read-only except for deleting them or reopening them when the linked gift no longer exists.
- Reopening a converted idea makes it active again without creating or deleting a gift.
- Deleting an idea never deletes its converted gift; the gift's source reference is cleared.
- Ideas are excluded from budget totals, progress, and the Shopping List.

### 7.6 Shopping List

- Derived automatically. No separately editable list is stored.
- Contains gifts in the active season where `bought = false`.
- Grouped by store; gifts with no store appear last under "No store specified".
- Each row shows recipient, gift name, planned budget, and an external purchase link when present.
- Shows a group subtotal of planned budgets and a season total for visible items.
- A purchased gift disappears immediately; unrelated gifts are unaffected.
- Optional convenience: mark bought from the list (with the same status rules) and record actual cost. This control is excluded from print.
- Print layout contains only the list title, season, date, groups, and rows; navigation, filters, and buttons are hidden.
- Empty state explains that everything is bought or that no gifts exist yet.

### 7.7 Search, filters, and sorting

Gifts page:

- Search matches gift name, recipient name, category, and store. Matching is case-insensitive, diacritic-insensitive, and substring-based (minimum 1 character).
- Filters: recipient, category; bought (any/yes/no), wrapped (any/yes/no), sent (any/yes/no).
- Filters combine with AND semantics. Search and filters compose.
- Sorting: gift name, recipient, planned budget, actual cost, status, updated date. Default: recipient ascending, then gift name ascending.
- "Clear all" resets search, filters, and sorting to defaults.
- No-results state distinguishes "no gifts at all" from "no matches", and offers clear filters.
- Search/filter state never mutates stored data.
- Idea Bank has its own simple search over idea name, recipient, category, and store.

Recipient detail page lists only that recipient's gifts, with the same statuses and calculations.

### 7.8 Backup, restore, CSV, and data safety

- **JSON backup** contains all seasons, recipients, gifts, ideas, settings, and schema metadata needed to reconstruct the app. It is a single downloadable `.json` file with a clear filename including the date.
- **Restore** validates the entire file before changing anything:
  - File format and version.
  - Schema version compatibility.
  - Required fields and types.
  - Referential integrity: every gift and idea points to an existing season; every gift points to an existing recipient in the same season; no duplicate IDs; no duplicate idea-to-gift conversion.
  - Money and date validity.
- On validation failure, the app reports a clear summary with a limited list of errors and imports nothing.
- Restore mode in the launch release is **replace all**, gated by:
  1. A warning that current data will be replaced.
  2. An automatic pre-restore backup download (or an explicit "Download backup first" step if the browser blocks it).
  3. Typed confirmation.
  4. A single atomic transaction; partial imports are impossible.
- Merge/import-into-existing is not offered in the launch release. It is a P2 decision because merging stable IDs and conflicts is materially harder to make safe.
- **CSV export** exports gift rows for the active season (or all seasons, selectable) with: Season, Recipient, Gift, Category, Store, Purchase URL, Planned Budget, Actual Cost, Bought, Bought Date, Wrapped, Wrapped Date, Sent, Sent Date, Delivery Method, Source.
- Notes and addresses are excluded by default; an explicit opt-in includes them. The UI warns that the backup/CSV may contain personal information.
- CSV uses RFC 4180 quoting, CRLF line endings, a UTF-8 BOM for spreadsheet compatibility, ISO dates, and dot decimal separators.
- **Reset all data** is a separate destructive action requiring typed confirmation and a pre-reset backup. It is never performed during startup, upgrade, or sample-data operations.

### 7.9 Settings

- Currency: symbol, currency code, and fraction digits (0–3), with presets for common currencies and a custom option. Defaults: USD, `$`, 2.
- Changing currency formatting when monetary data exists requires confirmation and recommends a backup. Amounts are stored in minor units and are **not** converted; the selected currency describes the values the user enters.
- Theme: light, dark, or system. Persisted per device.
- Data tools: export backup, restore backup, export CSV, load sample data, remove sample data, reset all data.
- Diagnostics: storage health, record counts, browser support notes, app version, schema version. No personal data is transmitted.
- Privacy summary: where data is stored, what backups contain, and that the offline edition makes no network requests for core features.
- About: version, license, support contact.

### 7.10 Sample data

- Sample data is a clearly labeled season named **"Sample Christmas (demo)"**, flagged `isSample`, containing realistic recipients, gifts, ideas, and budgets.
- Loading sample data:
  - If the app is empty, the sample season becomes active.
  - If real data exists, the sample season is added as archived so it cannot contaminate real totals.
  - Loading twice does not create duplicate sample seasons.
- Removing sample data deletes only the sample season and its records. It never touches real seasons.
- Sample figures are labeled as sample data everywhere they appear; they must not look like the customer's own records.

---

## 8. Authoritative business rules

These rules are normative. Calculations are defined precisely in `docs/DATA_MODEL.md` §7 and must be implemented once, in the domain layer.

### 8.1 Definitions

| Term | Definition |
| --- | --- |
| **Season** | A Christmas planning period with its own recipients, gifts, ideas, budget, and holiday date. |
| **Bought** | The user has paid for or placed the order for the gift. A budget, idea, or intention is not "bought". |
| **Wrapped** | The gift is physically wrapped or otherwise prepared in its final presentation. Retailer gift-wrap may count if the user confirms it. |
| **Sent** | The gift has been handed over, shipped, or digitally delivered. For retailer-direct orders, the user marks sent when the retailer confirms dispatch or delivery. |
| **Season budget** | The user's overall spending limit for the season. Optional. |
| **Planned spending** | The sum of gift planned budgets. A forecast, not money spent. |
| **Actual spending** | The sum of actual costs of gifts marked bought and having a recorded cost. |
| **Recipient cap** | An optional per-recipient spending limit, independent of the season budget. |
| **Unbudgeted gift** | A gift with no planned budget. It is valid but flagged in data-quality summaries. |

### 8.2 Budget model

The three amounts are distinct and must never be substituted for each other:

1. **Season budget (B)** — an overall limit set by the user.
2. **Planned spending (P)** — Σ planned budget of every gift in the season (bought or not).
3. **Actual spending (A)** — Σ actual cost of bought gifts with a recorded actual cost.

Derived:

- Remaining budget = `B − A` (negative means overspent).
- Unallocated budget = `B − P` (negative means the plan exceeds the budget).
- Recipient spent = Σ actual cost of that recipient's bought gifts with a recorded cost.
- Recipient planned = Σ planned budgets of that recipient's gifts.
- Recipient remaining cap = `cap − recipient spent`.
- Recipient utilization = `recipient spent ÷ cap` (may exceed 100%).

Rules:

- A bought gift with no actual cost contributes 0 to actual spending and is flagged. It is never silently valued at its planned budget.
- An unbought gift with an actual cost contributes 0 to actual spending; the amount is informational only.
- A gift with neither planned nor actual cost is valid; it is unbudgeted.
- Zero-value gifts are valid and are not treated as missing.
- Archived seasons are excluded from active-season totals by scoping queries to the active season; they are never "subtracted".
- The sum of recipient caps does not have to equal the season budget. The app may show the sum as information but must not enforce equality.
- If the season budget is unset, remaining and unallocated are `null` and the UI prompts the user to set a budget. It must not display `$0` as if a limit existed.

### 8.3 Status model and transitions

Stored as three booleans plus optional dates. Display labels are derived.

| Action | Allowed | Behavior |
| --- | --- | --- |
| Mark bought | Always (if gift exists) | Sets `bought = true`; defaults `boughtOn` to today if empty. |
| Unmark bought | Only when wrapped and sent are false, or after explicit confirmation | Clears `bought`, `boughtOn`, `wrapped`, `wrappedOn`, `sent`, `sentOn`; keeps actual cost. Actual cost stops counting as spent. |
| Mark wrapped | Only when bought | UI offers "Mark bought & wrapped" as a single atomic action when not bought. Directly setting wrapped on an unbought gift is rejected. |
| Unmark wrapped | Always | Allowed even when sent (retailer-direct gifts are not wrapped by the user). |
| Mark sent | Only when bought | UI offers "Mark bought & sent" when not bought. Wrapping is not required. |
| Unmark sent | Always | Clears `sentOn`. |
| Delete gift | Always, with confirmation | Removes the gift; purchased progress and spending recalculate. |

Status label precedence: `Sent` > `Wrapped` > `Bought` > `Not bought`, with secondary indicators showing combined states (e.g., "Bought · Wrapped · Sent"). The label is never the source of truth.

### 8.4 Deletion policy

- **Gift:** permanent after confirmation; no soft delete in the launch schema. Associated idea is returned to active (see 8.5).
- **Idea:** permanent after confirmation; a converted gift remains and its `sourceIdeaId` is cleared.
- **Recipient:** blocked until the user chooses to move gifts to another recipient or explicitly delete the recipient's gifts. Ideas assigned to the recipient become unassigned. The dialog states the number of gifts affected.
- **Season:** archived seasons only; requires typing the season name; removes the season and all child records atomically. The active season cannot be deleted.
- **Sample season:** removable through "Remove sample data" without the typed confirmation, but still behind a confirmation dialog; only `isSample` records are affected.
- No destructive operation may run implicitly during app startup, migration, season switching, or sample-data loading.

### 8.5 Idea conversion

1. Source idea must be `active` and belong to the active season.
2. A recipient must be resolved; if the idea has none, the user selects one before conversion.
3. In one transaction:
   - Create the gift with copied fields and `sourceIdeaId = idea.id`.
   - Set `plannedBudgetMinor` from the idea's estimated price.
   - Set idea `status = converted`, `convertedGiftId = gift.id`, `convertedAt = now`.
4. A unique constraint on `gifts.sourceIdeaId` plus the status check prevents duplicate conversion.
5. If any step fails, neither record changes.
6. Deleting the resulting gift sets the idea back to `active`, clears `convertedGiftId`/`convertedAt`, and informs the user. The idea's content is preserved.
7. Deleting the idea nulls `gift.sourceIdeaId`; the gift is untouched.
8. Converted ideas are excluded from shopping and budgets.

### 8.6 Season lifecycle

```
(no active season) --create--> active --archive--> archived --restore--> active
                                   |                         ^
                                   +------delete------------+ (typed confirm)
```

- Archive: allowed at any time, non-destructive, sets `status = archived` and `archivedAt`.
- If the archived season was active, the app moves to "no active season" unless the user creates or restores one in the same flow.
- Restore: if another season is active, confirm archiving it first; then set the restored season active. The result is never two active seasons.
- Archived seasons are read-only for recipients, gifts, and ideas. They can be viewed, summarized, backed up, and exported.
- Creating a new season never copies gifts or ideas. Copying recipients is opt-in.

### 8.7 Holiday countdown

- Uses the season's `holidayDate` and the user's local calendar date.
- Future: "N days until {holiday}".
- Today: "Today is {holiday}".
- Past: "N days since {holiday}" and a gentle prompt to archive the season or start the next one.
- Date arithmetic uses calendar-day components, not elapsed milliseconds, to avoid daylight-saving errors.
- The countdown refreshes at midnight, when the tab regains visibility, and on data change.

### 8.8 Data integrity invariants

- Every gift's `seasonId` equals its recipient's `seasonId`.
- Every idea's `recipientId`, when set, belongs to the idea's season.
- All IDs are unique and never reused.
- `wrapped = true` implies `bought = true`; `sent = true` implies `bought = true`.
- Money values are non-negative integers in minor units and within the documented safe range.
- Date-only fields are valid `YYYY-MM-DD`; timestamps are valid ISO 8601 UTC.
- At most one season has `status = active`.
- The settings `activeSeasonId`, when set, references an existing active season.
- These invariants are validated before writes and on backup import; violation is a bug or a corrupt file, never silently repaired.

---

## 9. UX states and error handling

Every data page implements:

| State | Requirement |
| --- | --- |
| Loading | Skeleton or subtle loading indicator; never a flash of "no data" before data resolves. |
| Empty (no season) | Explanation plus Create/Restore actions. |
| Empty (season, no records) | Specific first-step copy and primary action. |
| No results (filters) | Distinguish from empty; offer Clear filters. |
| Error | Human-readable message, retry action, and a path to Diagnostics. Never a blank screen. |
| Storage unavailable | Blocking recovery page explaining the browser/storage problem and safe next steps; no fake success states. |
| Read-only (archived) | Clear badge and disabled editing controls with an explanation; Restore action available. |
| Saved | No noisy success toast for ordinary edits; inline confirmation or subtle status is sufficient. Destructive or exported actions confirm clearly. |

Input rules:

- Required fields are marked and validated on blur and submit.
- Numeric money input accepts a symbol, spaces, and thousands separators; rejects negative values, multiple decimal separators, and values beyond the safe maximum.
- Purchase links must parse as `http:` or `https:`; `javascript:` and `data:` URLs are rejected.
- Long text fields have documented maximum lengths and counters when near the limit.
- Validation messages are associated with fields and announced to assistive technology.

---

## 10. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Dashboard and gift list interactive within 1 second for 100 gifts / 30 recipients on a mid-range laptop; 2 seconds on a mid-range phone. |
| Reliability | No data loss on refresh, navigation, or ordinary errors. Destructive operations are explicit and atomic. |
| Offline | All core features work with the network disabled after the documented setup; no remote fonts, icons, scripts, or APIs required. |
| Accessibility | WCAG 2.2 AA target: keyboard access, visible focus, labels, contrast, semantic tables, focus-trapped dialogs, status not conveyed by color alone, reduced-motion support. |
| Responsive | Usable at 360 px width and above; tables do not force page-level horizontal scrolling; touch targets at least 44×44 px. |
| Browser support | Current Chrome/Edge, Firefox, and Safari; iOS Safari 16.4+ with caveats documented. No Internet Explorer. |
| Privacy | Offline edition sends no user data over the network. No analytics or tracking by default. |
| Security | URL scheme validation, React output escaping, no secrets in client code, CSP-compatible build, no CDN dependencies. |
| Maintainability | Domain logic independent of React and storage; one authoritative implementation per calculation. |
| Portability | Full backup round-trip; CSV opens in Excel, Numbers, and Google Sheets. |
| Testability | Domain and storage layers covered by automated tests; core workflows covered by browser tests. |

---

## 11. Offline edition delivery

### Decision status

Decided 2026-10-30 in Milestone 10: **A. Installable PWA from a hosted URL** is the delivered offline edition. The customer opens a hosted page once, installs or saves it, and thereafter can launch and use it offline. Assets are precached; data lives in IndexedDB. One-time internet access is required, and install flows differ by browser; the setup guide states both.

**B. Self-contained downloadable package (evaluated, not shipped).**
A single-file build was produced and tested from `file://` in Microsoft Edge: the app launched and kept IndexedDB records across reload and browser restart, but `file://` cannot register a service worker. Firefox, Safari, iOS/iPadOS, and Android were not available for testing. Because the full matrix is incomplete and the raw file would behave inconsistently, a standalone file is NOT advertised as reliably storing data, and no ZIP/HTML download is offered as the offline edition. A thin local launcher/desktop wrapper was considered (O-12) and is out of scope unless the owner reverses that decision.

### Requirements that apply regardless of method

- Cache the application shell, scripts, styles, fonts, icons, and all required assets.
- No mandatory network request after setup for any core feature.
- IndexedDB remains available and functional offline.
- A visible offline/online indicator in the online edition; the offline edition may show a subtle "Offline — all data saved on this device" indicator.
- Updates prompt the user; they never reload the app while a form has unsaved work without warning.
- Storage-error recovery guidance is available.
- Browser support and setup steps are documented accurately in the customer package.
- The actual delivered artifact is tested, not only the development server.

### Data persistence expectations

- The app lets the user request persistent storage (`navigator.storage.persist()`) from Settings where supported and explains the result (**D-030**). It is user-initiated, not a startup prompt.
- Backups are the ultimate recovery path; the UI recommends them, especially before clearing browser data or changing devices.
- The app does not promise that clearing browser data, using private browsing, or storage eviction by the browser preserves records.
- iOS storage eviction and install behavior are documented limitations.

---

## 12. Online edition boundaries (planned, not launch)

The online edition adds, without changing domain rules:

- Account registration, sign-in, sign-out, password recovery, account deletion.
- Cloud persistence scoped to the authenticated user.
- Cross-device synchronization with a documented conflict strategy.
- Visible sync status and actionable errors.
- Offline editing with queued changes.
- Export of cloud data and account-level data deletion.

Constraints:

- The local database remains the working copy; a cloud outage must not block core planning.
- One user's records must never be readable or writable by another user; server-side authorization is mandatory, not client-side filtering.
- Conflicts are surfaced, not silently overwritten.
- The offline edition remains installable and account-free.
- No payment processing or subscription enforcement in the initial online release.

The recommended backend is Supabase (PostgreSQL, Auth, Row Level Security) unless Milestone 11 documents a compelling alternative. Exact synchronization design is deferred to that milestone and must be specified before implementation.

---

## 13. Privacy and security

Data the customer may enter: names, relationships, gift ideas, stores, purchase links, costs, delivery addresses, and personal notes.

Launch behavior:

- All data is stored locally in the browser's IndexedDB on the customer's device.
- The offline edition makes no network requests for core features and contains no analytics, telemetry, advertising, or third-party trackers.
- External links open only when the user activates them, in a new tab with `noopener noreferrer`.
- Backups and CSV exports contain personal data. The UI warns before export, excludes addresses/notes from CSV by default, and advises storing backups securely.
- Backups are not encrypted in the launch release. Password-encrypted backups are P2. The UI must not imply encryption.
- The app recommends against entering sensitive information on a shared device and explains how to clear data.
- No secrets or privileged keys exist in client code.
- Data is not sent to any cloud service in the offline edition.
- The online edition will disclose exactly what is transmitted and provide export/deletion.

Threat considerations: malicious backup files (strict validation, no code execution), XSS through user text (React escaping, URL allowlist), shared-device access (documented, optional future passcode), supply-chain risk (locked dependencies, no CDN, license review).

---

## 14. Marketing and claims guardrails

Allowed after verification:

- "Plan gifts, budgets, and shopping in one place."
- "Your data stays on your device."
- "Works offline after a one-time setup." (Verified in Milestone 10 for the hosted PWA in Chromium; setup steps must state the one-time internet access and browser limitations.)
- "No account required for the offline edition."
- "Back up and restore your data."
- "Reuse it year after year with seasons and archives."
- "Includes a sample plan to explore."

Not allowed unless proven and documented:

- "Works forever with no internet, ever."
- "Download one HTML file and it just works" (unless the standalone test matrix passes).
- "Syncs across devices" (offline edition).
- "Encrypted backups" (launch edition).
- "Automatic cloud backup."
- "Never lose your data."
- Screenshots of features that are not implemented or are placeholder content.

---

## 15. Success criteria

The launch release is successful when:

1. A new customer can install/open it, create a season, add recipients and gifts, and understand the budget in under 10 minutes using only the supplied instructions.
2. All core workflows pass automated and manual acceptance tests, including offline operation of the delivered artifact.
3. Backup → clear → restore reproduces the dataset exactly, including relationships.
4. No known critical defect remains in data loss, privacy, calculation accuracy, or core workflow.
5. Customer-facing documentation matches actual behavior, including offline setup and browser limitations.
6. The Etsy package contains everything needed to start without developer intervention.

No analytics are collected by default. Product learning comes from support requests, reviews, and voluntary feedback.

---

## 16. Assumptions

Low-risk assumptions made for this specification (also recorded in `docs/DECISIONS.md`):

1. The product is single-user per browser profile; household sharing happens through backup files, not accounts.
2. Gifts require a recipient; a "Family gifts" recipient covers shared gifts.
3. Gift planned budget and actual cost are optional; missing actual cost is flagged, not guessed.
4. The season budget is optional and distinct from planned spending and recipient caps.
5. Recipients belong to one season and are copied (not shared) into new seasons on request.
6. Launch supports replace-all restore only; merge is deferred.
7. Money uses integer minor units; the launch UI exposes a single app-wide currency definition.
8. The offline edition is account-free and does not sync.
9. English-only UI for launch; dates and numbers follow the browser locale.
10. No AI features inside the product.
11. The default season is the upcoming 25 December.
12. Sample data is isolated in a flagged season and removable without risk to real records.

---

## 17. Decisions requiring owner approval

These materially affect scope or promise. Recommendations are in `docs/DECISIONS.md`.

| ID | Decision | Recommendation | Blocks |
| --- | --- | --- | --- |
| O-1 | Offline delivery: PWA-only, standalone HTML, or desktop wrapper | PWA first; test standalone in Milestone 10; add wrapper only if needed | Decided 2026-10-30 — hosted PWA shipped; single-file build not shipped |
| O-2 | Product name and brand | Keep "Christmas Gift Tracker"; decided 2026-10-30 to refine the warm/evergreen/burgundy/gold identity rather than rename | Milestone 9, packaging |
| O-3 | Currency defaults and supported presets | USD default; symbol + 0–3 fraction digits; no conversion | Milestone 2/9 |
| O-4 | Recipient deletion default | Block; offer reassign or explicit cascade | Milestone 3 |
| O-5 | Online edition in the first Etsy release? | No; ship offline first | Milestone 11, listing |
| O-6 | Restore mode | Replace-all only, with pre-restore backup | Milestone 8 |
| O-7 | Sample data behavior when real data exists | Add as archived sample; never mix | Milestone 2/8/12 |
| O-8 | Whether to allow zero active seasons | Yes, with a dedicated empty state | Milestone 2/3 |
| O-9 | Store toggle for "mark bought from Shopping List" | Include as a convenience, excluded from print | Milestone 6 |
| O-10 | Require actual cost when marking a gift bought? | No; allow and flag the missing cost | Milestone 4 |
| O-11 | Add a "does not need wrapping" exemption? | No for launch; document the progress limitation | Milestone 5 |
| O-12 | Support a standalone desktop wrapper for Etsy? | Only if Milestone 10 proves PWA delivery insufficient | Decided 2026-10-30 — no wrapper; revisit only with a separate owner decision |

Approval of this specification approves the recommendations unless an item is explicitly changed. Milestone 0 is complete when these are reviewed; Milestone 1 does not depend on O-1, O-2, O-5, O-6, O-11, or O-12.

---

## 18. Out of scope (launch)

- Accounts, cloud sync, collaboration, sharing, permissions.
- Payments, licensing, subscriptions, trials.
- AI recommendations, chatbots, generated messages.
- Receipt photos, attachments, barcode scanning.
- Shipping carrier integration, tracking numbers, label printing.
- Tax, discounts, refunds, returns, multi-currency conversion.
- Recurring gifts, wishlists shared with recipients, public links.
- Import from competitors' spreadsheets (CSV import is not planned; backup restore only).
- Localization of interface copy.
- Native mobile apps.
- Server-side rendering or SEO marketing pages.

---

## 19. Glossary

| Term | Meaning |
| --- | --- |
| Active season | The one season currently used by all planning pages. |
| Archived season | A read-only prior season that can be restored. |
| Actual cost | Money the user records as spent on a bought gift, in minor units. |
| Bought | Explicit purchase status. |
| Budget cap | Optional per-recipient limit. |
| Gift | A concrete planned or purchased item assigned to a recipient. |
| Idea | A potential gift that is not part of budgets or shopping until converted. |
| Minor units | Integer currency units (cents for USD), used to avoid floating-point errors. |
| Planned budget | Forecast cost attached to a gift. |
| Season budget | Overall optional spending limit for a season. |
| Sent | Explicit handover/shipping/digital-delivery status. |
| Wrapped | Explicit gift-preparation status. |

---

## 20. Owner review guide

The seven questions that must be settled before implementation, with normative answers:

| Question | Answer | Detail |
| --- | --- | --- |
| What counts as bought, wrapped, or sent? | Explicit user-set states. Bought = paid or order placed. Wrapped = prepared in final gift form (retailer wrap can count). Sent = handed over, shipped, or digitally delivered. Wrapped and sent require bought; wrapping is not required before sending (retailer-direct gifts). Un-buying while wrapped/sent requires confirmation and clears them. | §8.1, §8.3; DATA_MODEL §6 |
| How are recipient budgets different from the overall budget? | The season budget is an overall limit. Planned spending is the sum of gift budgets. Actual spending is the sum of bought gifts' actual costs. Recipient caps are optional, independent limits. None is silently substituted for another, and the sum of caps need not equal the season budget. | §8.2; DATA_MODEL §7 |
| What happens when a gift is deleted? | It is permanently removed after confirmation, totals recalculate, and if it came from an idea, the idea returns to the Idea Bank with its content intact. No other records are silently deleted. | §8.4; DATA_MODEL §6.3 |
| How is an idea converted without losing the original idea? | In one transaction, a gift is created from copied idea fields and linked through a unique source reference; the idea becomes "Converted" and remains visible. Repeated conversion cannot create duplicates. Deleting the gift reopens the idea. | §8.5; DATA_MODEL §6.4 |
| What happens when a new Christmas season starts? | A new, isolated season is created (optionally copying recipient names/caps with new IDs). Gifts and ideas are not copied. Prior seasons are archived, never erased, and become read-only until restored. Only one season is active. | §7.1, §8.6; DATA_MODEL §6.6 |
| How will customers back up their data? | A versioned JSON backup containing all seasons and records. Restore is replace-all only, validates the whole file, offers a pre-restore backup, requires confirmation, and commits atomically. CSV export is separate. | §7.8; DATA_MODEL §10–11 |
| How will the downloadable version work without internet access? | The launch edition is an installable offline-first PWA with a documented one-time online setup. All assets are local and IndexedDB stores data. A standalone `file://` HTML file is tested in Milestone 10 but not promised unless it passes; copy must match reality. | §11; DECISIONS D-011 |

---

## 21. Related documents

- `docs/ARCHITECTURE.md` — technical design and delivery architecture.
- `docs/DATA_MODEL.md` — entities, invariants, calculations, migrations, backup format.
- `docs/ACCEPTANCE_CRITERIA.md` — testable criteria per milestone.
- `docs/DECISIONS.md` — accepted decisions, assumptions, and open questions.
- `docs/IMPLEMENTATION_PLAN.md` — milestone sequence and status.
- `docs/MILESTONE_0_REPORT.md` — specification milestone completion report.
- `AI_DEVELOPMENT_PROTOCOL.md` — permanent agent working rules.
