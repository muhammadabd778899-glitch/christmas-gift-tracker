# Milestone 9 Report — Professional interface, themes, and accessibility

**Status:** Complete and verified on 2026-10-30  
**Version:** 0.9.0  
**Git checkpoint:** `feat: polish interface, themes, and accessibility`  
**Tag:** `milestone-9`

Companion documents: `docs/ACCEPTANCE_CRITERIA.md`, `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, and `docs/ARCHITECTURE.md`.

---

## 1. What shipped

### 1.1 Light, dark, and system themes

- The palette remains the approved warm ivory, deep evergreen, muted burgundy, and soft gold identity. Dark mode overrides canvas, surface, border, shadow, status, action, chart, and focus tokens rather than applying a filter.
- `[data-theme='light|dark']` on `<html>` drives the token set; `color-scheme` and the `theme-color` meta tag update with it.
- Settings stores `light`, `dark`, or `system` in IndexedDB. **D-017** mirrors only the theme value to `localStorage` for a synchronous pre-paint script in `index.html`; IndexedDB wins once settings load.
- A header toggle cycles the theme and exposes the current choice. `system` follows `prefers-color-scheme` live and updates when the OS preference changes.
- A first-paint snapshot confirmed the mirrored dark theme was applied at DOMContentLoaded before React painted, with no intermediate wrong-theme value.

### 1.2 Rebuilt Settings and currency display

- Settings is organized into appearance, currency display, diagnostics, privacy, app/schema version, and the existing data tools.
- Theme choices are described in plain language. Currency presets and a custom code/symbol are supported with 0–3 fraction digits.
- Currency settings are display-only (**D-015**): stored minor units are never converted or rewritten. When monetary data exists, saving a format change opens a confirmation dialog that explains reinterpretation and offers a one-click backup download.
- Diagnostics render the existing PII-free `healthCheck()` report: counts, issue codes, storage estimates, persistence status, and versions. The report contains no names, addresses, notes, or gift text.
- The privacy card explains local-only storage, browser-eviction risk, and the absence of analytics, telemetry, cloud sync, and runtime third-party requests.

### 1.3 Accessibility

- Metric explanations use a keyboard-focusable `InfoTip` for planned vs spent vs remaining, unallocated budget, and utilization. Enter/Space opens, Escape closes and restores focus.
- The budget chart keeps an accessible name and a table alternative with the same numbers. The SVG remains hidden from assistive technology and Recharts' focus layer is disabled.
- Status is always conveyed by text and/or icon as well as color. Progress bars expose `role="progressbar"` with values.
- Buttons, icon buttons, season chips, dialog controls, and mobile status toggles meet 44×44 px targets. Focus uses a 3 px visible ring in both themes.
- Dialogs use the native `<dialog>` element for focus containment, Escape handling, labelled titles/descriptions, and focus restoration.
- `prefers-reduced-motion` suppresses transitions and animations.
- The light focus ring was darkened from gold-500 to gold-600 after measurement showed the lighter gold at only 2.55–2.83:1 against light surfaces.

### 1.4 Responsive layout and print

- All routes were exercised at 360, 768, 1024, and 1440 px with no page-level horizontal overflow.
- Gifts becomes a stacked card list at ≤720 px and Shopping at ≤640 px, with visible field labels, full-width actions, and 44 px status toggles. Mobile rules are scoped to `@media screen`, so print keeps the tabular layout.
- The dashboard summary grid uses five columns on wide screens and three on tablet, avoiding an orphaned fifth card.
- Chart data tables reduce cell padding instead of forcing page scrolling. Badges no longer stretch to fill card headers.
- A 4 px horizontal overflow in the desktop sidebar was found during the 1440 px sweep (the nowrap brand name sized an auto grid track) and fixed by constraining the track, reducing the sidebar-only brand size to 1rem, and guarding horizontal overflow.
- Print hides navigation, filters, and controls and preserves table structure; the shopping list PDF was generated and inspected.

### 1.5 Supporting changes

- Version and milestone metadata moved to 0.9.0 / Milestone 9 across the sidebar, header, mobile navigation, footer, About dialog, and tests.
- Onboarding now includes theme and currency choices and the optional sample-data action while continuing to create nothing automatically.
- Documentation, acceptance criteria, decisions, architecture boundaries, and the README were updated.

---

## 2. What did not ship

- No new business feature, data-model change, or storage migration.
- No service worker, manifest, offline package, or install prompt.
- No self-hosted or remote brand font; the system font stack remains.
- No cloud account, synchronization, or cross-device theme storage.
- No automated WCAG audit, screen-reader session, or Lighthouse run.
- Playwright remains deferred.

---

## 3. Decisions

- **D-015 accepted for Milestone 9:** currency formatting is display-only; stored minor units are never converted, and a change with data present requires confirmation plus a backup recommendation.
- **D-017 accepted for Milestone 9:** theme is authoritative in IndexedDB and mirrored to `localStorage` only for pre-paint; the IndexedDB value wins after load.
- **O-2 decided:** keep the name “Christmas Gift Tracker” and refine the existing warm/evergreen/burgundy/gold identity instead of renaming the product.
- Earlier decisions still apply: D-009 archived read-only, D-016 sample isolation, D-018 zero/one active season, D-029 destructive-action gates.

---

## 4. Verification evidence

### 4.1 Static checks and final machine evidence

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | **33 files, 307 tests passed, 0 failed** |
| `npm run test:coverage` | Pass |
| `npm run build` | Pass |
| Prettier on changed files (`--end-of-line auto`) | Pass |

Final coverage:

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All files | 85.35% | 78.00% | 86.04% | 86.09% |

Final production build:

- Main app chunk: 650.04 kB (191.99 kB gzip).
- Lazy chart chunk: 373.09 kB (107.47 kB gzip).
- CSS: 106.56 kB (18.81 kB gzip).
- `db`, `repositories`, and `initialize` chunks are emitted separately.
- Vite reported only the expected >500 kB chunk warning; the build passed.

Honest note on test stability: one intermediate full run and one coverage run each failed a single test — the reset test in `SeasonsPage.test.tsx` exceeded Testing Library's 1 s default wait under heavy parallel load. The assertion now allows 4 s. The file passed three consecutive isolated runs and the final full suite passed 33/33 files and 307/307 tests.

### 4.2 Automated coverage

Milestone 9 added **16 tests**, taking the suite from 291 to 307 across 33 files (from 31):

- `src/lib/theme.test.ts` — 4 tests: supported preference parsing, explicit/system resolution, local mirror read/write, and document/browser-chrome application.
- `src/pages/SettingsPage.test.tsx` — 7 tests: page sections, theme save, currency save without monetary data, confirmation plus no stored-value rewrite with monetary data, invalid custom fields, PII-free diagnostics, and the data-tools link.
- Five additional assertions/flow tests were added to the existing dashboard, recipient-detail, season-setup, seasons, and app suites for reduced motion, responsive labels, onboarding choices, the reset backup button, and milestone metadata.

### 4.3 Manual browser verification

Environment: headless Microsoft Edge 156 (Chromium) with CDP against the Vite development server, using local IndexedDB data. Screenshots were captured for review.

- **Route/width sweep:** `/`, `/recipients/:id`, `/recipients`, `/gifts`, `/ideas`, `/shopping`, `/seasons`, `/settings`, `/onboarding`, and an unknown route at 360, 768, 1024, and 1440 px. Every measurement showed `scrollWidth` equal to the viewport and no element outside it (excluding internally scrollable regions). One transient storage-error render appeared during rapid back-to-back navigation and did not reproduce in three isolated retests; no data was changed.
- **Themes:** light and dark persisted across reload. The dark pre-paint snapshot recorded dark at DOMContentLoaded with no wrong-theme mutation. Switching to `system` followed emulated OS light → dark → light live, updating `data-theme`, `color-scheme`, and `theme-color` while keeping `localStorage` at `system`.
- **Keyboard:** Tab reached the skip link, navigation, theme toggle, About, hero actions, Edit budget, the unallocated-budget tooltip, and the chart summary/table, all with a visible 3 px ring. Enter opened the tooltip; Escape closed it and returned focus.
- **Mobile dialog:** At 360 px, Add gift opened a 340 px-wide dialog inside the viewport, with every control visible, focus inside, body scroll locked, and Escape closing it and returning focus to the Add gift button.
- **Responsive layouts:** 768 px screenshots of dashboard, recipients, recipient detail, gifts, ideas, shopping, seasons, and settings; 360 px screenshots of recipients and gifts; 1440 px dashboard and onboarding. Cards, filters, actions, and tables remained readable and reachable.
- **Print:** navigation and header were hidden, no buttons or links appeared inside the print root, the shopping table remained `display: table`, and a PDF was generated.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, transition and animation durations computed to 1e-05 s.
- **Token audit:** 0 missing CSS custom properties (85 defined, 80 used).
- **Sidebar fix:** the 4 px overflow was re-measured after the fix (`scrollWidth` 277 = `clientWidth` 277, no overflowing children) and the horizontal scrollbar disappeared from the 1440 px screenshot.

### 4.4 Contrast check

Token pairs were computed with the WCAG relative-luminance formula:

- Primary and soft text: 4.51–16.23:1 in both themes.
- Action and inverse text: 5.72–13.67:1.
- Success, critical, and burgundy status text: 5.36–9.52:1.
- Gold text on gold surfaces: 4.96–9.75:1.
- Focus rings: 3.21–7.94:1 after the gold-600 correction.

This is a token-pair check, not a full automated contrast audit of every rendered state.

### 4.5 Lighthouse and assistive technology

No Lighthouse, axe, or screen-reader session was run for Milestone 9. This report makes no automated accessibility score or screen-reader claim.

---

## 5. Acceptance criteria

| ID | Criterion | Result |
| --- | --- | --- |
| AC-9.01 | All pages share consistent typography, spacing, surfaces, borders, status badges, and action placement. | Pass |
| AC-9.02 | The palette is a restrained warm/evergreen/burgundy/gold system, not excessive holiday decoration. | Pass |
| AC-9.03 | Light, dark, and system themes work and persist across reloads. | Pass |
| AC-9.04 | Theme applies before first paint with no flash of the wrong theme. | Pass |
| AC-9.05 | Currency symbol/code/fraction digits are configurable, formatted consistently, and persisted. | Pass |
| AC-9.06 | Changing currency format with data present requires confirmation and does not alter stored values. | Pass |
| AC-9.07 | All routes are usable at 360 px, 768 px, 1024 px, and 1440 px. | Pass — swept in headless Edge |
| AC-9.08 | Forms are touch-friendly; controls meet 44×44 px targets. | Pass |
| AC-9.09 | Tables/cards avoid page-level horizontal overflow and remain readable on mobile. | Pass |
| AC-9.10 | Every form control has a visible, associated label and accessible error message. | Pass |
| AC-9.11 | Keyboard navigation, focus order, dialog focus trapping, and Escape behavior are correct. | Pass |
| AC-9.12 | Focus indicators are clearly visible in both themes. | Pass — contrast measured |
| AC-9.13 | Status is never conveyed by color alone; icons/text accompany color. | Pass |
| AC-9.14 | Text and controls meet WCAG 2.2 AA contrast targets in both themes. | Pass — token-pair check; no automated audit |
| AC-9.15 | Charts have accessible names and a table/text alternative. | Pass |
| AC-9.16 | `prefers-reduced-motion` is respected. | Pass |
| AC-9.17 | Shopping List print styles are correct and exclude navigation/controls. | Pass |
| AC-9.18 | Empty, error, loading, and read-only states are visually consistent. | Pass |
| AC-9.19 | Tooltips explain non-obvious metrics and are keyboard accessible. | Pass |
| AC-9.20 | No working business logic or data behavior is replaced by static mockups. | Pass |
| AC-9.21 | Settings includes currency, theme, data tools, diagnostics, privacy, and app/schema version. | Pass |
| AC-9.22 | First-run onboarding is complete and matches the documented flow, including optional sample data. | Pass |
| AC-9.23 | Regression tests, typecheck, lint, and build pass. | Pass |

---

## 6. Honest limitations

- **No browser E2E suite.** Playwright is still deferred; the route/width and keyboard checks were scripted manually through CDP, not a committed E2E suite.
- **Chromium-only manual verification.** Headless Edge covered the responsive and theme checks. Firefox, Safari, iOS, real touch hardware, and browser zoom levels were not tested.
- **No screen-reader or automated WCAG audit.** Contrast was checked on token pairs and by visual inspection; every rendered state, disabled control, focus-over-image case, and assistive-technology interaction was not audited.
- **Focus ring on the gold accent surface.** The dark-theme gold ring sits on the surrounding panel when offset; it was not re-measured against the gold button fill itself because the gap shows the panel. No user issue was observed.
- **Theme is per browser profile.** There is no cross-device or cross-browser sync.
- **System fonts only.** No brand font is bundled or fetched.
- **Manual test flake.** The reset test's original 1 s default wait was too tight for the coverage run; the explicit 4 s timeout addresses the harness, not app behavior.
- **Build size.** The main chunk grew to 650.04 kB and remains above the Vite 500 kB warning; route-level splitting remains future work.
- **Transient dev-only state.** One storage-error screen appeared while navigating rapidly between routes in the dev server and did not reproduce in isolated retests; it is recorded rather than dismissed.
- **No persistence request.** `navigator.storage.persist()` is still not called; browser eviction remains possible and the UI says so.

---

## 7. Next step

Milestone 9 is complete and ready for owner review. Milestone 10 — Offline delivery — begins only after owner review and authorization.
