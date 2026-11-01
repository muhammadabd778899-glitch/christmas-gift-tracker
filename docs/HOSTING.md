# Hosting the Offline Edition on Cloudflare

**Status:** Configuration complete and verified locally on 2026-11-01; the first deployed build failed on a `_redirects` rule (error 100324). That file is removed and the supported SPA fallback is now committed. Deployment retry and the public address remain owner actions (O-13)
**Edition:** Offline (account-free) only
**Related:** `docs/OFFLINE_SETUP.md`, `docs/MILESTONE_12_REPORT.md`, D-037 and D-038 in `docs/DECISIONS.md`

This project deploys as a **Cloudflare Worker with static assets**, which is the flow the Cloudflare dashboard set up for this repository. It is not a classic Pages project, so `wrangler pages deploy` does not apply.

---

## 1. What is deployed

| Item | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |
| Node.js | 22 (Vite 8 requires `^20.19.0 \|\| >=22.12.0`) |
| Environment variables | `NODE_VERSION=22` only |
| Supabase variables | None. Never add `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` |
| Worker/project name | `christmas-gift-tracker` |

The offline build is selected by the default Vite mode. `npm run build:online` and `npm run dev:online` must not be used for this project. The offline bundle scan (`npm run verify:bundle`) rejects account, sync, privileged-key, or third-party runtime content.

## 2. Deployment configuration in this repository

| File | Purpose |
| --- | --- |
| [`wrangler.jsonc`](../wrangler.jsonc) | Worker name, compatibility date, asset directory `./dist`, and `not_found_handling: "single-page-application"` for client-side routes. |
| [`public/_headers`](../public/_headers) | Immutable caching for hashed `/assets/*`; `no-cache` for `index.html`, `sw.js`, and `manifest.webmanifest`; `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`. Wrangler reported five valid header rules. |
| [`.nvmrc`](../.nvmrc) | Node 22 for local builds. |
| [`.gitignore`](../.gitignore) | Ignores local `.wrangler/` state and the git-ignored hosting build copy. |

### Why there is no `_redirects` file

The first deployment failed during upload with:

```
Invalid _redirects configuration:
Line 1: Infinite loop detected in this rule. This would cause a redirect to
strip `.html` or `/index` and end up triggering this rule again. [code: 100324]
```

The rule was `/* /index.html 200`. Cloudflare's Workers static-assets validator treats a rewrite to `index.html` as a potential loop because of its HTML path normalization. The supported mechanism for this platform is `assets.not_found_handling: "single-page-application"`, which returns `index.html` with a 200 response for requests that do not match an asset. Do not re-add `_redirects` to this project; it will block deployment again.

Classic Pages projects use `_redirects` for the same purpose. If this project is ever rebuilt as a classic Pages site, add `public/_redirects` with `/* /index.html 200` there; that file is not valid for the current Workers project.

No Content-Security-Policy is set. The app uses an inline first-paint theme script, so a CSP needs a nonce or hash and its own verification pass; adding a broken CSP would be worse than omitting it.

## 3. Retry the deployment

1. Open <https://dash.cloudflare.com/> > **Workers & Pages** > `christmas-gift-tracker`.
2. Confirm the build settings: build command `npm run build`, deploy command `npx wrangler deploy`, output directory `dist`, `NODE_VERSION=22`.
3. Confirm no Supabase variables exist in the project.
4. Start a new deployment. Either push the commit that removed `_redirects` and added `wrangler.jsonc` (a connected Git project rebuilds on push), or use **Deployments** > **Retry** / **Create deployment** for the latest commit on `main`.
5. Watch the build: it should finish with `Uploaded ... assets` and no `_redirects` error. Wrangler now reads the committed configuration instead of running its setup wizard.

If the dashboard still shows the old deploy command or project settings that mention Pages, verify the project type under **Settings**. This project is a Worker with static assets.

## 4. Direct upload alternative

```bash
npm run build
npm run verify:bundle
npx wrangler login
npx wrangler deploy
```

Run this from the repository root so `wrangler.jsonc` is found. `npm run build` must run first because `dist` is the asset directory. Do not use `wrangler pages deploy`; that targets classic Pages projects.

`release/Offline-Edition/` remains a byte-identical copy of `dist` for manual inspection or upload from another tool. It is git-ignored.

## 5. Address and custom domain

The Worker receives a `https://<worker>.<account-subdomain>.workers.dev` address after the first successful deployment. A custom domain is optional: open the Worker > **Settings** > **Domains & Routes** > **Add** > **Custom domain**. Cloudflare issues the certificate automatically; the zone must be on Cloudflare or delegated by CNAME.

The customer documents say “the address supplied with your purchase”, so no PDF regeneration is required to publish. Record the final address in:

- the Etsy listing description and purchase/thank-you message;
- `docs/MILESTONE_12_REPORT.md` and the O-13 owner-question rows;
- the release notes for future versions.

If the address is later added to the customer documents, regenerate the PDFs and rebuild the ZIP (`docs/MILESTONE_12_REPORT.md` section 1.2 records the procedure).

## 6. Verification evidence (2026-11-01)

Local verification used Wrangler 4.156.0 against the exact committed configuration; no Cloudflare account is needed for these checks.

| Check | Result |
| --- | --- |
| `npx wrangler deploy --dry-run` | Passed; read 20 files from `dist`, no `_redirects` validation error |
| `npx wrangler dev` header parsing | Passed: “Parsed 5 valid header rules” |
| `/`, `/settings`, `/gifts`, `/archives`, `/shopping-list` | `200` with `text/html` through the SPA fallback |
| `/sw.js` | `200`, `text/javascript`, `Cache-Control: no-cache`, security headers present |
| Hashed `/assets/*.js` | `200`, `Cache-Control: public, max-age=31536000, immutable` |
| Manifest | `200`, `application/manifest+json` |
| Unknown asset path | `200` with `index.html` (SPA fallback behavior) |
| Service worker | Registered, activated, 15 entries precached, controls the page after one reload |
| Offline reload | Stopped the local server, reloaded `/settings`; the page rendered from the service-worker cache with no console errors |

## 7. Post-deployment checklist

Run these after the Cloudflare deployment succeeds.

1. `curl -I https://<address>/settings` returns `200` and `Content-Type: text/html`.
2. `curl -I https://<address>/sw.js` returns `200` with `Cache-Control: no-cache`.
3. A hashed file under `/assets/` returns `Cache-Control: public, max-age=31536000, immutable`.
4. In a clean Chrome or Edge profile, the dashboard loads, the footer says **Saved on this device**, and the offline banner appears.
5. Create a season, add a recipient and a gift, reload, and confirm the records persist.
6. Reload once so the service worker controls the page, then enable DevTools **Offline** (or disconnect the network) and open Dashboard, Recipients, Gifts, Shopping List, Seasons, Archives, Settings, and Ideas. All must load.
7. The network log contains no requests to Supabase or any third-party origin.
8. The install prompt or address-bar install icon appears in Chrome or Edge.
9. Restore `release/Sample-Data/Sample-Backup.json` in a scratch profile if a full data-path check is wanted.

## 8. Guardrails

- Keep this project offline-only. Do not add Supabase variables, do not deploy `dist` from `npm run build:online`, and do not point the project at the online branch.
- Do not re-add `public/_redirects`; use `not_found_handling` for SPA routes on Workers static assets.
- The offline edition stays account-free. `npm run verify:bundle` must pass before every deployment.
- HTTPS is required for the service worker and installation. Do not distribute a `file://` copy.
- Never publish a build that has not passed typecheck, lint, tests, and the offline artifact checks.
- Re-run the checks in section 6 and 7 after any hosting, dependency, or content change.
- Roll back from the Cloudflare deployment history rather than editing deployed files by hand.
- The Free plan has no static bandwidth cap, but confirm Cloudflare's current Free plan terms and limits before launch. This guide is not legal advice.

## 9. Costs and limits

The build is about 2 MB total (21 precached entries, 15 cached runtime files), far below Cloudflare's file-count and file-size limits. The Free plan is sufficient; no server, database, or paid add-on is needed for the offline edition.

## 10. Current state

| Step | State |
| --- | --- |
| Host selected | Cloudflare (D-037), deployed as Workers static assets (D-038) |
| SPA fallback and headers configured | Yes; `wrangler.jsonc` plus `_headers` |
| Cause of the first failure | `_redirects` rewrite rejected with error 100324; file removed |
| Offline artifact rebuilt and verified | Yes, byte-identical copy verified 2026-11-01 |
| Deployed to Cloudflare | **No — retry the deployment from the owner's dashboard** |
| Public address recorded | **No** |
| Address added to Etsy listing | **No** |
