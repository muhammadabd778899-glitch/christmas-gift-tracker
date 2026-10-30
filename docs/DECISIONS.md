# Christmas Gift Tracker — Decision Log

> Status: Approved through Milestone 6; later decisions remain proposed · Version 0.6 · 2026-10-28
> Format: lightweight ADRs. Statuses: **Proposed**, **Accepted**, **Superseded**, **Rejected**.
> Decisions marked Proposed become binding when the owner approves the milestone that depends on them.

---

## How decisions are managed

1. A decision that affects architecture, data safety, security, customer-facing behavior, or scope is recorded here.
2. Low-risk implementation details may be decided inline and mentioned in the milestone report without an ADR.
3. Decisions are never silently reversed. A reversal adds a new entry that supersedes the old one.
4. Each milestone report references any new or changed decisions.
5. Open decisions (O-*) block the milestone named in their row.

---

## Accepted and proposed decisions

### D-001 — React + TypeScript + Vite stack

**Status:** Accepted 2026-10-26 · **Milestone:** 1

**Context:** The product needs a polished, interactive interface, fast iteration, and a static build that can run offline.

**Decision:** Use React 19 with TypeScript, built by Vite. Add React Router, CSS Modules with design tokens, Recharts, and a small set of focused libraries (see Architecture §3).

**Consequences:** Mature ecosystem and offline static build. No SSR. Dependencies are pinned and vetted; no runtime CDN.

---

### D-002 — Local-first architecture

**Status:** Accepted 2026-10-26 for Milestone 2 · **Milestone:** 2

**Context:** The offline edition must work without an account or network, and the online edition must not block planning during outages.

**Decision:** IndexedDB is the working copy and source of truth for the offline edition. Every core operation reads/writes locally. The online edition later layers cloud sync on top; it does not replace local operations.

**Consequences:** Excellent offline behavior and privacy. Sync conflict handling becomes a deliberate future design. Backups are essential. No server-side features are required at launch.

---

### D-003 — Dexie as the IndexedDB access layer

**Status:** Accepted 2026-10-26 for Milestone 2 · **Milestone:** 2 · The reactive-hook portion is superseded by D-025; Dexie remains the access layer.

**Context:** The storage layer needs migrations, transactions, indexes, and reactive updates. A hand-written wrapper would require custom code for each.

**Decision:** Use Dexie 4. Validate all writes with Zod in the domain layer before they reach Dexie. The React live-query hook choice is recorded in D-025.

**Consequences:** Less custom storage code and reliable live queries. Dexie’s upgrade model must be tested with fixtures. Raw IndexedDB is accessed only inside the storage layer.

---

### D-004 — Money stored as integer minor units

**Status:** Accepted 2026-10-26 for Milestone 2 · **Milestone:** 2

**Context:** Floating-point money arithmetic produces rounding errors and inconsistent totals.

**Decision:** Store all amounts as non-negative safe integers in minor units, with a single app-wide currency definition (`currencyCode`, `currencySymbol`, `fractionDigits` 0–3). Parse and format through one money module. No floating-point totals.

**Consequences:** Correct arithmetic and straightforward tests. Currency changes are formatting changes, not conversions. Extra decimal input is rejected, not silently rounded.

---

### D-005 — Seasons scope all planning records

**Status:** Accepted 2026-10-26 for Milestone 2 · **Milestone:** 2

**Context:** Mixing gifts across years would corrupt budgets and archives.

**Decision:** Recipients, gifts, and ideas belong to exactly one season. Queries are scoped by season. Recipients are copied into a new season on request, with new IDs, never shared. Gifts and ideas are never copied by default.

**Consequences:** Strong isolation and simple archives. Cross-season moves are delete-and-recreate operations. Copying recipients is an explicit convenience.

---

### D-006 — Explicit status booleans, not inferred labels

**Status:** Accepted 2026-10-26 for Milestone 2 schema · **Milestone:** 2/4

**Context:** “Wrapped” does not always mean “bought,” and retailer-direct gifts may be sent without being wrapped. Inferring states hides reality.

**Decision:** Store `bought`, `wrapped`, and `sent` as independent booleans with optional dates. Enforce `wrapped ⇒ bought` and `sent ⇒ bought`. Wrapping is not required before sending. Un-buying while wrapped/sent requires confirmation and clears them. Status labels are derived for display only.

**Consequences:** Accurate tracking for direct shipping and digital gifts. Three controls rather than one dropdown. Combined actions (“Mark bought & wrapped”) keep the UI fast.

---

### D-007 — Recipient deletion is blocked until the user chooses a policy

**Status:** Accepted 2026-10-26 for Milestone 2 service · **Milestone:** 2/3

**Context:** Deleting a recipient can orphan or destroy gifts. Silent cascades cause data loss.

**Decision:** A recipient with gifts cannot be deleted without choosing either (a) reassign all gifts to another recipient in the same season, or (b) explicitly cascade-delete the recipient and the stated number of gifts after confirmation. Ideas become unassigned, never deleted. No other path exists.

**Consequences:** Extra dialog steps for a rare action. No accidental gift loss. Reassignment is useful when a recipient merges into “Family gifts.”

---

### D-008 — Idea conversion uses a unique source link and a status

**Status:** Accepted 2026-10-26 for Milestone 2 storage · **Milestone:** 2/6

**Context:** Repeated clicks or retries must not create duplicate gifts, and the original idea should remain recoverable.

**Decision:** A gift created from an idea stores `sourceIdeaId`, protected by a unique index. The idea is marked `converted` and linked to the gift. Conversion is one transaction. Deleting the gift returns the idea to active. Converted ideas are excluded from budgets and shopping.

**Consequences:** Idempotent conversion and a recoverable idea. `sourceIdeaId` must be omitted (not null) when absent to keep the unique index valid (D-019). Deleting a converted gift unexpectedly resurrects the idea, which is intended and communicated.

---

### D-009 — Archived seasons are read-only

**Status:** Accepted 2026-10-26 for Milestone 2 storage · **Milestone:** 2/8

**Context:** Historical figures should stay stable, and edits to archived data could confuse current-season views.

**Decision:** Archived seasons can be viewed, summarized, exported, and backed up, but recipients/gifts/ideas cannot be edited. To edit, the user restores the season, which archives the currently active season after confirmation.

**Consequences:** Safe historical data. A small inconvenience for typo fixes. No silent mixing. Data is never deleted by archiving.

---

### D-010 — Launch restore is replace-all only

**Status:** Proposed · **Milestone:** 8

**Context:** Merging two datasets by stable ID is a conflict-resolution problem that is easy to get wrong and can silently overwrite records.

**Decision:** The launch release supports full replacement only, with validation, a pre-restore backup, typed confirmation, and one atomic transaction. Merge is deferred until it can be designed and tested safely.

**Consequences:** Simple, predictable recovery. Users cannot combine two backups in-app. Restore is clearly described as destructive to current data.

---

### D-011 — Offline edition is PWA-first; standalone HTML is unproven

**Status:** Proposed · **Milestone:** 10 · **Owner approval required**

**Context:** The Etsy promise includes offline use. A hosted site that merely loads once is not offline. A `file://` HTML file has inconsistent IndexedDB and service-worker behavior across browsers.

**Decision:**

1. Build and ship the offline edition as an installable offline-first PWA from a hosted URL, with a one-time setup documented honestly.
2. Cache all required assets; no remote runtime dependencies.
3. In Milestone 10, spike a self-contained file build and test IndexedDB persistence and offline launch in Chrome/Edge, Firefox, and Safari.
4. Only advertise standalone-file delivery if it passes the test matrix. If it fails, use PWA delivery and, if a true file is commercially required, evaluate a thin signed desktop wrapper (Tauri) with the owner before building it.
5. Never claim “forever offline with no setup” or “any HTML file works.”

**Consequences:** A reliable offline product with an honest setup requirement. Etsy copy must state the one-time internet access. A desktop wrapper would add build/signing/size complexity and is not assumed.

**Why not decide standalone now:** The behavior depends on browser implementations and the final artifact, not on intent. Testing is the only credible basis for the promise.

---

### D-012 — Supabase is the recommended V2 online backend

**Status:** Proposed · **Milestone:** 11

**Context:** The online edition needs authentication, a relational database, and strong per-user isolation without building a large backend.

**Decision:** Use Supabase (PostgreSQL, Auth, Row Level Security) for the first online edition unless Milestone 11 documents a compelling constraint. Domain logic remains shared; the client never holds service-role keys.

**Consequences:** Fast, secure baseline with RLS. Vendor dependency and pricing to monitor. A custom backend remains possible without changing the domain.

---

### D-013 — No runtime CDN or third-party assets

**Status:** Accepted 2026-10-26 for Milestone 1 · **Milestone:** 1/10

**Context:** Remote fonts, icons, scripts, or analytics break offline use and leak requests.

**Decision:** Bundle fonts and icons locally. No analytics, tag managers, remote APIs, or CDN assets in the offline edition. All required assets are precached.

**Consequences:** Predictable offline behavior and privacy. Slightly larger bundles and manual font subsetting. License review is required for bundled fonts/icons.

---

### D-014 — Verification gates are mandatory per milestone

**Status:** Accepted 2026-10-26 · **Milestone:** 1 onward

**Context:** AI-generated work can look complete while failing to build or losing data.

**Decision:** Each milestone must run and report typecheck, lint, tests, and production build, plus E2E once available. Criteria in `ACCEPTANCE_CRITERIA.md` must be reported pass/fail/not run. Tests may not be weakened or skipped to force a pass.

**Consequences:** Slower milestones and honest evidence. Defects are caught earlier, when they are cheap.

---

### D-015 — Currency formatting changes do not convert stored amounts

**Status:** Proposed · **Milestone:** 9

**Context:** A customer may switch from `$` to `€` or change decimal places. Implicit conversion would invent exchange rates and corrupt records.

**Decision:** Currency settings describe how the user’s stored minor units are displayed. Changing the symbol/code or fraction digits never changes stored minor units. With data present, the app requires confirmation, explains that values are reinterpreted, and recommends a backup.

**Consequences:** No fake conversions. A user changing fraction digits can make existing amounts appear different; the warning is explicit. Multi-currency per gift is out of scope.

---

### D-016 — Sample data is isolated and removable

**Status:** Accepted 2026-10-26 · **Milestone:** 2 (storage), 8 (UI), 12 (package)

**Context:** Demo data helps customers evaluate the product but must never contaminate real budgets, and it must not look like their data.

**Decision:** The sample is a flagged `isSample` season with fixed IDs and a visible badge. If real data exists, it is added as archived rather than active. Loading is idempotent. Removal deletes only the sample season and children.

**Consequences:** Safe exploration. The sample is excluded from “real data” checks. Screenshots must label it as sample.

---

### D-017 — Theme is mirrored to localStorage for pre-paint only

**Status:** Proposed · **Milestone:** 9

**Context:** Applying the theme from IndexedDB is asynchronous and causes a flash of the wrong theme.

**Decision:** Store the theme authoritatively in Settings (IndexedDB) and mirror only the theme value in `localStorage` for synchronous first paint. The IndexedDB value wins once settings load.

**Consequences:** No theme flash. `localStorage` is not a database and stores no personal data. If the mirror is stale, the UI corrects itself.

---

### D-018 — Zero or one active season

**Status:** Accepted 2026-10-26 for Milestone 2 · **Milestone:** 2/3

**Context:** A user may archive their only season or delete the last active one. Forcing a season to exist would invent data.

**Decision:** The app supports zero active seasons and never allows two. With zero, data pages show a dedicated state offering Create and Restore. Settings remains accessible. Archiving the active season results in zero active unless another is created/restored in the same flow.

**Consequences:** More empty-state handling but no fake seasons or deleted history. Dashboard queries must guard on no active season.

---

### D-019 — `sourceIdeaId` is omitted when absent

**Status:** Accepted 2026-10-26 for Milestone 2 · **Milestone:** 2/6

**Context:** A unique IndexedDB index must not contain duplicate invalid keys. `null` is not a valid IndexedDB key, and a sentinel value would collide.

**Decision:** Persist `sourceIdeaId` only when a gift came from an idea; omit the property otherwise. The unique index enforces one gift per idea. Repository/domain mappers may expose `undefined`/`null` to the UI.

**Consequences:** Safe idempotent conversion. Slight asymmetry with other nullable fields, documented in the data model. Backup JSON follows the same omission.

---

### D-020 — Every gift requires a recipient

**Status:** Accepted 2026-10-28 for Milestone 4 · **Milestone:** 4

**Context:** Unassigned gifts complicate budget attribution, recipient summaries, shopping grouping, and charts.

**Decision:** A gift must belong to a recipient in the same season. Users create a recipient such as “Family gifts” for shared or ambiguous items.

**Consequences:** Clear attribution and simpler calculations. Slightly more setup for unusual cases. No “Unassigned” bucket in charts or lists.

---

### D-021 — Countdown uses calendar-day arithmetic

**Status:** Accepted 2026-10-28 for Milestone 5 · **Milestone:** 5

**Context:** Elapsed-millisecond math breaks around daylight-saving changes and can show the wrong number of days.

**Decision:** Compare local calendar dates via UTC date components at midnight; recompute on date change, visibility change, and season edit. The dashboard checks the local date every minute while mounted, so it notices midnight within a minute even after device sleep, and it also refreshes on focus and visibility change.

**Consequences:** Correct day counts. No timezone library. The holiday date is treated as a calendar date, not an instant.

---

### D-022 — No analytics or telemetry in the offline edition

**Status:** Accepted 2026-10-26 for Milestone 1 · **Milestone:** 1/10

**Context:** Recipient names, addresses, and notes are sensitive, and offline use must not depend on tracking services.

**Decision:** The offline edition sends no telemetry, analytics, ads, or crash reports. Product learning comes from reviews, support, and voluntary feedback. The online edition, if added, will disclose and minimize any operational telemetry.

**Consequences:** Strong privacy and offline reliability. No usage dashboards. Support must rely on customer-provided diagnostics.

---

### D-023 — CSV excludes notes and addresses by default

**Status:** Proposed · **Milestone:** 8

**Context:** CSV is often shared or opened in cloud spreadsheets; notes and addresses are sensitive.

**Decision:** CSV includes planning and cost fields, not notes or addresses, unless the user explicitly opts in with a warning. JSON backups include them because completeness is required, and the UI labels them sensitive.

**Consequences:** Safer default sharing. Users who need full CSV data can opt in.

---

### D-024 — Wrapped progress uses all gifts as the denominator

**Status:** Accepted 2026-10-28 for Milestone 5 · **Milestone:** 5

**Context:** Digital and retailer-direct gifts never need wrapping, so 100% wrapped progress may be unattainable. Exemptions add a new field and complexity.

**Decision:** For launch, wrapped progress = wrapped gifts ÷ all gifts in the season. This is documented as a limitation; a “does not need wrapping” exemption is a P2 enhancement.

**Consequences:** Honest but sometimes unreachable 100%. Users can leave such gifts unwrapped. Revisit after customer feedback.

---

### D-025 — Reactive reads use Dexie `liveQuery` through a typed hook

**Status:** Accepted 2026-10-26 for Milestone 3 · **Milestone:** 3 onward

**Context:** D-003 named `dexie-react-hooks`, but the first data screens need explicit loading and error states, typed repository access, and compatibility with the existing React 19 test stack. A separate hooks package would add a dependency without resolving those presentation concerns.

**Decision:** Use Dexie's own `liveQuery` through the small typed `useLiveQueryState` hook in `src/app/providers/`. Pages read typed repositories through `StorageProvider`; they never import the Dexie instance. `dexie-react-hooks` is not installed.

**Consequences:** One fewer dependency, explicit loading/error recovery states, and a single place to manage subscription cleanup. The project owns the subscription lifecycle and error mapping. Future reactive screens should use the same hook unless a documented limitation requires a change. This supersedes only the reactive-hook portion of D-003; Dexie and Zod remain required.

---

### D-026 — Shopping List is derived and print-only

**Status:** Accepted 2026-10-28 for Milestone 6 · **Milestone:** 6

**Context:** A saved shopping list would duplicate gift state and could drift after purchases, edits, or deletions. Printing also needs a predictable page without app navigation or action controls.

**Decision:** Build the Shopping List at read time from unbought gifts. Do not add a shopping-list table, snapshot, or cache. Group stores case-insensitively, put “No store specified” last, show group subtotals and a visible total, and sort deterministically. “Mark bought” uses the existing gift repository and is omitted from print. Print output includes the title, season, print date, groups, rows, and totals, and hides app chrome and controls. Printing is performed through the browser print dialog; no PDF export or saved print file is added.

**Consequences:** One source of truth and immediate consistency after gift changes. The list cannot be edited independently of gifts. A bought gift without an actual cost remains allowed and flagged under O-10. Print output depends on the browser's print rendering and has been verified with Chrome print-media emulation and a generated PDF, not with a dedicated PDF library.

---

### D-027 — Gift search, filters, and sorting are derived local UI state

**Status:** Accepted 2026-10-30 for Milestone 7 · **Milestone:** 7

**Context:** Gift search and filters help a buyer navigate a growing list, but persisting them would add another source of truth and could make the app reopen in a confusing filtered state.

**Decision:** Derive visible gift rows from the active season’s saved gifts with pure functions in `src/domain/calculations/giftList.ts`. Keep search, filter, and sort choices in local React state only. Never write them to IndexedDB. Use independent tri-state bought/wrapped/sent filters, AND-compose all filters, and make the default sort recipient A–Z followed by gift name A–Z. Place gifts with missing planned or actual amounts last in both sort directions. Clear all restores the default sort and clears search and every filter.

**Consequences:** No stale filter state and no additional migration or schema surface. Reloading or navigating away resets the controls. Search is scoped to the Gifts page rather than a global search. Sorting stays deterministic through explicit tie-breakers, including id.

---

### D-028 — Recipient detail reuses the domain calculations

**Status:** Accepted 2026-10-30 for Milestone 7 · **Milestone:** 7

**Context:** A recipient page could easily drift from the dashboard if it recalculated caps, spending, or progress separately.

**Decision:** Build the page from `buildRecipientDetail`, `calculateRecipientMetrics`, and `calculateProgress`, and render the selected recipient’s gifts through the shared `GiftTable`. Gift edits and status changes use the same repositories and rules as the Gifts page. Unknown recipient ids render a not-found state; archived seasons render read-only; no active season renders the create-season state.

**Consequences:** Dashboard, recipient detail, and the shared table cannot disagree on business rules. The page does not add stored totals or a second gift list. It is read-only whenever the season is archived.

---

## Assumptions

| ID | Assumption | Confidence | Impact if wrong |
| --- | --- | --- | --- |
| A-01 | Single user per browser profile; sharing via backup files | High | Sync/accounts become more urgent |
| A-02 | Every gift can be assigned to a recipient, including “Family gifts” | High | Adds an unassigned bucket and chart changes |
| A-03 | Missing actual costs should be flagged, not estimated | High | Could require cost on purchase |
| A-04 | Season budget is optional and distinct from planned spending | High | Dashboard model changes |
| A-05 | Recipients are copied, not shared, across seasons | High | Data model changes |
| A-06 | Replace-all restore is enough for launch | Medium | Adds merge/conflict UI |
| A-07 | One currency definition per app is enough | High | Multi-currency support |
| A-08 | Launch is English-only, with locale-aware numbers/dates | High | Localization work |
| A-09 | No AI features in the customer product | High | Scope expansion |
| A-10 | Default holiday is the upcoming 25 December | High | Onboarding default changes |
| A-11 | Sample data should be isolated in a flagged season | High | Demo/marketing workflow |
| A-12 | The Etsy buyer can follow a short setup guide and one-time online install | Medium | A wrapper may be required |

---

## Open decisions requiring owner approval

Each row states the recommendation. Approving this specification approves the recommendation unless the owner overrides it.

| ID | Question | Recommendation | Blocks | Status |
| --- | --- | --- | --- | --- |
| O-1 | What is the offline delivery method: PWA, standalone HTML, or desktop wrapper? | PWA-first; test standalone in M10; add a wrapper only if commercially necessary and approved | M10, Etsy copy | Open |
| O-2 | Final product name and visual brand? | Keep “Christmas Gift Tracker” as a working name; finalize before M9 | M9, packaging | Open |
| O-3 | Currency defaults and presets? | USD `$` 2 decimals default; presets for EUR, GBP, CAD, AUD, JPY (0 decimals); custom symbol/code; no conversion | M2/M9 | Decided 2026-10-26 |
| O-4 | Recipient deletion behavior? | Block; offer reassign or explicit cascade (D-007) | M3 | Decided 2026-10-26 |
| O-5 | Include the online edition in the first Etsy release? | No; ship and validate offline first (D-011) | M11, listing | Open |
| O-6 | Backup restore mode? | Replace-all only with pre-restore backup (D-010) | M8 | Open |
| O-7 | Sample data behavior when real data exists? | Add as an archived sample season; never mix (D-016) | M2/M8/M12 | Decided 2026-10-26 |
| O-8 | Allow zero active seasons? | Yes, with a dedicated empty state (D-018) | M2/M3 | Decided 2026-10-26 |
| O-9 | Include “mark bought” on the Shopping List? | Yes, excluded from print; same status rules | M6 | Decided 2026-10-28 |
| O-10 | Require actual cost when marking a gift bought? | No; allow and flag missing cost | M4 | Decided 2026-10-28 |
| O-11 | Add a "does not need wrapping" exemption? | No for launch; document the limitation (D-024) | M5 | Decided 2026-10-28 |
| O-12 | Support a standalone desktop wrapper for Etsy? | Only if M10 proves PWA delivery insufficient | M10/M12 | Open |

**Approval needed before Milestone 1:** Resolved 2026-10-26. The owner authorized Milestone 1; D-001, D-013, D-014, and D-022 are accepted. All other decisions can be confirmed before their blocking milestone.

**Approval needed before Milestone 2:** Resolved 2026-10-26. The owner authorized Milestone 2 and asked for decisions optimized for a non-technical customer. D-002 through D-009, D-016, D-018, D-019, O-3, O-4, O-7, and O-8 are accepted or decided.

**Approval needed before Milestone 3:** Resolved 2026-10-26. The owner authorized Milestone 3; D-007 and O-4 were already accepted with Milestone 2.

**Approval needed before Milestone 4:** Resolved 2026-10-28. The owner authorized Milestone 4; D-020 is accepted and O-10 is decided (allow a bought gift without a cost and flag it).

**Approval needed before Milestone 5:** Resolved 2026-10-28. The owner authorized Milestone 5; D-021 and D-024 are accepted and O-11 is decided (no wrapping exemption at launch; document the limitation).

**Approval needed before Milestone 6:** Resolved 2026-10-28. The owner authorized Milestone 6; O-9 is decided (include “mark bought” on the Shopping List, exclude it from print, and use the same status rules). D-008 is accepted for the storage conversion service.

**Approval needed before Milestone 7:** Resolved 2026-10-30. The owner authorized Milestone 7; D-027 and D-028 record the local filter-state and recipient-detail composition choices.

**Approval needed before Milestone 8:** D-010, D-023, O-6. D-009 and D-016 are accepted for the storage layer.

**Approval needed before Milestone 9:** D-015, D-017, O-2.

**Approval needed before Milestone 10:** D-011, O-1, O-12.

**Approval needed before Milestone 11:** D-012, O-5.

---

## Decisions explicitly rejected

| Idea | Why rejected |
| --- | --- |
| Store derived totals on seasons/recipients | Creates competing sources of truth and stale figures |
| Use localStorage as the primary database | Too small, synchronous, no transactions/indexes |
| Let AI build all milestones in one pass | Untestable, high risk of silent regressions |
| Auto-create a default season on first load | Invents data and confuses onboarding |
| Encrypt backups with a custom scheme now | Cryptography is easy to get wrong; defer to a vetted design |
| Add cloud sync before offline is solid | Multiplies failure modes and undermines the core promise |
| Load Google Fonts/icons from a CDN | Breaks offline use and leaks requests |
| Soft-delete everything in v1 | Adds query complexity; tombstones are planned with sync (D-002, DATA_MODEL §13) |
| Merge backups in v1 | High risk of silent overwrite; needs a conflict design |
| “Never lose your data” marketing claim | No local product can guarantee against cleared browser storage |

---

## Change log

| Date | Change | By |
| --- | --- | --- |
| 2026-10-26 | Initial decision log created for Milestone 0 | AI |
| 2026-10-26 | D-001, D-013, D-014, and D-022 accepted when the owner authorized Milestone 1 | AI |
| 2026-10-26 | Milestone 1 implementation notes recorded in `MILESTONE_1_REPORT.md`; no new architecture decision required | AI |
| 2026-10-26 | D-002 through D-009, D-016, D-018, D-019, O-3, O-4, O-7, and O-8 accepted/decided for Milestone 2; storage implementation recorded in `MILESTONE_2_REPORT.md` | AI |
| 2026-10-26 | D-025 accepted for Milestone 3; the reactive-hook portion of D-003 is superseded; recipient implementation recorded in `MILESTONE_3_REPORT.md` | AI |
| 2026-10-28 | O-9 decided for Milestone 6; D-026 accepted for the derived Shopping List and print behavior; implementation recorded in `MILESTONE_6_REPORT.md` | AI |
| 2026-10-30 | D-027 and D-028 accepted for Milestone 7; implementation recorded in `MILESTONE_7_REPORT.md` | AI |
