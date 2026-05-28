# integration
> Phase-specific cross-cutting integration scenarios — multi-owner trees, failed accepts, reset behavior, status views, lazy evaluation properties.

## Test inventory
- cc-only: 3 files, 14 tests
- cc-openspec: 14 files, 22 tests (effective top-level its; counting describe+it both yields 59)

## cc-only-only scenarios
- **Promotion-time reviewer re-resolution under ownership reassignment.** Latent rename promoted into NEW owner's queue after `PATCH owner` between submission and outer accept (`phase7Integration.test.ts`). Material contrast: cc-openspec's properties file asserts the OPPOSITE outcome under different framing — "sticky routing": owner change does not move the change, original reviewer keeps it (`phase-7-properties.test.ts`). See Divergent expectations.
- **Cascade-delete propagating case-3 invalidation to a queued change anchored under a detached subtree.** End-to-end: `DELETE /taxa/r1` halts at other-owner, detaches midE; previously-queued rename of leafD becomes case-3 invalid on next `/queue` read (`phase7Integration.test.ts`).
- **Three §11.4 cases triggered in one test, then `POST /reset` clears all of cascade + case-3 + case-2 state and restarts id counter** (`phase7Integration.test.ts`). cc-openspec has separate per-path reset tests but no "all three at once" omnibus.
- **§11.5/§15.2 projection: proposer status view shows `invalid` IDENTICALLY for cases 1, 2, and 3 — never distinguishes auto-dismissed from awaiting-dismiss via disposition** (`phase7StatusView.test.ts`). cc-openspec asserts disposition+reason for each case in isolation but never proves uniformity-across-cases.
- **Queue projection asymmetry: case-3 invalid IS in `/queue`; case-1 and case-2 are NOT** — three cases set up side-by-side in one scenario (`phase7StatusView.test.ts`). cc-openspec's case-classification file shows case-3 stays in queue and case-2 leaves the queue, but never asserts case-1 absent against case-3 present in the same test.
- **§14 collaborative deletion through proposals: blocked share → submit detach proposal to other owner → accept → retry delete succeeds** (`phase7Integration.test.ts`). cc-openspec's `app.phase4.integration.test.ts` does the same shape but with DIRECT detach by the same user (no proposal/accept hop) — material decomposition difference: cc-only proves the proposal-mediated path; cc-openspec only proves the direct-action path.
- **Phase 4 multi-owner rename clash across trees** — rename of shared taxon to a name that exists in OTHER tree returns 409, post-failure name is the prior safe value (`phase4Integration.test.ts`). cc-openspec's `phase-6-cross-tree.test.ts` covers cross-tree clash but only via the proposal/accept path, not direct PATCH.

## cc-openspec-only scenarios
- **Phase 2 bootstrap composition** (`app.integration.test.ts`): fresh server → reset → register → identity middleware classifies caller; register-then-reset reclassifies registered → unregistered; cross-casing round-trip (registry's stored casing surfaces via Caller). cc-only has no Phase-2-level integration file at all.
- **Phase 3 read-surface composition** (`app.phase3.integration.test.ts`): seed → read all four endpoints (`/taxa`, `/taxa/:id`, `/trees`, `/trees/:id`) → reset → all empty; `shared:true` surfaces consistently across `/taxa` and the two containing `/trees` responses.
- **§11.1 concurrent-write serialization end-to-end at HTTP layer** (`app.phase4.integration.test.ts`): 10 concurrent `POST /taxa` produce 10 distinct sequential ids; concurrent PATCH name produces one of the two values. cc-only's integration suite has no concurrency scenarios (covered elsewhere in its concurrency tests).
- **Multi-owner routing within ONE proposal** — proposal touching taxa owned by three different users routes each change to its respective owner, then each reviewer acts independently (Bob accepts, Carol rejects) (`phase-6-multi-owner.test.ts`). cc-only's "multi-owner story" is direct-action only (rename via PATCH after owner reassignment), not multi-reviewer-within-one-proposal.
- **Reject cascade via decisionDeps with reason-attribution detail** — rejecting outer add-create cascades to nested rename and nested graft, with each invalid descendant's `reason` referencing its IMMEDIATE ancestor's changeId (not the original reject trigger) (`phase-6-reject-cascade.test.ts`).
- **Lazy-evaluation contract proved at the read seam** (`phase-7-lazy-evaluation.test.ts`): 5x GET `/proposals/:id` does not transition queued→invalid; 5x GET `/queue` does not auto-dismiss `invalid-in-queue`; proposer view reflects the persisted disposition+reason verbatim. cc-only relies on side effects of lazy reads (`await queueOf(...)` "triggers lazy") but never asserts the negative — that reads alone are pure.
- **Move-as-two-proposals non-atomicity** (§14.1) — accept detach, observe intermediate orphaned state, then accept graft (`phase-7-properties.test.ts`).
- **Sticky routing of queued change across ownership reassignment** — `PATCH owner` does NOT move the queued change to the new owner and does NOT invalidate it (`phase-7-properties.test.ts`). See Divergent expectations.
- **Cascade halt at others' taxa with edge-detach detail** — region cascade for Alice-owned Sub detaches Sub→Shared frontier edge; Shared persists and remains reachable from OtherRoot (`phase-7-properties.test.ts`).
- **Case-1 cascade from NON-reject ancestor invalidation** (Phase 7 extension) — direct-action invalidates an add-create, latent descendant rolls to case-1 invalid; case-2 invalidation of an add-create cascades similarly (`phase-7-case1-extended.test.ts`).
- **Per-path reset coverage** (`phase-7-reset.test.ts`): reset after successful cascade, rolled-back cascade, case-1 cascade, explicit dismiss, and omnibus. cc-only collapses these into one combined Phase-7 reset test.
- **Failed-accept end-state via the pre-walk path** — direct PUT-edge fires the side-effect invalidation walk BEFORE the accept attempt, so accept fails with `change-not-queued` (not `accept-invariant-violation`); change ends up invalid+in-queue with reason (`phase-6-failed-accept.test.ts`). cc-only has no analog; its "delete blocked by precondition, fix, retry succeeds" (`phase4Integration.test.ts`) is a different shape (precondition failure, not proposal-accept failure).
- **Per-proposal `add-graft` cross-tree clash end-to-end** — graft taxon t3 into tree R where t2 has same name → accept returns 409 with `in-tree-name-clash` and the clashing tree's rootId (`phase-6-cross-tree.test.ts`).
- **Phase-3 `shared:true` view consistency** across `/taxa` and both containing `/trees` (`app.phase3.integration.test.ts`).

## Divergent expectations
- **Ownership reassignment + queued/latent reviewer routing — opposite outcomes.**
  - cc-only `phase7Integration.test.ts` "§14 ownership reassignment reroutes promotion-time reviewer": after Alice reassigns t to Bob, a LATENT rename of t (decision-dep on a Wrapper add-create) is promoted into Bob's queue (new owner) when the Wrapper is accepted; explicitly asserts the rename is NOT in Alice's queue.
  - cc-openspec `phase-7-properties.test.ts` "ownership reassignment is unilateral and does not invalidate queued changes (sticky routing)": a QUEUED rename of Subject stays routed to Bob after `PATCH owner: Carol`; Bob (original reviewer) can still accept.
  - These two scenarios are NOT strictly contradictory at the spec level — cc-only tests promotion-time re-resolution of a latent change; cc-openspec tests sticky routing of an already-queued change. But the projects are framing the §6.2/§14 routing rule along different seams: cc-only emphasises "reviewer is re-resolved at promotion"; cc-openspec emphasises "queue assignment is sticky." A single end-to-end test that combines BOTH (queued rename stays sticky AND latent rename re-resolves at promotion) appears in NEITHER project.
- **Phase-4 collaborative-delete-unblock decomposition.**
  - cc-only `phase4Integration.test.ts` does it through proposal/accept (cross-owner detach via proposal).
  - cc-openspec `app.phase4.integration.test.ts` does it with direct PATCH/DELETE by the same single owner who happens to own both endpoints of the shared edge.
  - Both prove "blocked → unblocked after detach", but through different §11/§14 paths. End-to-end outcome (shared edge gone, delete then succeeds) is the same; the demonstrated workflow differs.
- **Failed-accept error tag.**
  - cc-openspec `phase-6-failed-accept.test.ts` explicitly documents the Phase-7 path shift: the side-effect walk fires on the intervening direct edge BEFORE accept, so accept returns `change-not-queued` rather than `accept-invariant-violation`. End-state (invalid+in-queue+reason) matches what cc-only's Appendix-A.2 test reaches via a different sequence. The behavior is consistent; only cc-openspec asserts the specific error-tag along the way (non-material per normalization rules).

## Shared coverage
- **Appendix A.1 and A.2 end-to-end.** cc-only `phase7Integration.test.ts` covers both as multi-actor scenarios with accept-cascade (A.1) and case-3 + dismiss (A.2). cc-openspec covers these in the `proposals-end-to-end` area, not this area's files — but the integration-area files duplicate the building blocks (review loop, cross-tree, multi-owner, case classification).
- **Reset clears Phase-7 state and restarts id counters.** Both projects assert this; cc-only does it in one omnibus, cc-openspec spreads it across `phase-7-reset.test.ts` paths.
- **Cross-tree clash at accept-time.** Both prove §10.3's cross-tree property: cc-only via direct PATCH name (`phase4Integration.test.ts`), cc-openspec via proposal/accept rename and add-graft (`phase-6-cross-tree.test.ts`).
- **Multi-step accept/reject of independent changes by their respective owners.** cc-only's Appendix A.1 scenario implicitly; cc-openspec's `phase-6-multi-owner.test.ts` explicitly.
- **Case 2 (same-reviewer accept auto-dismisses sibling) and Case 3 (cross-reviewer accept marks but keeps queued).** Both projects exercise these; cc-only also asserts the proposer-view uniformity invariant which cc-openspec does not.
- **§14 cascade deletion halts at others' taxa.** Both projects.
- **§14 bullet 4 stranded U-owned end-to-end** (delete cascade leaves other-owned descendant reachable as detached root). cc-only `phase4Integration.test.ts`; cc-openspec analog appears in `phase-7-properties.test.ts` halt scenario.

## Notes
- File counts differ materially (14 vs 3) but the test-level coverage gap is narrower than the file count suggests: cc-only packs multiple §14/§11.4 scenarios per test, cc-openspec splits one assertion-cluster per file.
- The ONE area cc-openspec has that cc-only's integration suite genuinely lacks at any seam: explicit lazy-evaluation negative assertions (reads are observably pure with respect to disposition transitions).
- The ONE area cc-only has that cc-openspec lacks: proposer-view uniformity across cases 1/2/3 + queue-projection asymmetry (case-3 present, case-1/case-2 absent) both proven in single tests with all three cases set up side-by-side.
