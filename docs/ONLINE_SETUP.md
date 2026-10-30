# Online edition setup

The planner ships in two editions built from one codebase:

| Edition | Build | Accounts | Where data lives |
| --- | --- | --- | --- |
| Offline (default) | `npm run build` | None | This browser only |
| Online | `npm run build:online` | Optional Supabase account | This browser plus the signed-in account |

The offline edition is the default storefront build. It contains no Supabase
code, account route, or sync runtime. The online edition is an opt-in build that
adds a private cloud copy and cross-device sync; it never removes local storage.
See `docs/OFFLINE_SETUP.md` for the offline artifact and `docs/DECISIONS.md`
(D-031 to D-034) for the edition split and sync rules.

---

## 1. Create the Supabase project

Use a **dedicated project** for this milestone. For verification, use a
throwaway/test project that never holds real customer data.

1. Create a project at <https://supabase.com/dashboard>.
2. Keep the database region close to the expected customers.
3. Under **Authentication → Providers**, keep Email enabled.
4. Under **Authentication → Sign In / Providers**, choose email confirmation:
   - **On** for production-like behavior (new accounts must confirm before
     signing in).
   - **Off** only in the test project, so `npm run verify:supabase` can create
     accounts without a mailbox.
5. Under **Authentication → URL Configuration**, set:
   - **Site URL**: the deployed origin, for example `https://your-domain.example`.
   - **Redirect URLs**: the same origin (password-recovery links return there).
   For local testing also add `http://localhost:5173` and
   `http://localhost:4173`.

Never enable anonymous sign-ins, phone auth, or OAuth providers for this app.

---

## 2. Collect the three values

| Value | Where to find it | Goes into | Secret? |
| --- | --- | --- | --- |
| Project URL | Project Settings → API | Client build | Public |
| `anon` public key | Project Settings → API → Project API keys | Client build | Public, protected by RLS |
| Database connection string | Project Settings → Database → Connection string (URI) | Migration shell only | **Yes** |

The **service-role key must never be used** in this repository, in a build, or in
the browser. The anon key is safe in the client because every row is protected by
row-level security; it can only read or write records belonging to its own
account.

Create a git-ignored `.env.online.local` by copying the committed example:

```bash
cp .env.online.example .env.online.local
```

Fill in:

```dotenv
VITE_EDITION=online
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

`VITE_EDITION` is redundant with `--mode online`, but it keeps the intent
explicit. The database connection string is **not** a Vite variable and must not
be placed in this file. Keep it in your shell only:

```bash
export SUPABASE_DB_URL='postgresql://postgres:...@db.your-project-ref.supabase.co:5432/postgres'
```

`.env*` files are ignored except the committed `*.example` files. Do not paste
keys into issues, screenshots, commits, or chat.

---

## 3. Apply the migration

The migration creates:

- `public.sync_records` — the per-account mirror (one row per entity).
- `public.sync_server_seq` — the global pull cursor.
- Row-level security and four owner-only policies.
- `sync_upsert`, `sync_delete`, `sync_list_changes`, `sync_count_rows` —
  security-invoker RPCs with compare-and-swap revisions, idempotent replay, and
  soft deletes.
- `export_my_account` — returns only the caller's live records as JSON.
- `delete_my_account` — deletes the login and, by cascade, every cloud record.

Apply it with `psql`:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -f supabase/migrations/20261030000100_online_sync.sql
```

Or with the Supabase CLI:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

The migration is safe to re-apply: the table and policies use `if not exists` /
`drop policy if exists`, and functions use `create or replace`.

If `delete_my_account` reports a permission error against `auth.users`, run the
function body once as the database owner (`supabase_admin`) in the SQL editor, or
delete the login through **Authentication → Users** in the dashboard. Account
deletion is also covered by `npm run verify:supabase`.

---

## 4. Run and build

```bash
npm run dev:online      # development server with accounts and sync
npm run build:online    # type check, then production online build into dist/
npm run preview         # serve the built online artifact on :4173
npm run build           # offline build (replaces dist/ with the account-free bundle)
npm run verify:bundle   # scans dist/ for Supabase/account code and third-party assets
```

The online build reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build
time. If they are missing, the account page loads but explains that cloud
accounts are not configured; local planning keeps working.

For the storefront artifact, always finish with the offline build so `dist/`
contains the account-free edition, then run `npm run verify:bundle`.

---

## 5. Remote verification

`scripts/verify-supabase.mjs` creates two throwaway accounts and checks:

- Each account can read and write only its own records.
- Direct table reads, updates, deletes, and inserts across accounts are blocked.
- Same entity ids coexist in separate accounts.
- Invalid entity types, empty ids, wrong settings ids, and negative revisions are
  rejected; signed-out clients cannot read or write.
- Duplicate submissions do not create another revision; stale writes return both
  versions; deletions are tombstones; exports are account-scoped; account
  deletion removes cloud rows and prevents future sign-in.

Run:

```bash
npm run verify:supabase
```

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | All remote checks passed |
| `1` | A check failed — read the `FAIL` lines |
| `2` | Not run: missing credentials or email confirmation is enabled |

The script uses only the anon key and deletes both test accounts at the end when
the run succeeds. It prints no keys or record contents.

---

## 6. How synchronization works

1. Every local write records an outbox entry or tombstone in the same IndexedDB
   transaction as the data change.
2. The sync engine uploads parents before children (season → recipient → gift →
   idea → settings) and deletes children before parents.
3. Each cloud row stores a `revision`. A write is accepted only when its base
   revision matches; otherwise the server returns both versions and the app
   stores a conflict. There is no last-write-wins overwrite.
4. Retries are safe: a repeated write with the same data and timestamp returns
   the existing revision instead of creating a duplicate.
5. Pulling uses the global `server_seq` cursor. Soft-deleted rows stay in the
   stream so other devices learn about deletions.
6. The first connection uses one of three modes — upload, download, or merge.
   Merge requires a downloaded backup and the typed `CONNECT` confirmation; it
   never deletes or overwrites. Differing records become conflicts for review.

Status values shown in the footer and account page: `synced`, `pending`,
`offline`, `conflict`, `error`, plus `idle`, `signed-out`, and `local`.

---

## 7. Privacy and data handling

- The cloud copy contains the same planner records as this app: seasons,
  recipients (including optional addresses and notes), gifts, ideas, and display
  settings.
- Only the signed-in account can read its rows. No advertising, telemetry, or
  third-party analytics is added.
- Local planning works without an account. Signing out stops automatic sync;
  disconnecting clears this device's sync history but keeps local plans.
- Account deletion removes cloud records and the login. Local plans stay on the
  device unless the browser's site data is cleared separately.
- Password recovery, email delivery, and rate limiting are handled by Supabase
  Auth. The app never stores passwords.
- Account data export downloads a JSON copy from `export_my_account`. Local
  backups and CSV exports remain the complete copy of the device data.

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| “Cloud accounts are not configured” | Build without `VITE_SUPABASE_*` | Rebuild the online edition with `.env.online.local` |
| Sign-up succeeds but no session | Email confirmation is on | Confirm the email, or disable confirmation in the test project |
| Reset link returns to the wrong page | Site/redirect URLs | Add the origin under Authentication → URL Configuration |
| `verify:supabase` exits 2 | Missing env vars or email confirmation | Follow the message; rerun |
| Conflict list keeps growing | Two devices edited the same records | Choose the device or cloud version for each record |
| “This device is linked to a different account” | Shared browser profile | Disconnect the device, then connect the intended account |
| Account deletion reports a permission error | `auth.users` ownership | See the note in section 3 |
