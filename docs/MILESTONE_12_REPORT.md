# Milestone 12 Report — Final QA, packaging, and Etsy launch

**Status:** Complete and verified locally on 2026-10-31; hosting, public app address, Etsy upload, and live Supabase verification remain owner actions  
**Version:** 1.0.0  
**Git checkpoint:** `release: prepare Christmas Gift Tracker`  
**Tag:** `milestone-12`

Companion documents: `docs/ACCEPTANCE_CRITERIA.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/OFFLINE_SETUP.md`, `release/Listing-Copy.md`, and the customer sources in `release/docs-source/`.

---

## 1. What shipped

### 1.1 Release identity and edition-aware surfaces

- `src/lib/appInfo.ts` now reports version 1.0.0 and Milestone 12.
- `src/edition.ts` exposes `EDITION_LABEL`. The header, sidebar, mobile navigation, dashboard badges, Settings, and About dialog show **Offline edition · v1.0.0** in the shipped build and **Online edition · v1.0.0** in the optional online build.
- The About dialog was rewritten around two honest lists: 31 features included in both editions and 5 additional online-only features, with a separate “Not included” column. The offline dialog no longer implies accounts or sync.
- Settings reports the edition, version, schema, account/sync availability, and updated limitations, including the money-separator rule, the edition-aware backup warning, and the sample season's non-restorable-after-delete behavior.
- Route error copy says “in this release” instead of “in this preview.”
- `package.json`, `package-lock.json`, and the backup envelope version were raised to 1.0.0.

### 1.2 Customer documents and PDFs

Sources live in `release/docs-source/` with a shared A4 print stylesheet and no external fonts or runtime assets.

| Document | Source | PDF pages | PDF size |
| --- | --- | --- | --- |
| START-HERE | `START-HERE.html` | 5 | 492,051 bytes |
| User-Guide | `User-Guide.html` | 16 | 946,079 bytes |
| License-and-Support | `License-and-Support.html` | 4 | 92,173 bytes |

- PDFs were generated with Chromium `Page.printToPDF` through legacy headless Edge (not `--headless=new`, which reports “Printing is not available” on this machine).
- All three PDFs are A4 (`MediaBox 594.96 × 841.92`), tagged (`/StructTreeRoot`), and include a document outline. The footer prints **Christmas Gift Tracker 1.0.0 | Offline edition | page / total**.
- Text extraction with `pdftotext -enc UTF-8` returns zero replacement characters. Arrows, middle dots, em dashes, and the old check-mark glyph were replaced with ASCII text or CSS shapes to keep extraction and accessibility predictable.
- Image alt text is present in the tagged PDFs for the four embedded product figures (1 in START-HERE, 3 in User Guide).
- The User Guide covers all 16 sections: edition, first run/install, dashboard, seasons/archives, recipients, gifts/statuses, ideas, shopping, search, data tools, appearance/currency, offline/updates/storage, privacy, accessibility, troubleshooting, and limitations.
- The License and Support document covers license grant and restrictions, ownership, data/backup responsibility, privacy, support scope and exclusions, updates, Etsy refunds, disclaimers, liability, changes, and independent-product status.
- Documents refer to “the address supplied with your purchase” rather than inventing a hosting URL.

### 1.3 Sample backup

- `release/Sample-Data/Sample-Backup.json` is the exact exported example: format 1, schema 2, appVersion 1.0.0, one flagged sample season, two recipients (Alex, Priya), three gifts, and two ideas, with addresses, notes, statuses, costs, and dates.
- `src/storage/releaseSampleBackup.test.ts` adds two tests: schema/summary validation and a full restore into empty storage with settings and relationship assertions.
- The same file was restored through the real UI into a clean browser profile: validation summary correct, restore notice shown, dashboard showed $450 budget / $92 actual, 3 gifts and 2 recipients.

### 1.4 Screenshots

Twelve real-product screenshots are in `release/screenshots/`, captured from the 1.0.0 offline build with the sample season:

`01-dashboard-light`, `02-gifts-light`, `03-recipients-light`, `04-recipient-detail-light`, `05-ideas-light`, `06-shopping-light`, `07-seasons-light`, `08-settings-light`, `09-dashboard-dark`, `10-settings-dark`, `11-dashboard-mobile`, `12-gifts-mobile`.

Ten are 1440×900 and two are 390×844. The light set was recaptured after the OS resolved to the dark theme, so filenames match the visible theme. Each screen shows only implemented features.

### 1.5 Customer package

`release/Christmas-Gift-Tracker-1.0.0.zip` (1,343,698 bytes) contains:

```
Christmas-Gift-Tracker-1.0.0/
  START-HERE.pdf
  User-Guide.pdf
  License-and-Support.pdf
  Sample-Data/Sample-Backup.json
  Offline-Edition/INSTALL.txt
```

- The validated offline artifact is kept locally at `release/Offline-Edition/` (git-ignored build output; reproducible with `npm run build`) for hosting. Raw build files are deliberately not in the buyer ZIP because the app is a hosted PWA and does not support `file://` storage.
- `INSTALL.txt` is plain ASCII, covers the one-time online visit, install paths, first season, sample backup, local-data responsibility, support, and document references.
- `release/Listing-Copy.md` contains the 115-character Etsy title, full description, 13 tags (all ≤20 characters), attributes, and an honest-claims checklist.
- Hosting URL, Etsy listing URL, and the actual uploaded file remain owner actions.

---

## 2. M11 audit

The Milestone 11 audit found one real defect and fixed it before M12 work:

- **Defect:** `planConnection` counted deleted cloud rows as live records when planning a connection, which could misclassify the cloud side and change the recommended upload/download/merge path.
- **Fix:** commit `74cf4c4` (`fix: plan connections from live cloud records`) plans from live cloud rows only, with added tests in `src/sync/connect.test.ts` and an Account page assertion.
- No other M11 defect was found in the audit. The offline edition still excludes all account and sync code (bundle scan below).

The live Supabase RLS/cross-account verification remains **pending** (task #27). `npm run verify:supabase` still requires the owner’s dedicated project credentials; this report does not claim it ran.

---

## 3. Quality gates (run 2026-10-31)

| Gate | Command | Result |
| --- | --- | --- |
| Type check | `npm run typecheck` | Pass |
| Lint | `npm run lint` | Pass (release artifacts ignored) |
| Unit/integration tests | `npm test` | **382 passed in 44 files** |
| Coverage | `npm run test:coverage` | **78.68% statements / 74.20% branches / 79.84% functions / 79.03% lines**; 382 tests pass |
| Offline production build | `npm run build` | Pass; main 662.19 kB (195.90 gzip), chart 373.09 kB, CSS 109.16 kB; PWA precache 21 entries / 1284.84 KiB |
| Offline bundle scan | `npm run verify:bundle` | Pass; 8 script files scanned, no account, Supabase, sync-RPC, privileged-key, or third-party runtime strings |
| Online production build | `npm run build:online` | Pass; main 998.65 kB (285.06 gzip), chart 373.10 kB, AccountPage 26.93 kB; PWA precache 25 entries / 1556.32 KiB |
| Live Supabase verification | `npm run verify:supabase` | **Not run** — credentials not supplied; AC-11.03/04/09/10/11/15 remain pending |
| Changed-file formatting | `prettier --check --end-of-line auto` on changed files | Pass |

Coverage notes: the optional online Supabase adapter/auth modules are excluded from live execution here, so their coverage is zero; the offline domain, storage, and sync engine are the covered release path. The online main chunk remains above Vite’s 500 kB advisory; it is not part of the offline artifact and was not code-split for this release.

### 3.1 Regression fixes made during M12 gates

- `eslint.config.js` now ignores `release/`, so the copied production bundle is not linted as source.
- `src/storage/releaseSampleBackup.test.ts` reads the shipped JSON through Vite’s `?raw` import instead of Node `fs`/`process`/`Buffer`, keeping the app tsconfig browser-only.
- `.prettierignore` ignores generated release artifacts.

---

## 4. Offline artifact verification

The validated 1.0.0 artifact at `release/Offline-Edition/` is byte-identical to the fresh `npm run build` output (recursive diff clean). It was tested in a fresh Edge profile served over local HTTPS/HTTP preview:

- Service worker registered and controlled the page after the documented reload attempts.
- 15 entries cached for the tested session; the build precache manifest contains 21 entries.
- Online load, then offline launch and reload with the network disabled.
- All seven routes loaded offline: `/`, `/gifts`, `/recipients`, `/ideas`, `/shopping`, `/seasons`, `/settings`.
- Footer reported offline and “all data saved on this device”; version 1.0.0 and Offline edition visible.
- Zero console errors, zero page errors, zero failed requests, and zero requests to foreign origins.
- Creating/editing records persisted after reload; backup download and CSV export worked.
- The sample backup restored into a clean profile; the large-data backup (250 recipients, 1,000 gifts, 300 ideas) restored through the UI in 547 ms after a 265 ms validation, with the dashboard rendering in 309 ms and the gifts page in 638 ms, 1,000 rows, no errors.

Browser matrix limitation: only Microsoft Edge 156 (Chromium) on Windows was available. Firefox, Safari, iOS/iPadOS, and Android were not exercised. The docs include their install guidance but do not claim them as verified.

---

## 5. Online edition status

- `npm run build:online` succeeds and produces the account, sync, conflict, and account-page chunks.
- M11’s local integration tests still pass (fake cloud, protocol, connect planning, sync tracking, Account UI).
- No live Supabase project was available; RLS, cross-account isolation, email delivery, and the live RPC contract remain unproven outside the local fake cloud.
- The online edition is not in the first Etsy release and is not part of the customer ZIP.

---

## 6. Customer claims and limitations

Verified and stated in the listing and guides:

- Account-free offline edition; no sign-in, analytics, advertising, or third-party runtime requests in the offline bundle.
- One online visit is required to cache the app; after that, the tested Chromium path works offline.
- Seven destinations, seasons/archives, recipients, gifts, statuses, budgets, ideas, shopping, search/filters, backups, CSV, themes, currency display, sample data, reset, and persistent-storage request.
- Data lives in the browser; backups and CSV are local downloads; clearing site data can delete records.
- Support is through Etsy Messages; no remote access is requested.

Not claimed:

- Cloud sync, accounts, automatic backup, or cross-device access in the offline edition.
- Native desktop/mobile apps or a self-hosted bundle for buyers.
- Verified Safari, Firefox installation, iOS/iPadOS, or Android behavior.
- A specific hosting URL, listing URL, encryption, or “never lose your data.”
- Live Supabase security verification (pending).

Known limitations documented for customers: one active season at a time; replace-all restore only; no merge; no partial-recipient wrapping exemption; no automatic off-device backup; money-separator ambiguity is explained with examples; the sample season cannot be restored after deletion unless the sample backup is restored again.

---

## 7. Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| AC-12.01 | Pass | 382 tests in 44 files; typecheck and lint pass; no failures hidden |
| AC-12.02 | Pass (tested browser path) | Automated workflow tests plus manual offline run across all seven routes and data tools |
| AC-12.03 | Pass within available environment | Refresh, browser restart, empty data, 250/1,000/300 large data, invalid input, malformed backup, storage errors, mobile screenshots; storage-failure simulation remains practical-only |
| AC-12.04 | Pass | Production run had zero console/page errors, zero failed requests, zero foreign origins |
| AC-12.05 | Pass | Real 1.0.0 screenshots; preview/milestone labels removed; About/Settings edition-aware |
| AC-12.06 | Pass | `npm run build` from the release tree; `release/Offline-Edition/` matches the fresh build byte-for-byte and was served via preview |
| AC-12.07 | Pass | Documented setup, SW control, offline launch/reload, all seven routes |
| AC-12.08 | Pass with the plan’s install-instructions variant | ZIP has three PDFs, sample backup, and `Offline-Edition/INSTALL.txt`; validated artifact retained at `release/Offline-Edition/` for hosting |
| AC-12.09 | Pass | PDFs/instructions were rendered from the same sources and checked for text, page size, tags, outline, footer numbers, and verified browser support |
| AC-12.10 | Pass | Automated restore test plus clean-profile UI restore with correct totals and relationships |
| AC-12.11 | Pass | License/Support PDF and listing copy agree on personal license, backups, privacy, support, refunds, and disclaimers |
| AC-12.12 | Pass | Twelve real screenshots; light/dark labeled correctly; no unimplemented features |
| AC-12.13 | Pass | Privacy sections cover local storage, backups, CSV, hosting logs, Etsy purchases; offline edition transmits no planner data |
| AC-12.14 | Pass | User Guide §16 and Settings limitations list the real constraints |
| AC-12.15 | Pass | This report covers features, tests, build, offline, online status, limitations, package, deployment, and unresolved issues |
| AC-12.16 | Pass | No known critical data-loss, security, calculation, or core-workflow defect; M11 audit defect fixed |
| AC-12.17 | Pass | Listing copy has an explicit honest-claims checklist and avoids sync/backup/encryption overpromises |
| AC-12.18 | Pass | `milestone-12` tag and `release: prepare Christmas Gift Tracker` checkpoint created from the tested tree |

---

## 8. Deployment and next actions

1. **Host the offline edition.** Upload the contents of `release/Offline-Edition/` to an HTTPS static host with SPA fallback (all routes → `index.html`), correct MIME types, and long-lived caching for hashed assets. Rebuild from the tagged commit with `npm run build` if preferred.
2. **Verify the live install.** Open the hosted URL in a clean Chrome/Edge profile, confirm the footer, install prompt, one offline reload, and the version label.
3. **Record the public app address (O-13).** Put it in the Etsy listing and the purchase message. The docs intentionally say “the address supplied with your purchase” until this exists.
4. **Publish the listing.** Review `release/Listing-Copy.md`, upload `release/Christmas-Gift-Tracker-1.0.0.zip`, and keep the three PDFs and sample available through the ZIP.
5. **Optional online edition verification.** Create the dedicated Supabase test project, apply the migration, provide the URL and anon key only through the git-ignored `.env.online.local`, and run `npm run verify:supabase`. This closes AC-11.03/04/09/10/11/15 but does not block the offline release.

---

## 9. Unresolved issues

| Issue | Impact | Owner action |
| --- | --- | --- |
| No public hosting address selected | Etsy listing cannot be published with a working app link | Choose host, upload artifact, record URL (O-13) |
| No Etsy upload or listing URL | The product is packaged but not on sale | Upload ZIP, publish listing |
| Live Supabase RLS/cross-account run not executed | Online-edition security claims remain local-only | Supply dedicated project credentials and run `npm run verify:supabase` |
| No Playwright/browser E2E suite | Regression coverage is Vitest + manual Chromium | Optional future work |
| Safari/Firefox/iOS/Android not verified | Docs give guidance but make no verified claim | Test when hardware is available |
| Online main chunk >500 kB advisory | Slower online first load; offline artifact unaffected | Optional code-splitting |
| Release ZIP uses install notes rather than raw build files | Buyers cannot self-host from the ZIP | Intentional per D-036; host the retained artifact |

---

## 10. Conclusion

Release 1.0.0 is a tested, documented, account-free offline planner with a real customer package, honest limitations, and a reproducible verification trail. The remaining work is external: hosting, publishing the Etsy listing, and optionally completing the live Supabase security run for the separate online edition.
