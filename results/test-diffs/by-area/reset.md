# reset
> POST /reset restoring fresh-boot state across all domains.

## Test inventory
- cc-only: 6 files, ~18 reset-relevant tests (1 dedicated `proposalsReset.test.ts` + reset coverage scattered across `app.test.ts`, `registry.test.ts`, `usersIntegration.test.ts`, `phase4Integration.test.ts`, `phase7Integration.test.ts`)
- cc-openspec: 5 files, 31 tests (areas.json scope); plus 2 additional reset-composition files (`integration/phase-6-reset.test.ts`, `integration/phase-7-reset.test.ts`) categorized under "integration"

## cc-only-only scenarios
- Reset invokes every registered reset callback (verifies the central seam wires user-supplied callbacks through) — `app.test.ts`
- §4-exempt for an actually malformed `X-Username` header (NBSP-prefixed, survives HTTP OWS stripping) — `usersIntegration.test.ts`, `proposalsReset.test.ts`
- Post-reset, a prior `X-Username` value is rejected with 403 on a registered-gate endpoint (state-as-observable-from-outside check) — `registry.test.ts`, `usersIntegration.test.ts`
- Reset clears phase-7-specific lifecycle state (accepted cascade graft, case-3 invalid queued change, case-2 auto-dismissed) all in one composition — `phase7Integration.test.ts`

## cc-openspec-only scenarios
- Reset on a fresh (never-used) server returns 204 with an empty body — `reset/reset.test.ts`
- Whitespace-only `X-Username` accepted as caller (NOT 400) — `reset/reset.test.ts`
- Trailing-whitespace `X-Username` accepted — `reset/reset.test.ts`
- Wrong method on `/reset` (GET) returns 404/405 with the standard error envelope — `reset/reset.test.ts`
- Store-level unit tests that reset clears each internal proposal-store collection independently: `proposals` map, `changes` map, `changesByProposal` index, `queueByUser` index — `proposals/store-reset.test.ts`
- Store-level unit test that `reset()` is idempotent at the store layer (multiple consecutive calls leave mintable counters at base) — `proposals/store-reset.test.ts`
- Taxa ID counter restart verified directly via `seed().ids === ["t1"]` after reset — `reset/taxa-reset.test.ts`
- Reset clears the case-key map specifically so identical-case re-registration succeeds (separate test from list-emptied) — `reset/users-reset.test.ts`
- Reset after successful accept-cascade returns to fresh-boot — `integration/phase-7-reset.test.ts`
- Reset after rolled-back (409) cascade returns to fresh-boot — `integration/phase-7-reset.test.ts`
- Reset after case-1 cascade reject returns to fresh-boot — `integration/phase-7-reset.test.ts`
- Reset after explicit dismiss returns to fresh-boot — `integration/phase-7-reset.test.ts`
- Phase-6 omnibus: reset after accept/reject/failed-accept restores both proposal-store and taxa-store — `integration/phase-6-reset.test.ts`

## Divergent expectations
- None observed. Both projects agree on materially identical post-reset state:
  - Reset is callable without `X-Username` (null caller) and with unregistered/malformed values — confirmed in both.
  - Domains cleared: users registry (and case-key map), taxa store + edges/trees, proposals collection, change collection, per-user queues, ID counters (taxon `t1`, proposal `p1`, change `c1`).
  - Post-reset shape is empty (not default-populated) across `/users`, `/taxa`, `/trees`, `/proposals`, `/queue`.
  - Status code 204 with empty body.

## Shared coverage
- Reset clears the user registry; list returns to `{ users: [] }` — cc-only `registry.test.ts`, `usersIntegration.test.ts`, `phase4Integration.test.ts`, `phase7Integration.test.ts`; cc-openspec `reset/users-reset.test.ts`, `proposals/reset-integration.test.ts`, `reset/taxa-reset.test.ts`
- Reset clears the taxa store (`/taxa` and `/trees` empty) — cc-only `phase4Integration.test.ts`, `phase7Integration.test.ts`; cc-openspec `reset/taxa-reset.test.ts`, `proposals/reset-integration.test.ts`
- Reset clears the proposals registry (`/proposals` returns `{ proposals: [] }`) — cc-only `proposalsReset.test.ts`, `phase7Integration.test.ts`; cc-openspec `proposals/reset-integration.test.ts`, `proposals/store-reset.test.ts`
- Reset clears every reviewer's queue (`/queue` returns empty after re-registering) — cc-only `proposalsReset.test.ts`; cc-openspec `proposals/reset-integration.test.ts`, `proposals/store-reset.test.ts`
- Reset restarts ID counters (taxon `t1`, proposal `p1`, change `c1`) — cc-only `proposalsReset.test.ts`, `phase4Integration.test.ts`, `phase7Integration.test.ts`; cc-openspec `reset/taxa-reset.test.ts`, `proposals/store-reset.test.ts`, `proposals/reset-integration.test.ts`
- Reset is §4-exempt for null caller (no `X-Username`) — cc-only `app.test.ts`, `proposalsReset.test.ts`, `usersIntegration.test.ts`; cc-openspec `reset/reset.test.ts`, `reset/taxa-reset.test.ts`
- Reset is §4-exempt for empty `X-Username` — cc-only `app.test.ts`, `usersIntegration.test.ts`; cc-openspec `reset/reset.test.ts`
- Reset is §4-exempt for unregistered well-formed `X-Username` (204, NOT 403) — cc-only `app.test.ts`, `usersIntegration.test.ts`; cc-openspec `reset/reset.test.ts`, `reset/taxa-reset.test.ts`
- Reset is idempotent (two consecutive POSTs both 204) — cc-only `app.test.ts`; cc-openspec `reset/reset.test.ts`, `proposals/store-reset.test.ts`
- Returns 204 with empty body — cc-only `app.test.ts`; cc-openspec `reset/reset.test.ts`
- After reset the subsystem is fully re-usable end-to-end (re-register, re-seed, submit fresh proposal) — cc-only `proposalsReset.test.ts`, `phase4Integration.test.ts`, `phase7Integration.test.ts`; cc-openspec `proposals/reset-integration.test.ts`, `integration/phase-7-reset.test.ts`
- Re-register identical-case after reset succeeds (case-key map cleared) — cc-only `registry.test.ts`; cc-openspec `reset/users-reset.test.ts`
