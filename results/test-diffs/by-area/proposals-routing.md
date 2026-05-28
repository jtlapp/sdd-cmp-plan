# proposals-routing
> POST /proposals success path, target tree resolution, no-mutation guarantees on rejection.

## Test inventory
- cc-only: 0 files explicitly mapped, but equivalent scenarios live in proposalsParse.test.ts (success envelope + target-tree resolution) and proposalsIntegration.test.ts (routing/queue installation). NOTE: cc-only does not isolate this area; the relevant tests are in proposalsParse.test.ts / proposalsIntegration.test.ts (and one ancillary in proposalsPartialPayload.test.ts).
- cc-openspec: 3 files, 15 tests.

## cc-only-only scenarios
- Reset-across-lifecycle replay verifying proposal-id counter restart and absence of pre-reset residue after `POST /reset` (proposalsIntegration.test.ts).
- Appendix A.2 two-proposal cross-tree move exercising routing into two different owners' queues from independent proposals (proposalsIntegration.test.ts).
- Self-routed proposal landing in the proposer's own queue (proposalsIntegration.test.ts).
- Partial-payload routing: unmentioned siblings produce no status nodes / no changes for the routed proposal (proposalsPartialPayload.test.ts).

## cc-openspec-only scenarios
- Proposer field on the stored envelope preserves the registry's original casing when X-Username casing differs (post-proposals-success.test.ts).
- Successful submission leaves taxa/trees/users snapshots byte-equal (no-mutation guarantee on the live graph and registry) (post-proposals-no-mutation.test.ts).
- Failed submission (unknown op) leaves the proposal store empty — explicit assertion that listProposals() is unchanged on rejection (post-proposals-no-mutation.test.ts).
- Explicit assertion that a 404 on unknown-target-tree installs no proposal in the store (post-proposals-target-tree.test.ts).
- Implementation-level lock-discipline check: submit-handler.ts source contains exactly one withWriteLock(...) call (post-proposals-success.test.ts).

## Divergent expectations
- Target-tree resolution when `targetRootId` names an existing non-root taxon: cc-openspec rejects with `unknown-target-tree` (treating the input as not a valid target tree), while cc-only rejects with a distinct `not_a_root` category at 409 (treating it as a separate conflict shape). Both reject the same input; the divergence is in error categorization (non-material per scope rules). proposalsParse.test.ts (cc-only) vs post-proposals-target-tree.test.ts (cc-openspec).
- Success response shape: cc-openspec asserts `{ proposalId, status: <StatusNode tree> }` where the top is a no-op with `disposition: "structural"`, `reviewer: null`, `children: []` (post-proposals-success.test.ts). cc-only asserts `{ id, payload: { op, id, disposition: "structural", ... } }` (proposalsParse.test.ts line 38). Field naming differs (`proposalId` vs `id`, `status` vs `payload`) but both reflect the created proposal's id, op, and structural disposition — non-material per scope rules.

## Shared coverage
- 201 success on a minimal valid no-op top-anchor submission with disposition `structural` (proposalsParse.test.ts; post-proposals-success.test.ts).
- Proposal id allocation produces sequential p1, p2 on repeat submissions (proposalsIntegration.test.ts reset-counter assertion; post-proposals-success.test.ts explicit two-submission case).
- Rename of a child taxon installs a queued change routed to that taxon's owner, surfaced in the owner's queue (proposalsIntegration.test.ts Appendix A.1; post-proposals-success.test.ts rename case).
- Nested add-create chain produces a queued outer change and a latent inner change; the latent change is in no one's queue (proposalsIntegration.test.ts Appendix A.1 Paranormal-Romance assertion; post-proposals-success.test.ts latent case).
- Unknown `targetRootId` → rejection (proposalsParse.test.ts line 439; post-proposals-target-tree.test.ts).
- `targetRootId` that exists but is not a root → rejection (proposalsParse.test.ts line 449; post-proposals-target-tree.test.ts).
