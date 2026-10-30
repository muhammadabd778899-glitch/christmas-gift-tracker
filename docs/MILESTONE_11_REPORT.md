# Milestone 11 Report — Online accounts and synchronization

**Status:** Complete and verified locally on 2026-10-30; live Supabase isolation run pending owner credentials  
**Version:** 0.11.0  
**Git checkpoint:** `feat: add online accounts and synchronization`  
**Tag:** `milestone-11`

Companion documents: `docs/ACCEPTANCE_CRITERIA.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and the operator-facing `docs/ONLINE_SETUP.md`.

---

## 1. What shipped

### 1.1 Two editions from one codebase (D-031)

- `npm run build` produces the account-free offline edition. `npm run build --mode online` (or `npm run build:online`) selects the online edition; `npm run dev:online` does the same for development.
- A Vite `@edition` alias resolves either `src/app/offlineEdition.ts` (no account module) or `src/app/onlineEdition.tsx` (provider, lazy Account page, sync indicator, Account navigation).
- `src/edition.ts` recognizes both the Vite `online` mode and `VITE_EDITION=online`, so the online modules are only reachable in the online artifact.
- `scripts/check-offline-bundle.mjs` recursively scans the built offline files and fails on Supabase or auth identifiers, sync RPC names, privileged-key markers, and third-party runtime asset patterns. `npm run verify:bundle` currently reports **8 script files scanned, no accounts, sync, privileged keys, or runtime third-party assets found**.
- `.env.online.example` documents the two public variables. `.env.online.local` is git-ignored; no service-role key or database credential is accepted in the client contract.

### 1.2 Schema version 2 and transactional change capture

- Dexie version 2 adds `syncOutbox`, `syncTombstones`, `syncState`, `syncConflicts`, and `syncMeta`; the upgrade adds stores only, and a fixture proves a version-1 database keeps every record with empty sync tables.
- Repository creates, updates, deletes, cascades, and season operations queue outbox or tombstone entries inside the same IndexedDB transaction. Repeated edits coalesce into one pending upsert; a delete replaces a pending upsert with a tombstone; a rolled-back transaction leaves no queued work.
- Applying remote rows runs with change capture suppressed, so pulls do not echo back into the outbox.
- Change tracking is enabled whenever the device is linked, including while signed out, and is disabled otherwise.

### 1.3 Accounts and account data

- Sign-up with email confirmation guidance, sign-in, sign-out, password recovery by email, password change, and account deletion behind the typed phrase `DELETE MY ACCOUNT`.
- Safe-auth error mapping covers invalid credentials, unconfirmed email, existing account, weak password, rate limiting, unreachable network, expired session, and generic failures without exposing raw provider messages.
- The Account page reports the signed-in identity, an online/offline notice, the sync status, conflicts, and account actions. Recovery links open a dedicated reset card; successful updates reload the session and clear the URL token.
- Account export downloads the server-side `export_my_account` payload. Account deletion removes cloud rows, disconnects the device, and explicitly states that the local planner is unchanged.

### 1.4 Device linking, connection planning, and merge safety

- `planConnection` classifies identical, local-only, cloud-only, and conflicting records before anything is written.
- Empty cloud → upload after a typed `CONNECT`; empty device → download after the same confirmation; both populated → merge.
- A merge requires a fresh backup download and a typed `CONNECT`, never deletes either side, and never overwrites a differing record automatically.
- Linking refuses an account that differs from an existing link without an explicit disconnect. Disconnecting keeps every local planner record and clears credentials, link metadata, outbox, tombstones, sync state, and conflicts.
- While linked, full restore, full reset, and sample-data tools are blocked. Restore additionally clears sync metadata so a later connection starts from a fresh merge.
- Auto-sync runs on link, on a local-change debounce, and on a 30-second interval; the Account page also offers **Sync now**.

### 1.5 Sync engine and conflict decisions

- Push order is parent-first: season, recipient, gift, idea, settings. Pull uses a stored `server_seq` cursor and applies each page in one transaction.
- Every write carries the last acknowledged base revision. Accepted writes receive a new revision and sequence; stale writes return both versions; an identical replay is acknowledged without a duplicate or revision bump.
- Network failure keeps queued work and local data, and retry resumes from the last applied cursor. A lost acknowledgement is idempotent.
- Same-record differences and cloud deletions of locally edited records become explicit conflicts. Resolution is per record: keep this device's version or accept the cloud version/deletion. There is no last-write-wins.
- A malformed cloud row is skipped and surfaced as a link error rather than corrupting local data.
- Status is derived as synced, pending, syncing, offline, conflict, error, or disconnected and appears in the shell indicator and on the Account page.

### 1.6 Supabase backend, RLS, and RPCs

- `supabase/migrations/20261030000100_online_sync.sql` creates a sequence, `sync_records`, an index on `(user_id, server_seq)`, RLS enablement, and four per-user policies for select, insert, update, and delete.
- `anon` has no table access; `authenticated` receives CRUD plus sequence usage. Direct client writes are not part of the contract.
- `sync_upsert`, `sync_delete`, `sync_list_changes`, and `sync_count_rows` validate the session, entity type, entity ID, base revision, and timestamp. Settings must use `app`; unknown types, empty IDs, and negative revisions are rejected.
- Soft deletes set `deleted_at` and null `data`; the table check enforces that data exists exactly when the row is live.
- `export_my_account` returns only the caller's email, export time, and live records. `delete_my_account` is a `SECURITY DEFINER` function that deletes the authenticated user, cascading their rows.
- `scripts/verify-supabase.mjs` creates two disposable accounts and proves: per-account reads, cross-account select/update/delete/insert rejection, anon rejection, invalid-input rejection, idempotent replay, revision bumps, conflict payloads, tombstones, scoped export, account deletion, residual-row count zero, deleted-account sign-in failure, and survival of the other account's rows. It exits `2` when credentials or email confirmation prevent a run.

### 1.7 Supporting changes

- `src/lib/appInfo.ts` reports version 0.11.0 / Milestone 11; the About dialog, Settings roadmap (Milestone 11 now Complete), README, plan, architecture, data model, product spec, decisions, and acceptance criteria were updated.
- `src/features/account/AccountPage.test.tsx` covers sign-in success and failure, typed connect, merge backup gating, conflict resolution, and account deletion.
- `vitest.config.ts` caps test workers at 6. With 12 cores and 43 isolated files, the default spawning starved a fake-indexeddb reset transaction and made one existing Seasons & archives test time out under full-suite load; the cap removes that resource contention without changing assertions.
- `src/storage/syncTracking.test.ts` and `src/sync/connect.test.ts` now enable change tracking **after** test storage initialization, matching `initializeStorage`, which enables tracking only when a link exists.
- `eslint.config.js` gives `scripts/**/*.mjs` Node globals; `tsconfig.app.json` drops the deprecated `baseUrl` while keeping the `@edition` path mapping.

---

## 2. What did not ship or was not verified

- **The SQL migration has not been executed anywhere.** This environment has no `psql`, no Supabase CLI, and no project credentials. The migration was reviewed manually and its semantics are mirrored by the fake cloud and RPC protocol tests, but live PostgreSQL execution is unproven.
- **The live isolation run did not run.** `npm run verify:supabase` exits `2` without `.env.online.local`; AC-11.03, 11.04, 11.09, 11.10, 11.11, and 11.15 therefore rest on local integration tests plus SQL review until the owner supplies the dedicated project.
- No live email delivery, confirmation-link, or password-reset round trip was exercised. The UI and error handling are implemented, but mailbox behavior is provider-dependent.
- No Playwright/browser E2E run of the online edition; account and sync UI tests use jsdom with mocked Supabase modules.
- No real network-loss browser test for the online edition; offline queue and retry are covered at the engine and fake-cloud level.
- The Account page is not included in the offline edition and the offline bundle is scanned to prove that.
- No payments, subscriptions, collaboration, public sharing, or real-time co-editing.
- No hosted online deployment or production Supabase project; only local builds and the documented setup path.
- The browser matrix caveats from Milestone 10 remain unchanged.

---

## 3. Quality gates (run 2026-10-30)

| Gate | Command | Result |
| --- | --- | --- |
| Type check | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass |
| Unit/integration tests | `npm test` | **377 passed in 43 files** |
| Offline production build | `npm run build` | Pass; PWA precache 21 entries / 1285.10 KiB |
| Online production build | `npm run build:online` | Pass; PWA precache 25 entries / 1555.97 KiB |
| Offline bundle scan | `npm run verify:bundle` | Pass; 8 script files scanned, no forbidden strings |
| Live Supabase verification | `npm run verify:supabase` | **Skipped (exit 2)** — credentials not supplied |
| SQL migration execution | `psql "$SUPABASE_DB_URL" -f supabase/migrations/20261030000100_online_sync.sql` | **Not run** — no local PostgreSQL/Supabase tooling or credentials |

M11-specific tests: 48 passing across `src/sync/engine.test.ts`, `src/sync/connect.test.ts`, `src/sync/supabase/protocol.test.ts`, `src/storage/syncTracking.test.ts`, `src/storage/syncLink.test.ts`, and `src/features/account/AccountPage.test.tsx`, plus the offline-route regression in `src/app/App.test.tsx`.

Build-size note: the online entry chunk is 998.26 kB (284.78 kB gzip), above Vite’s 500 kB advisory. It is not an error and does not affect the offline artifact; code-splitting is a candidate for Milestone 12 if release packaging warrants it.

---

## 4. Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| AC-11.01 | Implemented; provider round trip pending | Auth UI, recovery card, password change, sign-out; Account tests; live email not exercised |
| AC-11.02 | Verified locally | `toAuthError` mapping tests and sign-in failure UI test |
| AC-11.03 | Implemented; live run pending | RLS policies and RPC guards in the migration; fake-cloud isolation test; `verify:supabase` not run |
| AC-11.04 | Implemented; live run pending | Per-user primary key, policies, and adapter scoping; live cross-account script not run |
| AC-11.05 | Verified | Offline bundle scan and review; only `VITE_SUPABASE_URL` and the public anon key are client variables |
| AC-11.06 | Verified by review | Cloud mirror stores entity JSON and revision metadata; no calculated totals or business rules in SQL |
| AC-11.07 | Verified locally | Sync status indicator, Account status card, and status-derivation tests |
| AC-11.08 | Verified locally | Outbox capture, auto-sync, retry test, pulled-change test |
| AC-11.09 | Verified locally; live run pending | Idempotent replay test, primary-key upsert, fake-cloud duplicate check, SQL replay branch |
| AC-11.10 | Verified locally; live run pending | Both-version conflict storage, conflict choice tests, SQL conflict returns |
| AC-11.11 | Verified locally | Network-failure retry and resumable cursor tests |
| AC-11.12 | Verified | Full offline suite, offline build, bundle scan, and the offline-edition route/navigation test |
| AC-11.13 | Verified locally; live run pending | Typed deletion, disconnect, local-data notice; live cascade check in the unrun script |
| AC-11.14 | Verified locally; live run pending | `export_my_account` and Account export download; live scope check in the unrun script |
| AC-11.15 | Partially verified | Local isolation, invalid input, auth failure, network failure, duplicates, and conflicts pass; the live Supabase run is pending |
| AC-11.16 | Verified | README, setup, architecture, data model, product spec, plan, decisions, and this report |
| AC-11.17 | Verified by review | No payment or subscription code, schema, or copy |

---

## 5. Honest limitations and risk

- **Remote security evidence is incomplete.** The local fake cloud is a faithful contract test, not a PostgreSQL proof. Until `verify:supabase` runs against the dedicated project, treat AC-11.03/04/09/10/11/15 as pending live confirmation.
- **The migration is unexecuted.** A syntax or privilege issue in `delete_my_account` (deleting from `auth.users`) would only appear on a live project. The setup guide documents the permission fallback.
- **Email flows are provider-dependent.** Confirmation and recovery behavior depends on the project's email settings; the verification script exits `2` when confirmation blocks disposable sign-ups.
- **Online E2E is absent.** jsdom tests mock Supabase; they do not prove a browser session against a real project.
- **The online artifact is larger than the advisory chunk limit.** No functional impact; revisit during M12 packaging if desired.
- **The offline edition remains the only release candidate.** O-5 keeps the online edition out of the first Etsy release, so M12 must not let online work delay the validated offline package.

---

## 6. Decisions

- **D-012 accepted:** Supabase for the online backend.
- **O-5 decided:** ship the account-free offline edition first; the online edition is separate.
- **D-031 accepted:** one codebase, two compile-time editions.
- **D-032 accepted:** per-record revision mirror with surfaced conflicts and no last-write-wins.
- **D-033 accepted:** linking enables tracking and blocks destructive local tools until disconnect.
- **D-034 accepted:** first connection uploads, downloads, or merges without deleting either side.
- **D-035 accepted:** live verification uses a dedicated disposable project; only the public anon key may enter the client, never a service-role key or database credential.
- Earlier decisions still apply, including D-002 local-first, D-013 no runtime CDN, D-022 no telemetry, D-029 destructive-action gates, and D-030 user-initiated persistence.

---

## 7. Next step

1. Owner creates the dedicated Supabase test project and applies the committed migration.
2. Owner puts only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the git-ignored `.env.online.local` and runs `npm run verify:supabase`.
3. Record the live result here; resolve any SQL or policy defect before calling the remote ACs verified.
4. Owner authorizes Milestone 12 — final QA, packaging, and the Etsy release of the offline edition.

Milestone 12 has **not** started.
