# Christmas Gift Tracker — Data Model

> Status: Normative; version-1 storage implemented in Milestone 2 · Version 0.4 · 2026-10-28
> Implements the requirements in `docs/PRODUCT_SPEC.md`. `src/domain` and `src/storage` follow this document; later sections (backup, CSV, sample loader, online sync) remain planned.

---

## 1. Conventions

### 1.1 Identifiers

- All entity IDs are lowercase UUID v4 strings generated with `crypto.randomUUID()`.
- IDs are stable, opaque, and never reused. Names are never used as keys.
- TypeScript uses branded string types (e.g. `SeasonId`) to prevent accidental mixing.
- Sample records use fixed UUIDs in a reserved range so the sample season can be loaded idempotently; the `isSample` flag—not the ID—is authoritative.

### 1.2 Money

- All monetary amounts are stored as **integer minor units** (`number`), e.g. `$12.34` → `1234`.
- No floating-point arithmetic is used for totals. Addition and subtraction happen on integers.
- The app has one active currency definition in Settings: `currencyCode`, `currencySymbol`, `fractionDigits` (0–3). All amounts in a backup share that definition.
- Changing the currency definition does **not** convert values. The UI warns and recommends a backup.
- Valid range: `0 ≤ amount ≤ 99_999_999_999` minor units (about 1 billion major units at 2 decimals) and `Number.isSafeInteger(amount)`.
- Negative amounts are not stored. Overspending is expressed as a negative derived remaining value or a positive exceeded amount.
- `null` means "not set / unknown". `0` means an explicitly zero amount and is distinct from `null`.

Input parsing rules:

- Accept an optional currency symbol, spaces, apostrophes, and grouping separators.
- Accept `.` or `,` as the decimal separator. When both appear, the rightmost is the decimal separator. When only one appears and it is followed by exactly `fractionDigits` digits (or fewer), it is treated as decimal; otherwise it is treated as grouping.
- Reject negative values, letters other than the accepted symbol, multiple decimal separators, and more fractional digits than the configured currency allows. The app does not silently round user input.
- Input is converted to minor units at the form boundary using string manipulation and integer parsing, not `parseFloat` multiplication.

Formatting:

- Group the major units with the browser locale; always show exactly `fractionDigits` decimals.
- Negative values place the minus before the symbol (e.g. `-$25.00`).
- An unset amount renders as an em dash or "Not set", never as `$0`.

### 1.3 Dates and timestamps

- **Date-only** fields use `YYYY-MM-DD` and represent a local calendar date (holiday date, bought/wrapped/sent dates). Validated as real calendar dates.
- **Timestamps** use ISO 8601 UTC with milliseconds (e.g. `2026-10-26T14:03:21.123Z`) for `createdAt`, `updatedAt`, `archivedAt`, `convertedAt`.
- Date arithmetic for the countdown uses calendar-day components (`Date.UTC(y, m, d)` difference), never elapsed milliseconds.
- `boughtOn` defaults to the local today when a gift is marked bought, and is user-editable. It is cleared when bought is cleared.
- `wrappedOn` and `sentOn` behave the same way for their statuses.

### 1.4 Strings and text

| Field | Max length | Notes |
| --- | --- | --- |
| Season name | 80 | Required, trimmed, must not be blank |
| Recipient name | 80 | Required, trimmed, duplicates allowed |
| Relationship | 40 | Optional; suggestions: Family, Friend, Partner, Colleague, Child, Parent, Other |
| Gift/idea name | 120 | Required for gifts and ideas |
| Category | 40 | Optional; free text with suggestions |
| Store | 80 | Optional; trimmed |
| Purchase URL | 2048 | Optional; `http:`/`https:` only |
| Address | 500 | Optional; sensitive |
| Notes | 2000 | Optional; sensitive |
| Currency symbol | 4 | Required if custom; preset symbols recommended |
| Currency code | 3 | ISO 4217 uppercase or `XXX` for custom |
| Locale | 35 | BCP 47 tag captured from the browser or chosen |

- Text is stored as entered after trimming leading/trailing whitespace for names and short fields. Notes and addresses preserve internal line breaks.
- Empty optional strings normalize to `null`.
- The UI escapes all user text; no HTML rendering of user content.

---

## 2. Entity relationship overview

```
Settings (singleton)
  └─ activeSeasonId ──────────────┐
                                  v
Season 1 ──── * Recipient 1 ──── * Gift * ──── 0..1 Idea
   │                │                 ▲              │
   │                └──── 0..* Idea ──┘              │
   │                                                │
   └──────────────── 0..* Idea ────────────────────-┘

Gift.sourceIdeaId ──> Idea.id           (unique when present; conversion ledger)
Idea.convertedGiftId ──> Gift.id
```

- A season owns its recipients, gifts, and ideas.
- A gift belongs to exactly one season and one recipient in that same season.
- An idea belongs to one season; its recipient is optional and must be in the same season.
- An idea may convert to at most one gift. A gift may originate from at most one idea.
- Settings reference at most one active season.

---

## 3. Entities

The interfaces below are the normative domain shape. Storage may omit `undefined` properties; repositories expose the shapes shown.

```ts
type SeasonId = string & { readonly __brand: 'SeasonId' };
type RecipientId = string & { readonly __brand: 'RecipientId' };
type GiftId = string & { readonly __brand: 'GiftId' };
type IdeaId = string & { readonly __brand: 'IdeaId' };
type DateOnly = string;   // YYYY-MM-DD
type Timestamp = string;  // ISO 8601 UTC
type MinorUnits = number; // non-negative safe integer

type SeasonStatus = 'active' | 'archived';
type IdeaStatus = 'active' | 'converted';
type ThemePreference = 'light' | 'dark' | 'system';
type DeliveryMethod =
  | 'hand_delivered'
  | 'shipped'
  | 'digital'
  | 'retailer_direct'
  | 'other';
```

### 3.1 Season

```ts
interface Season {
  id: SeasonId;
  name: string;                 // required, ≤80
  holidayDate: DateOnly;        // required, real date
  budgetMinor: MinorUnits | null;
  status: SeasonStatus;
  isSample: boolean;            // true only for the demo season
  archivedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Rules:

- Historically `name` is free text; the default is `Christmas {year}`.
- `holidayDate` defaults to 25 December of the upcoming year.
- At most one season may have `status = 'active'` (enforced by the season service in a transaction).
- `archivedAt` is set when archived and cleared when restored. `status` and `archivedAt` must agree.
- `isSample` seasons are excluded from “real data” checks and can be removed as a unit.

### 3.2 Recipient

```ts
interface Recipient {
  id: RecipientId;
  seasonId: SeasonId;
  name: string;                    // required, ≤80
  relationship: string | null;     // optional, ≤40
  budgetCapMinor: MinorUnits | null;
  notes: string | null;            // ≤2000, sensitive
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

- No derived totals are stored.
- Duplicate names are allowed.
- A recipient belongs to exactly one season and is not shared across seasons.
- A budget cap of `0` is valid and means "spend nothing"; spending above it is over cap.

### 3.3 Gift

```ts
interface Gift {
  id: GiftId;
  seasonId: SeasonId;
  recipientId: RecipientId;
  name: string;                         // required, ≤120
  category: string | null;              // ≤40
  store: string | null;                 // ≤80
  purchaseUrl: string | null;           // http/https, ≤2048
  plannedBudgetMinor: MinorUnits | null;
  actualCostMinor: MinorUnits | null;
  bought: boolean;
  boughtOn: DateOnly | null;
  wrapped: boolean;
  wrappedOn: DateOnly | null;
  sent: boolean;
  sentOn: DateOnly | null;
  deliveryMethod: DeliveryMethod | null;
  address: string | null;               // ≤500, sensitive
  notes: string | null;                 // ≤2000, sensitive
  sourceIdeaId?: IdeaId;                // omitted when absent (unique index)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Rules:

- `recipientId` is required and must reference a recipient with the same `seasonId`.
- `wrapped === true` implies `bought === true`; `sent === true` implies `bought === true`.
- `boughtOn`, `wrappedOn`, `sentOn` may be set only when their boolean is true; they are cleared when the boolean is cleared.
- `actualCostMinor` may exist while `bought === false`; it is informational and excluded from actual spending.
- `sourceIdeaId` is **omitted** (not `null`) when absent. This keeps a unique IndexedDB index valid while preventing duplicate conversions. The repository maps absence to `undefined`/`null` for display.
- Gifts never move between seasons. Moving a gift to another season is a delete-and-recreate operation (not offered in the launch UI).

### 3.4 Idea

```ts
interface Idea {
  id: IdeaId;
  seasonId: SeasonId;
  recipientId: RecipientId | null;    // optional; must be same season when set
  name: string;                       // required, ≤120
  category: string | null;
  store: string | null;
  purchaseUrl: string | null;
  estimatedPriceMinor: MinorUnits | null;
  notes: string | null;
  status: IdeaStatus;
  convertedGiftId: GiftId | null;
  convertedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Rules:

- `status === 'converted'` if and only if `convertedGiftId` is set and references an existing gift in the same season (enforced on write and import).
- `status === 'active'` requires `convertedGiftId === null` and `convertedAt === null`.
- Ideas never contribute to budgets, progress, shopping, or dashboard totals.
- Deleting a converted gift returns the idea to `active` (see §6.3).

### 3.5 Settings (singleton)

```ts
interface AppSettings {
  id: 'app';
  activeSeasonId: SeasonId | null;
  currencyCode: string;          // ISO 4217 or 'XXX'
  currencySymbol: string;        // e.g. '$'
  fractionDigits: 0 | 1 | 2 | 3;
  locale: string;                // BCP 47
  theme: ThemePreference;
  hasCompletedOnboarding: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Rules:

- Exactly one record with `id = 'app'`. Absence is repaired with safe defaults, but repair is logged and never overwrites existing settings.
- `activeSeasonId` is `null` or references an existing season with `status = 'active'`.
- `locale` defaults to the browser language; it affects number/date display only.
- Theme is also mirrored to `localStorage` under a non-critical key for first-paint styling (see Architecture, D-017). Settings in IndexedDB remain authoritative.

### 3.6 Meta (device-local key/value)

| Key | Type | Purpose |
| --- | --- | --- |
| `schemaVersion` | number | IndexedDB schema version, mirrored from Dexie |
| `appVersion` | string | Version that last opened the database |
| `databaseId` | string (UUID) | Stable identity of this local database; future sync support |
| `lastOpenedAt` | Timestamp | Diagnostics |
| `lastMigration` | `{ from, to, at }` | Diagnostics |
| `onboardingVersion` | number | Allows future onboarding changes without repetition |

Meta is device-local and is **not** included in backups.

### 3.7 No other sources of truth

- Do not persist `totalSpent`, `remainingBudget`, progress percentages, recipient totals, or shopping-list snapshots. They are derived.
- The only persisted status values are the booleans/dates and the two season/idea status fields described above.
- Derived cache, if ever added for performance, must be invalidated from a single source and is not part of the launch design.

---

## 4. Storage schema

### 4.1 Engine

- IndexedDB, accessed through **Dexie 4**. Reactive reads use Dexie's `liveQuery` through the typed `useLiveQueryState` hook (D-025), not `dexie-react-hooks`.
- Database name: `christmas-gift-tracker`.
- Database version: `1` at launch.
- All structured data lives here. No `localStorage` is used. A theme-only pre-paint mirror is planned for Milestone 9 (D-017); it will never be a database.

Rationale for Dexie over a hand-written wrapper: reliable versioned migrations, transactions, compound indexes, and reactive queries reduce the risk of inconsistent data and stale dashboards. See `docs/DECISIONS.md` D-003 and D-025.

### 4.2 Object stores and indexes (version 1)

```ts
db.version(1).stores({
  meta:       'key',
  settings:   'id',
  seasons:    'id, status, holidayDate, isSample, updatedAt',
  recipients: 'id, seasonId, [seasonId+name], updatedAt',
  gifts:      'id, seasonId, recipientId, [seasonId+recipientId], &sourceIdeaId, updatedAt',
  ideas:      'id, seasonId, recipientId, status, convertedGiftId, updatedAt',
});
```

Notes:

- Booleans (`bought`, `wrapped`, `sent`) are stored as values but not indexed, because IndexedDB keys cannot be booleans. Filtering happens in memory over the active season's small dataset.
- `&sourceIdeaId` is a unique index. Records without a source omit the property.
- `[seasonId+name]` supports deterministic recipient ordering without enforcing uniqueness.
- `updatedAt` indexes support future sync and “recently changed” diagnostics.
- No index is added speculatively without a documented query.
- Dexie encodes application schema version `1` as IndexedDB version `10` (`verno × 10`). The app and health report expose `db.verno` as `1`; a raw DevTools/`indexedDB.databases()` reading of `10` is expected, not a second schema version.

### 4.3 IndexedDB transactions

- Every multi-record write uses one read-write transaction spanning all affected stores.
- Repository functions validate before opening the transaction, then re-check critical preconditions inside it (e.g. recipient still exists, idea still active).
- A thrown error aborts the transaction; no partial writes survive.
- Bulk restore uses a single transaction across settings, seasons, recipients, gifts, and ideas.
- Reads for a page use live queries scoped to the active season.
- Cross-tab changes propagate through Dexie live queries; the app does not maintain a duplicate in-memory database.

### 4.4 Repository surface

The storage layer exposes typed functions, not raw tables:

```
seasons:   list(), get(id), getActive(), create(input), update(id, input),
           archive(id), restore(id), delete(id, confirmationName), copyRecipients(fromId, toId)
settings:  get(), update(patch), setActiveSeason(id | null)
recipients:listBySeason(seasonId), get(id), create(input), update(id, input),
           deleteWithPolicy(id, policy)
gifts:     listBySeason(seasonId), listByRecipient(recipientId), get(id),
           create(input), update(id, input), setPurchaseState(id, state), delete(id)
ideas:     listBySeason(seasonId), get(id), create(input), update(id, input),
           convert(id, recipientId), delete(id), reopen(id)
data:      exportBackup(), validateBackup(file), restoreBackup(file, mode),
           exportCsv(scope, options), loadSampleData(), removeSampleData(),
           resetAllData(), healthCheck()
```

All writes return the stored entity. All errors are typed (see §9).

---

## 5. Validation rules

Validation runs in the domain layer before any write and again on backup import. The storage layer MUST NOT accept unchecked input.

### 5.1 Field validation

| Field | Rule |
| --- | --- |
| Any required name | Non-blank after trim, within max length |
| `holidayDate` | Real calendar date, `YYYY-MM-DD`, within 1900–2200 |
| Status dates | Valid date-only; only present when their boolean is true |
| Timestamps | Valid ISO 8601 UTC; `updatedAt ≥ createdAt` |
| Money | Safe integer, `0 ≤ value ≤ 99_999_999_999`; no strings in the domain |
| `fractionDigits` | Integer 0–3 |
| Currency symbol | 1–4 characters after trim |
| Currency code | 3 uppercase ASCII letters |
| Locale | Valid BCP 47 (validated with `Intl`), fallback to browser locale |
| URL | Parses; protocol exactly `http:` or `https:`; no credentials embedded; ≤2048 |
| Email-like text | Not collected anywhere |
| Notes/address | ≤ max length; stored verbatim otherwise |

### 5.2 Relationship validation

- Gift recipient exists.
- Gift recipient's season equals the gift's season.
- Idea recipient, when set, exists and is in the idea's season.
- Idea's converted gift, when set, exists and is in the idea's season.
- Idea `status`/`convertedGiftId`/`convertedAt` agree.
- Settings' `activeSeasonId`, when set, exists and is active.
- No two seasons are active.
- Season status/archivedAt agree.

### 5.3 State validation

- `wrapped ⇒ bought`, `sent ⇒ bought`.
- Status dates correspond to their flags.
- No duplicate IDs within or across stores.
- `sourceIdeaId` values are unique and reference existing ideas.
- A season's `isSample` flag is boolean and immutable after creation except by import/sample removal.

### 5.4 Import-only validation

Backups must additionally satisfy:

- Top-level format, format version, schema version, and data shape.
- Array types and record counts within sane limits (e.g. ≤10,000 gifts per season) to prevent UI lockups.
- Every record validates against §3 and §5.1–5.3.
- No orphan records, no cross-season references, no duplicate IDs.
- At most one active season.
- Settings activeSeasonId consistency (or `null`).
- Total file size ≤25 MB; reject larger with a clear message.

Invalid input produces a field-level error map and a human-readable summary. The domain never coerces invalid values into valid ones silently.

---

## 6. Operations and cascade semantics

### 6.1 Create/edit/delete

- Every create sets `createdAt = updatedAt = now`; every update preserves `createdAt` and sets `updatedAt = now`.
- Updates are full validated records or explicit patches; undefined fields never accidentally erase data.
- Deleting a gift, idea, or season updates dependent records in the same transaction as described below.
- Ordinary edits never touch `seasonId` or IDs.

### 6.2 Recipient deletion

`deleteWithPolicy(recipientId, policy)` where policy is one of:

1. `{ type: 'reassign', targetRecipientId }` — move all gifts to another recipient **in the same season**, then delete the recipient. Ideas assigned to the deleted recipient become unassigned. Gifts' `updatedAt` is refreshed.
2. `{ type: 'cascade', confirmationName }` — delete the recipient and all its gifts. Ideas assigned to the recipient become unassigned. Requires typing the recipient name in the UI and an explicit count of deleted gifts.
3. Cancel — no writes.

No other delete path is allowed.

### 6.3 Gift deletion and idea state

In one transaction:

1. If the gift has `sourceIdeaId`, load the idea.
2. Verify the idea's `convertedGiftId === gift.id` (if not, log a diagnostic and still proceed only after clearing safely).
3. Delete the gift.
4. Set the idea to `status = 'active'`, `convertedGiftId = null`, `convertedAt = null`, `updatedAt = now`.
5. The UI informs the user that the idea has returned to the Idea Bank.

If the idea is missing, delete the gift and record no error visible to the user beyond diagnostics.

### 6.4 Idea conversion

Preconditions:

- Idea exists, is `active`, and belongs to the active season. Archived seasons are read-only.
- Recipient is provided, exists, and belongs to the same season.

Transaction:

1. Re-read the idea; abort if no longer active or if a gift with `sourceIdeaId = idea.id` already exists.
2. Insert the gift with copied fields:
   - `name`, `category`, `store`, `purchaseUrl`, `notes`
   - `plannedBudgetMinor = estimatedPriceMinor`
   - `actualCostMinor = null`, statuses false, dates null, `deliveryMethod = null`, `address = null`
   - `sourceIdeaId = idea.id`
3. Update the idea to `converted`, link the gift, set `convertedAt`.
4. If the unique index or any assertion fails, abort; retry surfaces the existing gift instead of duplicating it.

Idempotency: the operation returns the existing linked gift if the idea is already converted to it. The UI disables the action while in flight.

Reopen:

- Allowed only when the linked gift no longer exists. If it exists, the UI links to the gift and disables Reopen with an explanation ("Delete the gift to return this idea to the bank").
- Sets `active`, clears conversion fields.

### 6.5 Idea deletion

- Delete the idea.
- In the same transaction, if a gift has `sourceIdeaId = idea.id`, clear that property.
- The gift and all its financial data remain.

### 6.6 Season archive, restore, delete

**Archive**

- Allowed for the active season.
- Set `status = 'archived'`, `archivedAt = now`, `updatedAt = now`.
- If it was active, set `settings.activeSeasonId = null` unless another active season is created/restored in the same flow.
- Records are untouched; the UI becomes read-only for that season.

**Restore**

- Set the target season `active` and clear `archivedAt`.
- If another season is active, it must be archived in the same transaction (the UI confirms this).
- Set `settings.activeSeasonId` to the restored season.
- Never allows two active seasons.

**Delete**

- Allowed only for archived, non-active seasons.
- Requires exact name confirmation (trimmed, case-sensitive) at the UI and service layer.
- In one transaction: delete all gifts, ideas, and recipients of the season, then the season. Clear `settings.activeSeasonId` if it pointed there (it must not).
- This is irreversible; a pre-delete backup is recommended but not forced (the season is already archived and exportable).

**Copy recipients into a new season**

- Copies names, relationships, caps, and notes; generates new IDs; sets `seasonId` to the new season; timestamps now.
- Does not copy gifts, ideas, or statuses.
- Runs in the same transaction as season creation.

### 6.7 Artificially seeded data

- Loading the sample season is one transaction with fixed IDs.
- If a sample season already exists, the operation is a no-op that focuses it (no duplicates).
- Sample data never alters real seasons. If real data exists and no active season exists, the sample may be created as archived to avoid hijacking the dashboard; the UI explains the result.
- Removing sample data deletes only the season where `isSample = true` and its children.

### 6.8 Reset all data

- Requires typed confirmation `DELETE`.
- Triggers or strongly recommends a downloadable backup first.
- Deletes all stores' records and reinitializes settings/meta, preserving `databaseId`, then returns to onboarding.
- Never runs implicitly.

---

## 7. Authoritative calculations

A single domain module implements these. UI components consume its outputs and never re-implement a total.

Notation: `gifts` is the set of gifts in the active season. `G` is one gift.

### 7.1 Season totals

```
plannedTotalMinor  = Σ (G.plannedBudgetMinor ?? 0) for all G
actualSpentMinor   = Σ (G.actualCostMinor ?? 0) for G where G.bought
remainingMinor     = season.budgetMinor === null ? null : season.budgetMinor − actualSpentMinor
unallocatedMinor   = season.budgetMinor === null ? null : season.budgetMinor − plannedTotalMinor
plannedOverBudget  = season.budgetMinor !== null && plannedTotalMinor > season.budgetMinor
spentOverBudget    = season.budgetMinor !== null && actualSpentMinor > season.budgetMinor
```

- `remainingMinor < 0` means overspent; display the absolute value with "over budget".
- Buying a gift with `actualCostMinor = null` adds 0 to `actualSpentMinor`.
- An unbought gift's recorded actual cost is not included.
- Archived seasons are never included because the calculation receives one season's gifts.

### 7.2 Counts and progress

```
totalGifts   = gifts.length
boughtCount  = count(G.bought)
wrappedCount = count(G.wrapped)
sentCount    = count(G.sent)

boughtRatio  = totalGifts === 0 ? null : boughtCount / totalGifts
wrappedRatio = totalGifts === 0 ? null : wrappedCount / totalGifts
sentRatio    = totalGifts === 0 ? null : sentCount / totalGifts
```

- Ratios are `null` for an empty gift list. The UI renders an empty state, not `0%`/`NaN`.
- Percentages are `ratio × 100`, displayed to the nearest whole percent. No clamping: 100% is the maximum because counts cannot exceed the total.
- Invariants guarantee `wrappedCount ≤ boughtCount` and `sentCount ≤ boughtCount`, but not `wrappedCount + sentCount ≤ totalGifts` (they are overlapping states).
- Digital and retailer-direct gifts still count in the wrapped denominator; “wrapping exemption” is a documented P2 limitation.

### 7.3 Data-quality findings

```
boughtWithoutCost = gifts where bought && actualCostMinor === null
unbudgetedGifts   = gifts where plannedBudgetMinor === null
costRecordedNotBought = gifts where !bought && actualCostMinor !== null
```

Ordered by severity: overspend → bought without cost → recipient over cap → planned over budget → unbudgeted gifts.

### 7.4 Recipient metrics

For each recipient:

```
recipientPlanned = Σ (G.plannedBudgetMinor ?? 0) for gifts of that recipient
recipientSpent   = Σ (G.actualCostMinor ?? 0) for bought gifts of that recipient
capRemaining     = cap === null ? null : cap − recipientSpent
capExceededBy    = cap === null ? 0 : max(0, recipientSpent − cap)
utilization      = cap === null || cap === 0 ? null : recipientSpent / cap
overCap          = cap !== null && recipientSpent > cap
```

- A cap of `0` yields `utilization = null` but `overCap` can still be true.
- Recipients without a cap still show planned and spent.
- Gifts are attributed solely by `recipientId`; there is no unassigned bucket.

### 7.5 Chart data

Budget-vs-actual by recipient:

- Include recipients in the active season with at least one gift or a non-null cap.
- Each series: `planned` and `actual` in minor units.
- Sort by planned descending, then recipient name ascending, then ID for stability.
- Recipients with zero values remain in the chart with zero bars.
- The chart has an accessible table alternative with the same numbers.

No pie/percentage chart is required for launch.

### 7.6 Holiday countdown

```
today        = local calendar date
holiday      = season.holidayDate
dayDelta     = (UTC(holiday) − UTC(today)) / 86_400_000
```

- `dayDelta > 0`: `{ state: 'future', days: dayDelta }`
- `dayDelta === 0`: `{ state: 'today' }`
- `dayDelta < 0`: `{ state: 'past', days: abs(dayDelta) }`
- Recompute when the local date changes, on `visibilitychange`, and after season edits.
- No timezone conversion of the date-only value; it is treated as a calendar date.

### 7.7 Display formatting

- Money: `formatMoney(minor, settings)` as described in §1.2.
- Percentages: `null → '—'`; otherwise rounded to whole percent, with `>999%` displayed as `999%+` to avoid layout breakage (the tooltip/table cell keeps the true value).
- Counts: `bought / total` (e.g. `7 / 12`).
- Dates: localized medium format via `Intl.DateTimeFormat(locale)`.

### 7.8 Test fixtures

Every calculation must be tested against at least:

- 0 gifts.
- 1 gift, no costs.
- Gifts with `null` vs `0` amounts.
- Bought gift with no actual cost.
- Unbought gift with an actual cost.
- Overspent season and recipient.
- Cap of 0.
- Multiple recipients with mixed data.
- Archived season isolation.
- Year boundary and DST transition for the countdown.

---

## 8. Schema versioning and migrations

### 8.1 Policy

- The database schema is versioned with Dexie's integer versions.
- `meta.schemaVersion` is updated in the same upgrade transaction.
- Migrations are forward-only, deterministic, and idempotent where practical.
- No migration may delete or reset user records. Destructive normalization requires an owner-approved decision and a pre-migration export.
- A migration failure aborts the upgrade; the app enters recovery mode without deleting the database or silently recreating it.
- Downgrades are not supported. If the database is newer than the app, show a blocking "newer data" message with instructions to update the app, and do not modify data.
- Every schema version ships with migration fixtures and automated tests.
- Backups carry `schemaVersion`. The app refuses backups from a newer schema. Older backups are migrated by dedicated import migration functions before validation, or rejected with a clear message if no migration exists.

### 8.2 Version 1

- Initial schema as in §4.2.
- No data migration.
- Write `meta.schemaVersion = 1`, `databaseId`, `appVersion`, `lastOpenedAt` on first open.
- On subsequent opens, update `lastOpenedAt` and `appVersion`; never touch user records.

### 8.3 Future migration example (illustrative, not implemented)

Adding gift photos at version 2 would add a `photos` store and a migration that leaves existing gifts unchanged; backup format version increments with an optional `photos` array. The plan must document the compatibility window and update import validation.

---

## 9. Error taxonomy

| Error | Meaning | UI behavior |
| --- | --- | --- |
| `ValidationError` | Field or rule violation | Inline field errors plus summary; no write |
| `NotFoundError` | Record disappeared or invalid reference | Refresh data; explain; no partial write |
| `ConflictError` | Duplicate conversion or concurrent state change | Show current state; offer retry/reload |
| `StorageUnavailableError` | IndexedDB blocked, denied, or corrupt | Blocking recovery page; no fake data |
| `QuotaExceededError` | Storage full | Explain; suggest backup and removing old seasons |
| `MigrationError` | Upgrade failed | Recovery mode; preserve database; support instructions |
| `ImportError` | Backup invalid or newer | List issues; make no changes |
| `ExportError` | Download blocked/failed | Explain and offer retry |

Errors carry a stable machine code, a human message, and optional field details. Raw exceptions are logged to the console in development only, never displayed as the primary message.

---

## 10. Backup format

### 10.1 Envelope

```json
{
  "format": "christmas-gift-tracker-backup",
  "formatVersion": 1,
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "2026-12-01T18:22:04.512Z",
  "data": {
    "settings": { "...": "..." },
    "seasons": [],
    "recipients": [],
    "gifts": [],
    "ideas": []
  }
}
```

- Includes **all** seasons, including archived and sample seasons, and all records.
- Excludes `meta` (device-local).
- `settings.activeSeasonId` is included; on restore it is validated and preserved.
- Sensitive fields (`address`, `notes`) are included because a backup must be complete. The UI warns accordingly.
- JSON is UTF-8, pretty-printed, with a filename like `christmas-gift-tracker-backup-2026-12-01.json`.
- No personal data is added to the filename.

### 10.2 Restore procedure

1. Read the file with a 25 MB cap.
2. Parse JSON; reject invalid syntax with line/position context if available.
3. Check `format`, `formatVersion` (must be 1 for launch), and `schemaVersion` (≤ current).
4. Validate the complete data set per §5.
5. Show a summary: seasons, recipients, gifts, ideas, date exported, and the fact that all current data will be replaced.
6. Offer/perform a pre-restore backup download.
7. Require typed confirmation.
8. In one transaction: clear settings, seasons, recipients, gifts, and ideas, then bulk insert validated records. Preserve `meta.databaseId`; update `meta.appVersion` and `schemaVersion` outside the data transaction if needed.
9. On any failure, abort the transaction and leave the previous data intact.
10. Reload app state and land on the Dashboard or the no-active-season state.

Replace-all is the only launch mode. Merge is deferred.

### 10.3 Backward compatibility

- Version 1 is the only format at launch.
- Future format versions must define a migration path and be tested with real fixture files.
- Unknown extra properties are ignored, but unknown structural changes are rejected.
- A backup with duplicate IDs, dangling references, or invariant violations is rejected as a whole; no “best effort” repair.

---

## 11. CSV export

### 11.1 Scope and columns

Active season by default; option to export all seasons (one combined file with a Season column).

```
Season,Recipient,Relationship,Gift,Category,Store,Purchase URL,
Planned Budget,Actual Cost,Bought,Bought Date,Wrapped,Wrapped Date,
Sent,Sent Date,Delivery Method,Source
```

- Optional opt-in columns: `Address`, `Notes`.
- `Source` is `Idea` when `sourceIdeaId` exists, otherwise empty.
- Money is written as a plain decimal number using `.` and exactly `fractionDigits` decimals, without a symbol or thousands separators (spreadsheet-friendly).
- Booleans are `Yes`/`No`.
- Dates are `YYYY-MM-DD`; empty values are empty cells.
- Delivery method uses human labels (e.g. "Hand delivered").

### 11.2 Encoding and safety

- RFC 4180: quote fields containing comma, quote, CR, or LF; double internal quotes.
- UTF-8 with BOM so Excel detects Unicode.
- CRLF line endings.
- Formula injection protection: fields beginning with `=`, `+`, `-`, or `@` (after optional whitespace) are prefixed with an apostrophe **only** in spreadsheet-bound exports, and this is documented. (Do not alter stored data.)
- Export never includes internal IDs, schema metadata, or timestamps beyond the requested dates.

---

## 12. Storage health check

`healthCheck()` returns a structured report:

```
{
  ok: boolean,
  databaseVersion: number,
  storage: { usageBytes, quotaBytes, persisted: boolean | null },
  counts: { seasons, activeSeasons, archivedSeasons, recipients, gifts, ideas },
  issues: [
    { code, severity: 'info'|'warning'|'error', message, recordIds?: string[] }
  ]
}
```

Checks:

- Database opens and version matches.
- At most one active season.
- `settings.activeSeasonId` resolves to an active season or null.
- Orphan recipients/gifts/ideas (season missing).
- Gift recipient missing or in a different season.
- Gift `sourceIdeaId` missing from the idea store.
- Idea recipient missing or in a different season.
- Idea converted-gift missing or in a different season.
- Duplicate `sourceIdeaId` (should be impossible).
- Status invariants (`wrapped ⇒ bought`, `sent ⇒ bought`, date/flag agreement).
- Date and money validity on a sample of records (full scan permitted for <10,000 records).
- Storage estimate and persistence status.

The health check never mutates data. It offers a copyable text report containing counts and codes, **not** names, addresses, or notes.

---

## 13. Future online synchronization (design constraints)

Not implemented at launch. The following constraints must shape the schema now:

- Stable client-generated UUIDs allow offline creation and later upload without renumbering.
- `updatedAt` on every entity supports change detection.
- No derived totals are stored, so merging records cannot leave stale totals.
- The local database remains the working copy; cloud sync must not block offline reads/writes.
- Additions planned for Milestone 11:
  - A cloud mirror of each table with `user_id`, `server_revision`, and `deleted_at`.
  - A local outbox for pending mutations and tombstones for deletions.
  - Per-record optimistic concurrency: if the server revision changed since the last sync, mark a conflict and present both versions; never silently overwrite.
  - Sync status per record and globally, with actionable errors.
  - Server-side Row Level Security keyed to the authenticated user.
- Hard deletes in the launch schema require the sync milestone to introduce a tombstone/outbox migration. This is a known, documented migration, not a redesign.
- Backups remain local and complete; cloud export mirrors the same format where practical.

---

## 14. Data model decision log references

| Topic | Decision |
| --- | --- |
| Local-first storage | D-002 |
| Dexie as the IndexedDB access layer | D-003 |
| Integer minor units | D-004 |
| Season-scoped records | D-005 |
| Explicit status booleans | D-006 |
| Recipient deletion policy | D-007 |
| Idea conversion ledger | D-008 |
| Read-only archives | D-009 |
| Replace-all restore | D-010 |
| Unique `sourceIdeaId` omission rule | D-019 |
| Zero active seasons allowed | D-018 |

---

## 15. Open data questions to resolve before implementation

1. Should `actualCostMinor` be required when marking a gift bought? Current specification: no, flag it. (O-10 in `DECISIONS.md`)
2. Should archived seasons allow editing notes or caps? Current specification: no, restore first.
3. Should the CSV export include a totals row? Current specification: no; keep it machine-readable.
4. Should the backup include a checksum? Not required for v1; validation is structural.
5. Should the app support 0-decimal currencies fully (e.g. JPY)? Yes, via `fractionDigits = 0`, with tests.

These do not block Milestone 1.
