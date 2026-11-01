# Hosting the Offline Edition on Cloudflare Pages

**Status:** Configuration complete and verified locally on 2026-11-01; deployment and public address pending the owner's Cloudflare account (O-13)
**Edition:** Offline (account-free) only
**Related:** `docs/OFFLINE_SETUP.md`, `docs/MILESTONE_12_REPORT.md`, D-037 in `docs/DECISIONS.md`

This guide deploys the account-free offline edition as a static site. The online edition is not part of the Etsy release and must not be published from this Pages project.

---

## 1. What is deployed

| Item | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Production branch | `main` |
| Node.js | 22.x (Vite 8 requires `^20.19.0 \|\| >=22.12.0`) |
| Environment variables | `NODE_VERSION=22` only |
| Supabase variables | None. Never add `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` to this project |
| Framework preset | None (static) |

The offline build is selected by the default Vite mode. `npm run build:online` and `npm run dev:online` must not be used for this project. `public/_redirects` and `public/_headers` are copied into `dist` on every build, and the offline bundle scan (`npm run verify:bundle`) rejects account, sync, privileged-key, or third-party runtime content.

## 2. Deployment configuration in this repository

| File | Purpose |
| --- | --- |
| [`public/_redirects`](../public/_redirects) | `/* /index.html 200` SPA fallback. Without it, opening a deep link such as `/settings` returns 404 because routing is client-side. |
| [`public/_headers`](../public/_headers) | Long-lived immutable caching for hashed `/assets/*`; `no-cache` for `index.html`, `sw.js`, and `manifest.webmanifest` so releases and service-worker updates are picked up; `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and `Permissions-Policy`. |
| [`.nvmrc`](../.nvmrc) | Node 22 for local builds and hosting. |

No Content-Security-Policy is set yet. The app uses an inline first-paint theme script, so a CSP needs a nonce or hash and its own verification pass; adding a broken CSP would be worse than omitting it.

## 3. Option A — Git integration (recommended)

1. Confirm the release commit is on GitHub `main` and the working tree is clean.
2. Sign in at <https://dash.cloudflare.com/> and open **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
3. Authorize GitHub if prompted and select this repository.
4. Set the project name, for example `christmas-gift-tracker`. The free address becomes `https://christmas-gift-tracker.pages.dev` unless that name is taken.
5. Set **Production branch** to `main`.
6. Set **Framework preset** to `None`, **Build command** to `npm run build`, and **Build output directory** to `dist`.
7. Under environment variables add `NODE_VERSION` = `22`. Add nothing else.
8. Choose **Save and Deploy** and wait for the first build to finish.

Every later push to `main` redeploys. Preview deployments also build the offline edition, because the default mode is offline and no Supabase variables exist in the project.

## 4. Option B — Direct upload

Use this only if Git integration is not wanted. Rebuild first so `dist` is current:

```bash
npm run build
npm run verify:bundle
npx wrangler login
npx wrangler pages project create christmas-gift-tracker --production-branch main
npx wrangler pages deploy release/Offline-Edition --project-name christmas-gift-tracker
```

`release/Offline-Edition/` is the byte-identical copy of `dist` kept for hosting, and it is git-ignored. Deploying `dist` directly is equivalent. Rebuild and re-verify after every content change; do not deploy a stale copy.

## 5. Custom domain and address

The `*.pages.dev` address is HTTPS and works for the PWA. A custom domain is optional: open the Pages project > **Custom domains** > **Set up a custom domain**. Cloudflare issues the certificate automatically, and the zone must be on Cloudflare or delegated by CNAME.

The customer documents say “the address supplied with your purchase”, so no PDF regeneration is required to publish. Record the final address in:

- the Etsy listing description and purchase/thank-you message;
- `docs/MILESTONE_12_REPORT.md` and the O-13 owner-question rows;
- the release manifest or notes for future versions.

If the address is later added to the customer documents, regenerate the PDFs and rebuild the ZIP (`docs/MILESTONE_12_REPORT.md` section 1.2 records the procedure).

## 6. Post-deployment verification

Run these checks against the published HTTPS address before the Etsy listing goes live.

1. `curl -I https://<address>/settings` returns `200` and `Content-Type: text/html` (SPA fallback works).
2. `curl -I https://<address>/sw.js` returns `200` with `Cache-Control: no-cache`.
3. A hashed file under `/assets/` returns `Cache-Control: public, max-age=31536000, immutable`.
4. In a clean Chrome or Edge profile, the dashboard loads, the footer says **Saved on this device**, and the offline banner appears.
5. Create a season, add a recipient and a gift, reload, and confirm the records persist.
6. Reload once so the service worker controls the page, then enable DevTools **Offline** (or disconnect the network) and open Dashboard, Recipients, Gifts, Shopping List, Seasons, Archives, Settings, and Ideas. All must load.
7. The network log contains no requests to Supabase or any third-party origin.
8. The install prompt or address-bar install icon appears in Chrome or Edge.
9. Restore `release/Sample-Data/Sample-Backup.json` in a scratch profile if a full data-path check is wanted.

Local pre-deployment smoke test used for this configuration: `npm run build`, `npm run verify:bundle`, `npm run preview -- --port 4173`, all routes returned 200, the service worker activated after one reload and precached 15 entries, and the console was clean.

## 7. Guardrails

- Keep this project offline-only. Do not add Supabase variables, do not deploy `dist` from `npm run build:online`, and do not point the project at the online branch.
- The offline edition stays account-free. `npm run verify:bundle` must pass before every deployment.
- HTTPS is required for the service worker and installation. Do not distribute a `file://` copy.
- Never publish a build that has not passed typecheck, lint, tests, and the offline artifact checks.
- Re-run the verification checklist in section 6 after any hosting, dependency, or content change.
- Cloudflare deployment history allows rollback to an earlier production deployment from the dashboard. Roll back rather than editing deployed files by hand.
- The Free plan has no static bandwidth cap, but confirm Cloudflare's current Free plan terms and limits before launch. This guide is not legal advice.

## 8. Costs and limits

The build is about 2 MB total (21 precached entries, 15 cached runtime files), far below Cloudflare Pages file-count and file-size limits. The Free plan is sufficient for a small digital product; no server, database, or paid add-on is needed for the offline edition.

## 9. Current state

| Step | State |
| --- | --- |
| Host selected | Cloudflare Pages (D-037) |
| SPA fallback and headers committed | Yes |
| Offline artifact rebuilt with hosting files | Yes, byte-identical copy verified 2026-11-01 |
| Deployed to Cloudflare | **No — needs the owner's Cloudflare login** |
| Public address recorded | **No** |
| Address added to Etsy listing | **No** |
