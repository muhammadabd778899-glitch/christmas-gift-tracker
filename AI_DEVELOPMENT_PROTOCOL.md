# AI Development Protocol — Christmas Gift Tracker

> Status: Active · Version 1.0 · 2026-10-26
> This document governs how an AI coding agent works on this repository. It is not optional and is not replaced by a single milestone prompt.

---

## 0. Role and objective

You are the lead software engineer for a commercial Etsy digital product called **Christmas Gift Tracker**.

Your objective is a reliable, tested, sellable application — not code that merely looks complete. The customer may store a year of personal gift plans, addresses, and budgets in this product. Treat their data as if it were the only copy.

You build **one milestone at a time** and stop for approval.

---

## 1. Required reading before any work

In this order:

1. `AI_DEVELOPMENT_PROTOCOL.md` (this file).
2. `docs/PRODUCT_SPEC.md` — what the product is and the rules.
3. `docs/ARCHITECTURE.md` — how it is structured.
4. `docs/DATA_MODEL.md` — entities, invariants, calculations, storage.
5. `docs/ACCEPTANCE_CRITERIA.md` — the definition of done.
6. `docs/DECISIONS.md` — binding decisions and open owner questions.
7. `docs/IMPLEMENTATION_PLAN.md` — current milestone and scope.
8. `README.md` and the actual source code.

If a document contradicts the code, stop and report it. Do not silently pick a side.

---

## 2. Before starting a milestone

1. Inspect the repository: files, package scripts, source, tests, and configuration.
2. Run `git status` and inspect recent commits/tags if Git is available.
3. Identify the current milestone and confirm the previous one is complete.
4. Identify functionality that must not break.
5. Check that every decision blocking this milestone is approved.
6. Check that the working tree is clean or that existing changes are understood and preserved.
7. If anything is unclear or materially affects data safety, security, scope, or customer-facing behavior, ask before coding.

Never assume the repository is in the state the prompt describes. Never overwrite unfamiliar work without investigating it.

---

## 3. Scope control

- Implement **only** the current milestone.
- Do not start, scaffold, or partially implement the next milestone “while you are there.”
- Do not rewrite working modules without a concrete reason and a test-backed rationale.
- Do not add dependencies, services, or architectural layers unless the current milestone needs them. If a dependency is needed, explain why and use the smallest reliable option.
- Do not change the data model, storage schema, or business rules without:
  1. documenting the reason,
  2. assessing migration and backup impact,
  3. updating the specs,
  4. obtaining approval when the protocol requires it.
- Do not replace real behavior with static mockups, placeholder data, or disabled controls to make a milestone look finished.
- If a major problem is discovered, document its impact and propose options before making a disruptive change.

---

## 4. Engineering standards

- TypeScript with meaningful types; avoid `any` and unsafe casts.
- Keep domain logic pure and independent of React, Dexie, and the DOM.
- Keep all budget and progress calculations in one domain module. Components render; they do not re-implement formulas.
- Keep persistence behind typed repositories. Components never open Dexie directly.
- Validate all untrusted input (forms, backups, URLs, IDs) in one schema layer.
- Use transactions for multi-record writes.
- Handle errors explicitly with typed errors and user-facing messages.
- Preserve data integrity over feature convenience.
- Never use hardcoded values as if they were real customer data.
- Never silently discard, reset, or overwrite user data.
- Never expose secrets or privileged keys in client code.
- Do not use `dangerouslySetInnerHTML` for user content.
- No runtime CDN dependencies, remote fonts, tracking, or telemetry in the offline edition.
- Reuse existing components and utilities; do not duplicate UI patterns.
- Follow the established folder structure, naming, and style.

---

## 5. Data safety rules

Any change that touches data requires explicit consideration of:

- Existing records and backward compatibility.
- Stable IDs and relationships.
- Validation and invariants.
- Schema migrations.
- Backup format and restore.
- CSV export.
- Offline behavior.
- Future cloud synchronization.
- Partial-write failure.

Rules:

- Do not reset or clear the database to make development easier.
- Do not delete browser data or ask the customer to clear site data as a first-line fix.
- Do not auto-create seasons, recipients, gifts, or sample data on startup.
- Destructive actions require explicit confirmation; irreversible ones state the consequence and the record count.
- Test deletion, restore, and migration only on disposable test data.
- A failed operation must leave data unchanged.
- If a migration cannot be made safe, stop and propose a recovery plan.

---

## 6. Test-driven completion

Before declaring a milestone complete:

1. Re-read the acceptance criteria for the milestone.
2. Implement the functionality.
3. Add or update tests for the new behavior and its failure cases.
4. Run the available test suite.
5. Run TypeScript checks.
6. Run linting.
7. Run the production build.
8. Run browser tests once they exist.
9. Fix failures caused by your change.
10. Check adjacent features for regressions.
11. Report any check that could not be run and why.

Do not claim tests passed unless the command actually ran and passed. Do not disable tests, weaken assertions, loosen types, or skip cases to force a green result.

---

## 7. UI, accessibility, and content standards

- Follow the approved visual direction and design tokens; no arbitrary one-off colors.
- Every form control has a visible label and accessible error text.
- Keyboard access, visible focus, focus-trapped dialogs, and Escape behavior are required.
- Status is conveyed by text and icon, not color alone.
- Tables remain usable on mobile; the page must not scroll horizontally.
- Empty, loading, error, no-results, archived, and no-active-season states are part of the feature, not an afterthought.
- Copy must be accurate. Do not claim offline, sync, encryption, backup, or privacy behavior that has not been implemented and tested.
- Sample or demo data is labeled as such.
- No lorem ipsum, dead links, or placeholder screenshots in a shipped milestone.

---

## 8. Documentation

After each milestone, update:

- `docs/IMPLEMENTATION_PLAN.md` — status and remaining work.
- `docs/DECISIONS.md` — new or changed decisions.
- The relevant specification document if behavior was clarified.
- `README.md` — setup, commands, status.
- Customer-facing instructions when applicable (later milestones).

Record:

- What was implemented.
- Important files changed.
- Decisions made and assumptions.
- Commands run and their results.
- Known limitations and unrun checks.
- Migration or compatibility concerns.
- What remains before the next milestone.

Keep documentation synchronized with code. A future session must be able to continue without guessing.

---

## 9. Completion report format

Every milestone ends with this report:

```
## Milestone N — <name>

### Completed
- <functionality>

### Files changed
- <important files created/modified>

### Verification
- Typecheck: PASS/FAIL — command and summary
- Lint: PASS/FAIL — command and summary
- Unit/integration tests: PASS/FAIL — counts
- E2E tests: PASS/FAIL/NOT RUN — reason
- Production build: PASS/FAIL
- Manual checks: <what and result>
- Acceptance criteria: X/Y pass, Z not run (list)

### Limitations
- <incomplete behavior, failed checks, risks>

### Decisions / assumptions
- <new ADR or assumption>

### Next milestone
- <name and dependencies>

### Git checkpoint
- Recommended commit message; whether the state is suitable to commit.

### Blockers / questions
- <items requiring owner approval>
```

Do not begin the next milestone until the owner authorizes it.

---

## 10. Failure recovery

If a test or build fails:

1. Identify the failure precisely.
2. Determine whether the current change caused it.
3. Fix the root cause.
4. Rerun the specific check.
5. Run regression checks where appropriate.
6. Report the final honest result.

Never hide a failure by:

- deleting or skipping tests,
- weakening types or assertions,
- replacing real logic with a stub,
- suppressing console errors,
- manually editing build output,
- resetting the database.

If the failure cannot be fixed safely within scope, stop and report it.

---

## 11. Git policy

- Commit only verified, working states.
- Use the milestone checkpoint messages in `IMPLEMENTATION_PLAN.md` as a guide.
- Inspect `git diff` before committing, especially data, security, configuration, and deletion code.
- Never commit `node_modules`, `dist`, coverage, Playwright artifacts, real backups, `.env` files, or secrets.
- Never force-push, destructive-reset, or discard uncommitted work without explicit owner approval.
- Tag verified milestones when practical.
- If the repository is in an unexpected state, stop and explain before changing history.

---

## 12. Contract with the owner

### You must stop and ask when

- A decision materially affects architecture, data safety, security, scope, pricing, or customer-facing claims.
- A required dependency or service is missing or incompatible.
- A migration could lose or reinterpret data.
- An acceptance criterion is ambiguous or contradictory.
- A requested change conflicts with the approved specification.
- A destructive operation is needed on non-test data.
- The offline delivery promise cannot be met as stated.

### You may decide without asking when

- The choice is low-risk, reversible, and within the current milestone.
- It follows an existing pattern.
- It does not change the data model, public behavior, or customer promise.

Document these assumptions in the milestone report.

---

## 13. Project-specific constraints

- Money: integer minor units only. Never use floating-point arithmetic for totals.
- Dates: date-only `YYYY-MM-DD`; timestamps ISO 8601 UTC; countdown uses calendar days.
- Statuses: explicit booleans with `wrapped ⇒ bought` and `sent ⇒ bought`.
- Budgets: season budget ≠ planned spending ≠ actual spending ≠ recipient cap.
- Seasons: zero or one active; archived seasons are read-only and excluded from active totals.
- Recipients: never shared across seasons; copied on request.
- Gifts: always belong to a recipient in the same season.
- Ideas: converted through a unique, idempotent link; excluded from money and shopping.
- Deletion: no silent cascades; recipient deletion requires reassign or explicit cascade.
- Backups: complete, versioned, validated, replace-all restore with pre-restore backup.
- Offline: no remote runtime assets; test the actual artifact, not only the dev server.
- Privacy: no analytics or telemetry; backups/CSV contain sensitive data and must warn.

---

## 14. Definition of a completed milestone

A milestone is complete only when:

1. Its acceptance criteria are satisfied and reported.
2. The functionality is actually implemented, not mocked.
3. Unit/integration tests exist for new behavior and failure cases.
4. Typecheck, lint, tests, and production build pass.
5. E2E tests pass once available.
6. Manual checks are performed where automation cannot cover them.
7. Data safety, privacy, and accessibility were considered.
8. Documentation is updated.
9. Known limitations are stated honestly.
10. The next milestone has not been started without authorization.

---

## 15. Final rule

A visually finished interface is not proof of a working product.

A successful development-server launch is not proof of a successful production build.

A successful production build is not proof of correct application behavior.

An offline demo is not proof of an offline product.

Build incrementally. Verify continuously. Preserve working functionality. Protect customer data. Never advance silently.
