# changes-lifecycle
> Single-review actions (accept/reject/dismiss), promotion, cascade application & journaling, invalidation (eager + lazy), deletion planning.

## Test inventory
- cc-only: 11 files, 75 tests
- cc-openspec: 11 files, 163 tests (counts include `describe` block names)

## cc-only-only scenarios

### Lazy vs eager invalidation
- HTTP-level lazy-seam assertion: unrelated writes do NOT eagerly transition a queued change; only a /queue read or review-action entry triggers re-evaluation (`invalidationLazy.test.ts`). cc-openspec tests the walk function in isolation but has no end-to-end test asserting the absence of eager transitions on unrelated writes.
- Lazy detection on review-action entry: a NON-targeted queued change is marked invalid when the actor acts on a DIFFERENT change (`invalidationLazy.test.ts`).
- Idempotence: two successive GET /queue with no intervening writes return the same response (`invalidationLazy.test.ts`).

### Deletion planning (§6.3)
- Whole `planDeletion` algorithm tested at unit level in cc-only: lone-root region, wholly-U-owned subtree, halt at other-owned child, stranded U-owned descendant beneath halt is excluded (`deletion.test.ts`).
- Precondition 1 (`shared_in_region`): region taxon shared, descendant shared into another tree, halt-frontier taxon may itself be shared without tripping precondition (`deletion.test.ts`).
- Precondition 2 (`parent_not_owned`): foreign-owned parent halts, U-owned parent passes (`deletion.test.ts`).
- cc-openspec has no dedicated changes-lifecycle deletion test; deletion lives entirely in the taxa area (test/taxa/delete-taxon.test.ts).

### Dismiss outcome differentiation
- Distinct error-tags on dismiss across disposition states: `change_not_invalid` (queued/accepted/rejected) vs `change_not_in_queue` (case-1 latent, case-2 already auto-dismissed) (`dismiss.test.ts`).
- Idempotency-not-state: second dismiss → 409 `change_not_in_queue` after a successful dismiss (`dismiss.test.ts`).

### Cascade behavior
- §12.2 non-equivalence test: a change that validates standalone but rolls back when an earlier cascade step sets up the clash (`cascadeRollback.test.ts`).
- Cascade halts at other-owner boundary; bounded change stays queued for that other owner (`cascadeHappy.test.ts`).
- Self-routed cascade where reviewer is also the proposer (`cascadeHappy.test.ts`).

## cc-openspec-only scenarios

### Cascade journal as a unit
- `CascadeJournal` exposed and tested directly: rollback restores reason field, first-touch only / second journal is no-op, empty rollback no-op, byte-identical state across multi-mutation sequence (`cascade-journal.test.ts`).
- Per-store rollback: queue insert/remove, taxa-store edge add/remove, taxon insert, taxon rename (`cascade-journal.test.ts`). cc-only only black-box-tests rollback through cascade endpoints.

### case1Cascade isolated
- `runCase1Cascade` tested as a unit: op-restricted at top (rename/detach do not cascade), scoped to M's proposal only, uses `listChangesForProposal` (not live state), short-circuits on terminal descendants, recursion does not re-mark already-cascaded, does not transition M itself (`case1-cascade.test.ts`).

### runSideEffectWalk isolated
- Walk-function-level invariants: skips `recentlyTransitioned` set, walks across proposals, skips changes whose disposition is not queued, case-insensitive actor-reviewer match for case-2, "does not enter withWriteLock" source-level assertion (`invalidation-walk.test.ts`).
- Mode flag (`direct` vs `review-accept`) is explicit input; cc-only encodes the same distinction implicitly through HTTP entry points.

### Accept preconditions isolated
- `runAcceptPreconditions` tested per-op (rename/add-graft/add-create/detach): `taxon-not-found`, `edge-already-present`, `edge-not-found`, defensive bad-name-format, payload-parent resolution via store helper (`preconditions.test.ts`). cc-only folds these into integration validation tests.

### `applyAcceptedChange` unit
- Pure applier tested per-op for success and violation-without-mutation (`apply.test.ts`); cc-only has no equivalent pure-applier unit.

### Reject body validation
- Body schema: no body / empty {} / string reason / empty-string reason / extra fields ignored / non-string reason → 400 / array body → 400 / non-JSON → 400 (`reject-handler.test.ts`). cc-only does not exercise reject body parsing.

### Route mount
- Route-mount smoke tests for /accept and /reject (`route-mount.test.ts`); cc-only has none.

### Dismiss lock discipline (architectural)
- Source-level assertion: dismiss handler does not import invariant-engine, invalidation walk, or case1-cascade (`dismiss-handler.test.ts`).

## Divergent expectations

### Case 2 (failed accept) — MATERIAL
- On a failed accept due to in-tree name clash (failed accept on the change you yourself are accepting):
  - cc-only: change becomes `invalid` AND is auto-dismissed (removed from queue); subsequent dismiss returns `change_not_in_queue`; reason matches `/self-invalidated by your accept/` (`invalidation.test.ts` §11.4 case 2 "failed accept auto-dismisses the change itself").
  - cc-openspec: change becomes `invalid` BUT STAYS in queue; retry returns `change-not-queued`; the auto-dismiss-on-actor-match (case-2) only fires for OTHER changes the reviewer broke, not the change being accepted itself (`accept-handler.test.ts` "invariant violation … change invalid in queue" + "retry on invalid change still refuses with change-not-queued").
- This is a real §11.4-classification divergence: cc-only treats failed-self-accept as case 2; cc-openspec treats failed-self-accept as case 3 and reserves case 2 strictly for sibling/other changes the reviewer's successful action broke.

### Dismiss precondition error tagging — MATERIAL (shape)
- cc-only distinguishes `change_not_invalid` (disposition is queued/accepted/rejected) from `change_not_in_queue` (already exited queue: case-1 latent, case-2 dismissed); includes the disposition state in details (`dismiss.test.ts`).
- cc-openspec collapses every non-dismissible disposition (queued, accepted, rejected) into a single tag `change-not-dismissible` (`dismiss-handler.test.ts`).
- Distinct shapes — not just wording — because the cc-only tests assert on the discriminator. Affects what a client can branch on.

### Cascade response shape
- cc-only cascade tests assert post-state via /queue and status views (no specific cascade-result envelope asserted) (`cascadeHappy.test.ts`).
- cc-openspec asserts cascade response contains the proposal status tree with cascade-applied dispositions (`cascade-handler.test.ts` "returns the proposal status tree with cascade-applied dispositions"). Minor envelope divergence.

### Case 2 via cascade reason text
- cc-only asserts reason matches `/accept-cascade rooted at/` for siblings broken by a successful cascade (`invalidation.test.ts`).
- cc-openspec does not assert reason text shape for cascade-induced case-2 (covered only at walk-unit level). Wording-only — non-material.

## Shared coverage

### Accept (happy path)
- Rename success → live taxon renamed, change accepted, dequeued.
- Add-create success → new taxon owned by ACCEPTING reviewer (not proposer), edge added.
- Add-graft success → edge added; grafted taxon keeps original owner (§9.3).
- Detach success → edge removed, child survives.

### Accept (failure)
- Failed accept does not mutate live graph (no zombie taxon for failed add-create).
- Precondition failure (target deleted) → 409.
- Auth/reviewer gates: null caller → 403, unregistered → 403, non-reviewer → 403, unknown change → 404.
- Non-queued (latent or already-resolved) → 409 not-queued.

### Reject
- Rename: only the one change transitions; no cascade to descendants (decision-#1 keystone).
- Add-create reject cascades to direct AND transitive latent descendants → all `invalid`, reason cites outer.
- Add-graft reject cascades to descendants.
- Cascaded-invalid descendants do NOT enter the queue.
- Live graph untouched on reject.
- Detach reject → moot for propagation, siblings untouched.

### Dismiss
- Happy path on case-3 invalid-in-queue → 200, removed from queue, disposition stays `invalid`.
- Cannot dismiss queued / accepted / rejected changes.
- Auth gates (403 / 404) cover same surface.

### Promotion (Appendix A.1)
- Add-create accept promotes direct latent dependents to accepter's queue (one level only; grandchildren stay latent).
- Nested rename under create routes to renamed-taxon's owner, not accepter.
- Nested add/detach under graft routes to grafted-taxon's owner (§9.3).
- Existence-dep failure at promotion → dependent goes `invalid`.
- Rename/detach accepts do not promote.

### Cascade
- Cascade extends through ownership-transfer chain rooted at queued rename or add-create (Appendix A.1).
- Cascade rolls back atomically on mid-cascade failure: in-tree name clash, cross-tree name clash, cycle (graft of ancestor), in-tree duplicate (diamond).
- Single-change cascade behaves like single-accept.
- Cascade halts at boundaries routed to other reviewers.

### Invalidation (§11.4)
- Case 1: rejecting/invalidating an add chains down latent descendants (A1→A2→A3).
- Case 2: a successful accept that breaks the actor's OWN sibling queued change auto-dismisses the sibling.
- Case 3: direct write by another user that breaks a queued change → marked `invalid` but kept in queue; covers direct rename, direct detach (Appendix A.2 tail), and another reviewer's accept on a different proposal.
