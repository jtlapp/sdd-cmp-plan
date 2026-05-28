# proposals-derive
> Deriving per-change disposition, dependencies, reviewer routing, and status tree from the submitted payload (pure logic).

## Test inventory
- cc-only: 4 files, 33 tests
- cc-openspec: 7 files, 36 tests (top-level `it`s; describes excluded)

## cc-only-only scenarios
- Sibling-isolation: an add sibling does NOT make a rename sibling latent — both queued, neither on the other's payload path (proposalsDisposition.test.ts).
- Stacked renames with no add ancestors anywhere → every rename queued; no decision-dep edge inferred from rename ancestry (proposalsDependencies.test.ts).
- Deep no-op/rename chain terminating in a detach → the terminal change is queued (no add ancestor anywhere on path) (proposalsDisposition.test.ts).
- Rename + nested add under the same renamed taxon both route to that taxon's owner (the rename's reviewer is the same as the nested add's reviewer because the renamed taxon is the nested add's payload-parent) (proposalsRouting.test.ts).
- "Proposer is not auto-reviewer of her own proposal" — the proposer's queue stays empty for changes routed by §10.1 (proposalsRouting.test.ts).
- Graft preserves ownership end-to-end: under a graft, a nested add-create that is LATENT does not appear in the grafted-taxon-owner's queue at submission (queue-side observation of the latent/reviewer split) (proposalsRouting.test.ts).
- Status-tree round-trip: `findStatusByChangeId` resolves every emitted changeId back to the same node in the served payload (proposalsDependencies.test.ts A.1).
- Status-tree unknown-key dropping: extra keys on payload nodes (`bonus`, `extra`) do not appear on derived status nodes (proposalsStatusView.test.ts).
- Queue-vs-status invariant cross-check: every change with disposition=queued appears in exactly one reviewer's `/queue` and every latent change appears in none (proposalsDisposition.test.ts).

## cc-openspec-only scenarios
- decisionDeps list semantics — empty for no-add-ancestor; single-element for one add ancestor; multi-element top-down ordered for stacked add ancestors; only `add` ancestors counted (no-op ancestors excluded) (derive-deps.test.ts).
- existenceDeps shape and content — own implicit edge for rename and detach; no own edge for add-create; `parent: null` global-existence edge for add-graft; `parent: { kind: "top" }` for the top taxon; `parent: { kind: "live", taxonId }` for live ancestors (derive-deps.test.ts).
- Disposition independence from existenceDeps — a change with non-trivial existence deps but no decision deps is still queued (derive-disposition.test.ts).
- "Deferred ⇒ latent" invariant explicitly asserted across the change set (derive-disposition.test.ts).
- Deferred reviewer shape: `{ kind: "deferred", parentChangeId }` and the reference is to the IMMEDIATE create parent, not transitive (derive-routing.test.ts).
- Graft nested under add-create gets deferred reviewer (the graft's payload-parent is a not-yet-created taxon) (derive-routing.test.ts).
- Nested under add-graft routes CONCRETELY to the grafted taxon's owner while still being latent — concrete-latent is a real combined state (derive-routing.test.ts; derive-status-tree.test.ts).
- Concrete reviewer preserves the registry's original casing (derive-routing.test.ts).
- Sequencer injection: `mintChangeId` is called verbatim — injected IDs flow through the derived changes in order (derive-sequencer.test.ts).
- DFS pre-order assignment of changeIds across multi-child payloads (derive-single-change.test.ts).
- Purity: `derive.ts` source contains no imports from store/handlers/HTTP layers (derive-sequencer.test.ts).
- Each emitted change carries `proposalId` and `targetRootId` fields (derive-single-change.test.ts).
- `taxonRef` discriminator distinguishes add-create (`{ kind: "to-create", name }`) from add-graft (`{ kind: "existing", id }`) from rename/detach (`{ kind: "existing", id }`) (derive-single-change.test.ts; derive-appendix-a.test.ts).
- Add-graft status node has `id` but no `name`; add-create status node has `id: null` and `name` set (derive-status-tree.test.ts).
- Detach status node has no `children` property at all (vs. children being optional/undefined) (derive-status-tree.test.ts).
- Status-tree reviewer slot is a username string (not an object) on queued nodes and `null` on latent/structural nodes (derive-status-tree.test.ts).
- Appendix A.2 P2 graft+nested case asserted at the derivation layer (derive-appendix-a.test.ts); cc-only has A.2 at the integration/HTTP layer only.

## Divergent expectations
- Op enum on emitted changes: cc-openspec emits distinct `add-create` and `add-graft` ops (the payload-level `op: "add"` is split during derive). cc-only keeps a single `add` op on the emitted change/status node and discriminates via presence of `name` vs. `id`. Same underlying concept; affects assertions throughout (derive-single-change.test.ts; proposalsRouting.test.ts queue entries with `op: "add"`).
- Reviewer representation on emitted change records: cc-openspec uses a tagged union `{ kind: "concrete" | "deferred", username | parentChangeId }`. cc-only does not assert a reviewer field on the change directly — reviewer is observed only via which user's `/queue` the change lands in (and via `reviewer` username on the status node). Same routing outcome; different surfaced shape.
- Concrete-latent state: cc-openspec explicitly asserts that a change can be simultaneously concrete-reviewer AND disposition=latent (nested-under-graft with grafted taxon owned by a third party — Erin in A.2). cc-only asserts the latent change is absent from any queue (including the would-be concrete reviewer's), but does NOT assert that the reviewer identity is already determined at submission. Both consistent with the PRD but cc-openspec pins it; cc-only leaves it implicit.
- Status-tree reviewer field on latent nodes: cc-openspec asserts `reviewer: null` on the served status node even when the change has a concrete reviewer under the hood. cc-only does not pin a `reviewer` field on the served status payload at all. (Non-material disposition-wise, but materially divergent on the served status-tree shape.)
- Disposition enum on no-op nodes: both projects use the literal `"structural"`. Both also recognize the same five real states (`latent`, `queued`, `accepted`, `rejected`, `invalid`) — cc-only asserts the full enum, cc-openspec asserts only the Phase-5-reachable subset.

## Shared coverage
- Appendix A.1 worked example: four changes emitted with the spec's initial dispositions — rename(c1) queued, rename(c3) queued, Urban-Fantasy add queued, Paranormal-Romance add latent (proposalsDependencies.test.ts; derive-appendix-a.test.ts).
- Decision-dependency rule: a change with any add (create or graft) ancestor on its payload path is latent; one add-ancestor suffices, multiple ancestors keep it latent (proposalsDependencies.test.ts; proposalsDisposition.test.ts; derive-disposition.test.ts; derive-deps.test.ts).
- Existence-dependency-only ancestors (rename, no-op) do NOT make a descendant latent — the descendant queues at submission (proposalsDependencies.test.ts; derive-disposition.test.ts).
- Rename nested under an add-create is latent (path-based, not target-based — the rename's target exists, but its payload path has an add ancestor) (proposalsDependencies.test.ts; covered by general decision-dep rule in derive-disposition.test.ts).
- Detach nested under an add-graft is latent (proposalsDependencies.test.ts; covered by derive-disposition.test.ts).
- Detach nested under a no-op anchor → queued (proposalsDependencies.test.ts; covered indirectly via derive-disposition.test.ts existence-deps-only case).
- Per-op routing (concrete reviewer assignment): rename → renamed taxon's owner; detach → payload-parent's owner; add-create → payload-parent's owner; add-graft → payload-parent's owner (NOT the grafted taxon's owner) (proposalsRouting.test.ts; derive-routing.test.ts).
- no-op produces no change (zero changes emitted from a no-op-only payload; no-op nodes carry no changeId) (proposalsRouting.test.ts; proposalsDisposition.test.ts; derive-single-change.test.ts; derive-status-tree.test.ts).
- Status-tree shape is isomorphic to the submitted payload (node count, parent/child nesting preserved) (proposalsStatusView.test.ts; derive-status-tree.test.ts).
- Every operative status node carries a changeId; every no-op node has none and carries disposition=`structural` (proposalsStatusView.test.ts; proposalsDisposition.test.ts; derive-status-tree.test.ts).
- No `reason` field on any status node in Phase 5 (no rejection/invalidation paths exercised) (proposalsStatusView.test.ts; derive-status-tree.test.ts).
- Top no-op anchor is structural and has no changeId (proposalsDependencies.test.ts; derive-single-change.test.ts).
- Graft preserves ownership for nested ops: a create nested under add-graft routes to the grafted taxon's owner, not the outer payload-parent's owner (proposalsRouting.test.ts; derive-routing.test.ts; derive-appendix-a.test.ts A.2 P2).
