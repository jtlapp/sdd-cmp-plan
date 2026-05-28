# proposals-end-to-end
> Full propose→review→accept/reject flows across the wire, multi-tree, appendix A scenarios, no-side-effects on failure.

## Test inventory
- cc-only: 2 files, 11 tests
- cc-openspec: 4 files, 4 tests

## cc-only-only scenarios
- Appendix A.1 full walkthrough through acceptance: Bob accepts c3 rename, Urban Fantasy create (new taxon owned by Bob), then Paranormal Romance latent-to-queued promotion and acceptance, then Alice accepts c1 rename; all dispositions verified accepted/structural (`reviewIntegration.test.ts`).
- Appendix A.1 acceptance-order variant: Alice accepts c1 rename first; verifies rename doesn't disturb c2's parentage and nested ops remain valid (`reviewIntegration.test.ts`).
- Appendix A.2 with acceptance: Frank accepts graft → a3 becomes shared under both a2 and b2, ownership stays with Erin, inner create promotes to Erin's queue; Dana rejects P1 detach → a3 stays under a2; P2 unaffected; inner create stays queued (`reviewIntegration.test.ts`).
- Failed accept no-side-effects: name-clash rename returns 409, live state byte-equal, change auto-dismisses to "invalid", subsequent reject returns 409 change_not_queued (`reviewIntegration.test.ts`).
- Cross-tree shared-taxon rename propagates on accept: rename of taxon shared by r1 and r2 is visible in both tree views after acceptance (`reviewIntegration.test.ts`).
- Self-routed accept: proposer Alice accepts her own rename of r1 and live state reflects it (`reviewIntegration.test.ts`).
- Self-routed proposal: rename in proposer's own queue (submission only) (`proposalsIntegration.test.ts`).
- Reset across the lifecycle (post-submission): reset restarts proposal-id and change-id counters, no pre-reset residue (`proposalsIntegration.test.ts`).
- Reset clears post-accept and post-reject state: after acceptance+rejection, reset wipes state and id counters restart at p1/c1 (`reviewIntegration.test.ts`).

## cc-openspec-only scenarios
- Explicit byte-equality snapshot of `/taxa`, `/trees`, `/users` before and after a complex multi-owner submission to assert no-side-effects (`end-to-end-no-side-effects.test.ts`). cc-only verifies no-side-effects only on failed accept and via incidental tree reads.
- Multi-tree shared-taxon submission asserting the rename appears exactly once in the owner's queue regardless of which tree the proposal targets (`end-to-end-multiple-trees.test.ts`). cc-only's shared-taxon test covers post-accept propagation, not single-queue-entry routing on submission.

## Divergent expectations
- None observed. The Appendix A.1/A.2 setups, payloads, reviewer routing, queue contents, and latent-vs-queued dispositions agree across both projects. The shape of the proposal response differs (cc-only `{id, payload}` vs cc-openspec `{proposalId, status}`) but this is non-material naming.

## Shared coverage
- Appendix A.1 initial submission: routing of c1 rename to Alice, c3 rename + Urban Fantasy create to Bob, Paranormal Romance latent, Carol's queue empty (`proposalsIntegration.test.ts` / `end-to-end-appendix-a1.test.ts`).
- Appendix A.2 initial submission: Dana queued for P1 detach, Frank queued for P2 graft of a3, Erin's nested-create latent under graft, two independent proposal ids (`proposalsIntegration.test.ts` / `end-to-end-appendix-a2.test.ts`).
- Live graph unchanged after submission (cc-only checks selected reads inside the A.1 test; cc-openspec snapshots whole-state) (`proposalsIntegration.test.ts` / `end-to-end-no-side-effects.test.ts`).
- Multi-tree shared-taxon routing on submission to the shared-taxon owner (`proposalsIntegration.test.ts` indirectly via A.2 cross-tree graft; `end-to-end-multiple-trees.test.ts` directly).
