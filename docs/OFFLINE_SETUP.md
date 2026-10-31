# Offline Setup Guide

Christmas Gift Tracker is an installable web app that keeps your planner on your own device. You need an internet connection **once** to load and save the app. After that, it opens and works without a network.

Your seasons, recipients, gifts, ideas, budgets, and notes are stored in your browser. Nothing is uploaded, and there is no account.

---

## Before you start

- Use a current version of Chrome or Edge. Microsoft Edge 156 on Windows is the configuration verified for release 1.0.0. Firefox on a computer works in a tab after the first online visit but does not offer installation. Safari on iPhone/iPad installation steps are included but Safari behavior was not verified for this release.
- Use a normal browser window. Private/incognito windows may discard your data when they close.
- Use the same browser and device each time. Data does not move between browsers or devices unless you export a backup and restore it.
- If you use Firefox on a computer, the app still works offline but Firefox does not offer an app-style install. Keep a bookmark instead.

---

## 1. Visit the app once while online

1. Open the hosted Christmas Gift Tracker link in your browser.
2. Wait for the page to finish loading. The footer shows **“Saved on this device”** when you are online.
3. Optional: after a few seconds, a small banner may say **“Ready to work offline.”** This means the app has saved what it needs. You can dismiss it with **Got it**.

You do not need to create a season to complete this step, but creating one is a good way to check that saving works.

---

## 2. Install the app (recommended)

Installing is optional. It gives the planner its own window and a home-screen icon. Offline use works after the online visit even if you do not install.

### Chrome or Edge on a computer

- Click the install icon in the address bar, **or**
- open the browser menu and choose **Install this site as an app** / **Install Christmas Gift Tracker**.

### Android

- Open the browser menu and choose **Install app** or **Add to Home screen**.

### iPhone or iPad (Safari)

- Tap **Share**, then **Add to Home Screen**.

### Firefox on a computer

- No app install is offered. Bookmark the page and open it normally; offline use still works after the first online visit.

Settings also contains these steps under **Install and work offline**, along with an **Install app** button when the browser offers one.

---

## 3. Use it offline

1. After the online visit, disconnect from the internet or turn on airplane mode.
2. Open the app from its icon, home screen, or bookmark.
3. The footer changes to **“Offline — all data saved on this device.”**
4. Everything that matters keeps working: seasons, recipients, gifts, the dashboard, Idea Bank, Shopping List, search and filters, archives, backups, and CSV exports.

Some external purchase links need a connection. Tapping one offline may show the browser’s “no connection” page; the planner itself stays open and your data is unaffected.

---

## Sample season (optional)

The download includes `Sample-Data/Sample-Backup.json`, an optional example with one sample season, two recipients, three gifts, and two ideas. Restore it from **Seasons & archives → Backup and restore**. Restoring replaces the current data, so download a backup first if you already have records. The sample season is flagged and can be removed later without touching real records. The app does not create the sample automatically.

---

## 4. Protect your data

Your planner lives in this browser’s storage. It is not in the cloud.

- **Download a backup** from **Seasons & archives → Backup and restore** before clearing browser data, changing devices, or doing major cleanup. The backup is a JSON file you keep.
- **Ask the browser to keep your data.** In **Settings → Storage health**, choose **Request persistent storage**. The app reports whether the browser granted, declined, or does not support the request.
  - **Granted:** the browser should keep the data even when disk space is low.
  - **Declined or unsupported:** the app still works, but the browser may remove data under storage pressure. Keep backups.
- **Clearing site data deletes the planner.** The app warns about this; no code path clears your records automatically.

A backup is the only recovery copy if a browser profile is reset, site data is cleared, or you move to another device.

---

## 5. Updates

When a new version is saved, a banner says **“A new version is ready.”** You choose when to reload:

- **Reload to update** applies the new version.
- **Later** dismisses the banner for now.

If a form or dialog is open, the reload is refused with a reminder to close it first, so unsaved work is not discarded. The app never reloads itself while you are working.

---

## 6. Troubleshooting

**The app does not open offline.**
Visit the hosted link once more while online, wait for it to finish loading, and try again. Private/incognito windows are not reliable for offline use.

**A storage or quota message appears.**
Your data has not been deleted. Download a backup first, then free some browser or disk space and reload. The message repeats the safe steps.

**My data is missing after switching browsers or devices.**
Data is per browser profile. Open the app in the original browser, or restore a JSON backup from **Seasons & archives**.

**The install option is missing.**
Some browsers do not offer installation. You can still use the planner offline after one online visit; bookmark it instead.

---

## 7. What this edition does not do

- No account, cloud backup, or cross-device sync.
- No promise that data survives clearing browser data, private browsing, or every storage cleanup.
- No standalone HTML download is offered; the installable hosted app is the offline edition.

---

## 8. Verification status

Release 1.0.0 was tested from the validated production artifact in **Microsoft Edge 156 (Chromium) on Windows** with the network disabled: offline launch and reload, all seven sections, creating and editing records, browser restart, backups, CSV downloads, and the update flow. The release run also confirmed service-worker control, 15 cached entries, zero console or page errors, zero failed or foreign-origin requests, the shipped sample backup restored into a clean profile, and a 250-recipient / 1,000-gift / 300-idea restore through the UI.

Firefox, Safari, iOS/iPadOS, and Android were not available on the test machine, so their install flows and storage behavior are documented from browser guidance rather than verified here. Keep backups, especially on iPhone and iPad, where Safari may remove data from unused sites.

For the full technical evidence and limitations, see `docs/MILESTONE_12_REPORT.md` and `docs/MILESTONE_10_REPORT.md`.
