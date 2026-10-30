# Milestone 10 Report — Validated offline delivery

**Status:** Complete and verified on 2026-10-30  
**Version:** 0.10.0  
**Git checkpoint:** `feat: implement validated offline delivery`  
**Tag:** `milestone-10`

Companion documents: `docs/ACCEPTANCE_CRITERIA.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, and the customer-facing `docs/OFFLINE_SETUP.md`.

---

## 1. What shipped

### 1.1 Installable offline-first PWA

- `vite-plugin-pwa` 2.0.0 generates a Workbox service worker with **21 precache entries / 1279.74 KiB**: HTML, JS, CSS, SVG/PNG icons, and the web manifest. System fonts need no download.
- `registerType: 'prompt'`, `injectRegister: false`, `clientsClaim: false`, and `skipWaiting: false`; registration runs through `virtual:pwa-register/react` only in the production build.
- SPA navigation fallback to `/index.html`, outdated-cache cleanup, and no runtime caching of third-party origins (there are none).
- The web manifest sets the product name, short name, description, `start_url`, `scope`, standalone display, portrait orientation, theme/background colors, categories, and 192 px, 512 px, maskable 512 px, and SVG icons. `public/icons/` also contains an Apple touch icon.
- `index.html` adds the Apple touch icon, mobile-web-app-capable, Apple web-app-capable/title/status-bar metadata, and the injected manifest link.
- The router switches to a hash router on `file:` origins so the evaluated single-file build can start; normal hosted use keeps `BrowserRouter`.

### 1.2 Consent-based updates

- A waiting service worker surfaces “A new version is ready.” with **Reload to update** and **Later**. “Ready to work offline.” appears once caching completes.
- The app never reloads on its own. If any `<dialog open>` exists, the reload is refused and the banner explains that unsaved form work could be discarded; the user closes the work first and can then reload.
- The update hook (`src/pwa/usePwaUpdate.ts`) is wrapped by `UpdatePrompt`, which is absent on unsupported origins.

### 1.3 Truthful offline status and install guidance

- The footer shows **“Saved on this device”** online and **“Offline — all data saved on this device”** offline, with a status role and polite live region. It makes no sync or cloud claim.
- Settings includes **Install and work offline**: current install state, a native install button when the browser offers one, per-browser steps for Chrome/Edge desktop, Android, iPhone/iPad Safari, and Firefox desktop, the one-online-visit requirement, the consequence of clearing site data, and the update-consent behavior.
- The About dialog and Settings build facts now describe the installable offline app, the update prompt, the status indicator, and the one-time setup requirement.

### 1.4 Persistent storage and recovery guidance

- **D-030:** Settings explains browser eviction and offers a user-initiated **Request persistent storage** button. Results are reported for granted, declined, unsupported, and unavailable, with backup guidance in every case.
- `src/storage/persistence.ts` isolates `StorageManager.persist()` behind a tested function with a four-result union.
- Storage-unavailable and quota errors now state that data was not deleted, recommend downloading a backup, and suggest freeing space before retrying. The recovery page keeps its no-destructive-action design.
- Diagnostics continue to show persistence status and let the user refresh after a request.

### 1.5 Standalone `file://` spike and delivery decision

- `vite.config.standalone.ts` builds a single HTML file with `vite-plugin-singlefile`, relative `base: './'`, the hash router, and a no-op PWA-register alias. `npm run build:standalone` writes to ignored `dist-standalone/`.
- The file launched from `file://` in Microsoft Edge 156, created the `christmas-gift-tracker` IndexedDB database, saved a season and sample records, and kept them across reload and browser restart. Service workers are unavailable on `file://`; the probe reports `-1` after handling the `SecurityError`.
- **It is not shipped.** Firefox, Safari, iOS/iPadOS, and Android were not available for the required matrix, and `file://` cannot provide the service-worker install/update path. **D-011** and **O-1** record the hosted PWA as the delivered edition. **O-12** records that no desktop wrapper is built; revisiting it requires a separate owner decision.

### 1.6 Supporting changes

- `src/lib/appInfo.ts` moved to 0.10.0 / Milestone 10; the About dialog, Settings roadmap, and tests were updated. The M10 roadmap row is now Complete.
- `vitest.config.ts` aliases the virtual PWA module to `src/pwa/registerStub.ts`, so component tests resolve the same import without a service worker.
- `tsconfig.node.json` now includes Node types and `vite.config.standalone.ts`, so configuration files are type-checked.
- `.gitignore` excludes `dist-standalone/`; the README, decisions, acceptance criteria, plan, architecture, product spec, and setup guide were updated.
- No data-model change, schema migration, repository behavior change, or automatic data action was introduced.

---

## 2. What did not ship

- No online accounts, cloud backup, or synchronization (Milestone 11).
- No desktop wrapper (O-12).
- No standalone ZIP or HTML download as the offline edition.
- No Playwright/E2E suite; the artifact checks used a temporary CDP harness that is not committed.
- No automated install-prompt exercise; headless Edge did not emit `beforeinstallprompt`.
- No Firefox, Safari, iOS/iPadOS, or Android verification.
- No custom offline write queue; the existing IndexedDB repositories already operate offline.
- No Lighthouse/audit score or app-store packaging.

---

## 3. Decisions

- **D-011 accepted for Milestone 10:** PWA-first offline delivery. The standalone spike ran but did not pass the full browser matrix, so it is not shipped.
- **O-1 decided:** the hosted installable PWA is the offline edition; Etsy copy must state the one-time online visit.
- **O-12 decided:** no desktop wrapper in Milestone 10; revisit only with a separate owner decision.
- **D-030 accepted:** persistent storage is requested by the user from Settings, with plain-language results, not at startup.
- Earlier decisions still apply: D-009 archived read-only, D-013/D-022 no remote assets or telemetry, D-016 sample isolation, D-018 zero/one active season, D-029 destructive-action gates.

---

## 4. Verification evidence

### 4.1 Static checks and final machine evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test -- --maxWorkers=2` | **37 files, 327 tests passed, 0 failed** |
| `npm run test:coverage` (`--maxWorkers=2`) | Pass |
| `npm run build` | Pass |
| Prettier on changed files (`--end-of-line auto`) | Pass |

Honest note on the test command: the first plain `npm test` run aborted with a Node worker “Zone Allocation failed — process out of memory” while only 1.6 GB of 7.9 GB RAM was free; no test assertion failed before the abort. The same full suite then passed twice with `--maxWorkers=2`. The repository’s default Vitest parallelism was not changed.

Honest note on formatting: `npm run format:check` flags the whole working tree because this checkout uses `core.autocrlf=true` (CRLF files) while Prettier is configured for LF. Changed files were formatted and checked with `--end-of-line auto`, matching the Milestone 9 practice; untouched files were not mass-rewritten.

Final coverage:

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All files | 85.27% | 77.95% | 85.60% | 86.00% |

Final production build:

- `dist/manifest.webmanifest` — 0.71 kB.
- Main app chunk `index-BdFxW1A7.js` — 661.90 kB (195.76 kB gzip).
- Lazy chart chunk — 373.09 kB (107.47 kB gzip).
- CSS — 109.16 kB (19.24 kB gzip).
- `db` (94.45 kB), `repositories` (37.02 kB), `initialize` (1.45 kB), and Workbox window (5.65 kB) are separate chunks.
- PWA output: `dist/sw.js`, `dist/workbox-2fbc6a65.js`, **21 precache entries / 1279.74 KiB**.
- Vite reported only the expected >500 kB chunk warning; the build passed.

### 4.2 Automated coverage

Milestone 10 added **20 tests**, taking the suite from 307 tests across 33 files to **327 tests across 37 files**:

- `src/storage/persistence.test.ts` — 5 tests: granted, denied, missing manager, missing `persist`, and a thrown request.
- `src/components/layout/ConnectionStatus.test.tsx` — 3 tests: online wording, event-driven offline/online switching, and initial offline state.
- `src/components/layout/UpdatePrompt.test.tsx` — 6 tests: unsupported origin, no-status empty render, offline-ready dismissal, “Later,” reload, and the open-dialog guard with recovery after closing.
- `src/pwa/useInstallPrompt.test.tsx` — 5 tests: unavailable prompt, accepted outcome, dismissed outcome, `appinstalled`, and standalone display detection.
- `src/pages/SettingsPage.test.tsx` — 1 new test: install guidance and the unsupported persistent-storage result. The existing suite also covers the settings page composition and data tools.
- `src/app/App.test.tsx` now expects “Milestone 10 of 12: Validated offline delivery.”; `src/app/StorageRecoveryPage.test.tsx` asserts the strengthened quota description without matching the technical detail twice.

### 4.3 Production artifact verification (network disabled)

Environment: headless **Microsoft Edge 156 (Chromium)** on Windows, CDP against `vite preview` serving `dist/`, using profile-local IndexedDB. The network was disabled with `Network.emulateNetworkConditions` after the app was controlled by the service worker.

| Check | Result |
| --- | --- |
| Online launch and service-worker activation | Pass — scope `http://localhost:4173/`, state `activated` |
| Manifest content | Pass — name, standalone display, 192/512/maskable/SVG icons, `start_url: /` |
| Controlled after reload | Pass |
| Offline reload | Pass |
| Footer offline wording | Pass |
| Offline route sweep (`/gifts`, `/recipients`, `/ideas`, `/shopping`, `/seasons`, `/settings`, `/`) | Pass — all titles correct, no error state |
| Offline season creation | Pass |
| Offline recipient creation | Pass |
| Offline gift creation and edit | Pass |
| Persistence after offline reload | Pass |
| Backup download offline | Pass |
| CSV download offline | Pass |
| Persistent-storage request | Pass — headless Edge declined; the UI explained the decline and recommended backups |
| Install guidance | Present — confirmed by DOM inspection; the earlier boolean check was case-sensitive against uppercase CSS |
| Console messages during the flow | None |
| Browser restart while offline | Pass — cached app launched and records remained |

### 4.4 Update flow

A temporary second build (0.10.1-verify) was served in the same profile:

- The waiting worker produced the “A new version is ready.” banner.
- With a dialog open, **Reload to update** was refused and the unsaved-work warning appeared; the old version stayed active.
- After closing the dialog, reload applied the update and the page became controlled by the new worker.
- The source was restored to 0.10.0 and rebuilt; no verification version remains.

### 4.5 Standalone `file://` spike

- The single HTML file loaded from disk in Edge 156 and rendered the app.
- IndexedDB opened and stored a season plus sample records; data survived reload and browser restart.
- Service-worker registration is unavailable on `file://`; the probe returned `-1` after catching the security error.
- The file is excluded from Git and is not part of the delivered product.

### 4.6 External purchase links offline

A gift purchase link (`https://example.com/product`) was added while offline. The rendered anchor had `target="_blank"` and `rel="noopener noreferrer"`; clicking it left the Gifts page, the gift row, and the app shell intact with no error state or console messages. The link persisted after reload. Opening the destination itself still requires a connection, which the setup guide states.

### 4.7 Remote-origin inspection

- `dist/index.html` contains no remote script, stylesheet, font, icon, or preconnect reference.
- The only remote strings embedded in the JS are React/React Router error-document URLs and a library help link; none is fetched at runtime.
- No runtime request to a third-party origin was observed during the offline flow, and no network error appeared in the console.

---

## 5. Acceptance criteria

| ID | Criterion | Result |
| --- | --- | --- |
| AC-10.01 | The production build precaches HTML, JS, CSS, fonts, icons, and the manifest. | Pass — 21 entries / 1279.74 KiB; system fonts require no asset |
| AC-10.02 | After the documented setup, the app launches with the network disabled. | Pass — Edge |
| AC-10.03 | Reloading while offline works. | Pass — Edge |
| AC-10.04 | All core workflows work offline: seasons, recipients, gifts, dashboard, ideas, shopping, search/filters, archives, backup, CSV. | Pass — route sweep plus create/edit/download checks |
| AC-10.05 | Creating/editing records offline persists after reload and browser restart. | Pass |
| AC-10.06 | No essential font, icon, script, or API is loaded from a remote origin. | Pass — static inspection and offline console/network behavior |
| AC-10.07 | The app handles external purchase links gracefully when offline. | Pass — link clicked offline; app stayed stable |
| AC-10.08 | Persistent-storage support is requested and its result explained. | Pass — user-initiated; four outcomes explained; manual decline verified |
| AC-10.09 | Service-worker updates are presented to the user and never silently discard unsaved form work. | Pass — banner, Later, dialog guard |
| AC-10.10 | Storage-unavailable/quota errors show actionable recovery guidance. | Pass — messages and tests |
| AC-10.11 | The actual deliverable artifact is tested, not only the dev server. | Pass — `dist/` served by `vite preview` |
| AC-10.12 | Chrome/Edge, Firefox, and Safari (incl. iOS if available) results are documented, including failures. | **Partial** — Edge verified; Firefox, Safari, iOS/iPadOS, and Android were unavailable and are documented as untested |
| AC-10.13 | A standalone `file://` build is evaluated in the supported browsers; results are recorded. | **Partial** — built and evaluated in Edge only; the full supported-browser matrix was not possible |
| AC-10.14 | If `file://` cannot reliably persist data, it is not shipped; an approved alternative is documented. | Pass — not shipped; PWA recorded in D-011/O-1 |
| AC-10.15 | Customer-facing setup instructions match the tested artifact and required one-time internet access. | Pass — `docs/OFFLINE_SETUP.md` |
| AC-10.16 | Offline/online status messaging is truthful; the offline edition never claims cloud sync. | Pass |
| AC-10.17 | No unsupported “forever offline” or “works from any HTML file” claim appears. | Pass — About, Settings, setup guide, and README avoid both |
| AC-10.18 | Regression tests, typecheck, lint, and build pass. | Pass — see §4.1; default-worker OOM note applies |

---

## 6. Honest limitations

- **Chromium-only verification.** Only Microsoft Edge 156 was available. Firefox, Safari, iOS/iPadOS, and Android install flows, storage eviction, and offline behavior were not exercised, even though the app is expected to work there. AC-10.12 and AC-10.13 are reported as partial for this reason.
- **Standalone file is not a deliverable.** The `file://` spike proved IndexedDB persistence in Edge but cannot use a service worker, and the required matrix is incomplete. No HTML/ZIP download is offered.
- **Install prompt unverified in a real UI.** Headless Edge did not emit `beforeinstallprompt`; the install button path is covered by unit tests for the hook, and the guidance was verified in the DOM. A real browser install flow was not clicked.
- **Persistent-storage decline.** Headless Edge declined the request, likely because of automation/engagement heuristics. The granted path is unit-tested, not manually observed. The UI explains the decline rather than hiding it.
- **Default test parallelism vs. host memory.** A full default-worker run hit a Node OOM under 1.6 GB free memory; no test failed before the crash. Final evidence uses `--maxWorkers=2`. CI on a normal runner may not reproduce this.
- **No committed E2E suite.** The offline, restart, update, and `file://` checks used a temporary CDP harness; Playwright remains deferred.
- **No Firefox/Safari/iOS hardware.** The setup guide marks their behavior as documented guidance, not verified behavior.
- **Main bundle size.** The main chunk remains 661.90 kB and triggers the Vite 500 kB warning; route-level splitting is future work.
- **Browser storage risk remains.** Persistent storage helps but is not a guarantee; clearing site data or resetting a profile removes records. Backups remain required.
- **Warehouse/hosting not chosen.** The hosted URL, hosting provider, and final Etsy listing copy are owner decisions after this milestone.
- **Prettier repo-wide check.** The CRLF working tree makes `format:check` fail on untouched files; changed files pass with `--end-of-line auto`.

---

## 7. Next step

Milestone 10 is complete and ready for owner review. Milestone 11 — Online edition and cloud synchronization — begins only after owner review and authorization. Nothing in the offline edition depends on a backend, and no account or sync code has been started.
