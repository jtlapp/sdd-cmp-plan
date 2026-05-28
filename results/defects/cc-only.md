# Defect handling — cc-only (vanilla Claude Code with `/plan`)

How the vanilla-Claude-Code implementation at `/Users/joe/repos/sdd-cmp-cc-only/`
handled the four defects planted in `sdd-cmp-plan/defects.md`. Conversation
sources: `sdd-cmp-plan/results/cc-only/cc-only-phase-{1..7}.txt`. Code sources:
`sdd-cmp-cc-only/src/`, `sdd-cmp-cc-only/test/`,
`sdd-cmp-cc-only/prd/prd-errata.md`.

**At a glance.** Of the four defects, only **Defect 1** (the obvious
inconsistency) was surfaced and explicitly resolved in conversation; the user's
ruling was captured in a new `prd/prd-errata.md`. **Defect 2** (subtle name
case-sensitivity) and **Defect 4** (subtle self-routed gap) were never raised as
spec issues but were nonetheless implemented correctly by default. **Defect 3**
(obvious withdrawal gap) was missed entirely — no endpoint, no test, no mention.

## Summary table

| Defect | Surfaced? | Handled? | Implementation | Tested? |
|---|---|---|---|---|
| 1. Cascade atomicity (inconsistency, obvious) | **Yes** (Phase 7) | **Yes** — user ruled §12.2 governs, CC recorded it in `prd/prd-errata.md` | **Correct** (atomic, full rollback) | **Yes** — dedicated `cascadeRollback.test.ts` |
| 2. Name case-sensitivity (inconsistency, subtle) | **No** | Not discussed; CC implemented uniformly | **Correct** (case-insensitive everywhere) | **Mostly** — case-insensitivity tested at the rename/create paths; edge-add coverage is implicit via the shared invariant module |
| 3. Proposer withdrawal (gap, obvious) | **No** | Not addressed | **Missing** — no withdraw/cancel endpoint | **No** |
| 4. Self-routed change (gap, subtle) | **Partial** — listed as a settled decision in Phase 5 without spec-issue framing | Decided unilaterally by CC | **Correct** (queue for self-review, no special-casing) | **Yes (happy path)** — three dedicated self-routed tests; no mixed-ownership boundary |

## Defect 1 — Cascade atomicity (§12.2 vs §15.5, inconsistency, OBVIOUS)

**A. Surfaced?** **Yes — caught head-on.** In Phase 7, CC quoted both
clauses side-by-side and asked the user to adjudicate (cc-only-phase-7.txt:176–209):
> "Two PRD sections describe accept-cascade's failure semantics in opposite
> ways… My read: §12.2 governs, §15.5's parenthetical "(§12.2)" is a stale
> cross-reference… Do you want me to (a) go with full atomic rollback per §12.2
> and leave the PRD alone, (b) same but also fix §15.5's wording, or (c)
> actually go with the partial-commit reading of §15.5?"

**B. How handled.** The user picked atomic rollback and gave exact replacement
wording (cc-only-phase-7.txt:213–220):
> "§12.2 is authoritative. `accept-cascade` is **atomic**… on any failure the
> entire cascade rolls back with a reason (§12.2)."

CC opened a new file `prd/prd-errata.md` rather than editing the PRD; entry E1
(`prd/prd-errata.md:7–26`) records the §15.5 correction verbatim.

**C. Implementation.** Atomic per §12.2.
`src/review.ts:95–137` defines a `CascadeAudit` carrying per-change pre-state
snapshots and a list of `liveRollbacks`. `src/review.ts:236–258` builds the
audit during cascade execution; on any failed validation it calls
`rollbackAudit(audit)`, which walks `liveRollbacks` in reverse and restores
every snapshotted change record (`src/review.ts:131–137`). The route at
`src/routes/reviews.ts` wires this.

**D. Tested?** Yes. `test/cascadeRollback.test.ts` exercises mid-cascade
failures (in-tree name clash, cross-tree clash, broken existence dep) and
asserts byte-equal restoration of change state, queue membership, ownership,
and live taxa/edges. `test/cascadeHappy.test.ts` covers success paths.

## Defect 2 — Name case-sensitivity (§6.4 vs §3.3/§3.4, inconsistency, SUBTLE)

**A. Surfaced?** **No.** Greps for "case-sensitive" / "case sensitive" / "exact
string" over all seven transcripts return nothing. §6.4 appears repeatedly
during the Phase 4 edge-add work but only in its endpoint-routing role; the
parenthetical "exact, case-sensitive strings" inside it is never quoted or
questioned.

**B. How handled.** Not discussed. CC implemented case-insensitive name
comparison uniformly without naming the contradiction.

**C. Implementation.** Correct (case-insensitive everywhere).
- `src/validation/taxonName.ts:26–28` defines `taxonNamesEqual` as
  `a.toLowerCase() === b.toLowerCase()`.
- `src/invariants.ts:13` documents the rule explicitly: "taxa share the same
  name (compared case-insensitively per §3.4)."
- `src/invariants.ts:154` groups names by `t.name.toLowerCase()` when computing
  the per-tree name-uniqueness invariant; this single function backs the
  rename path, the proposal-accept paths, and the §6.4 edge-add path.

**D. Tested?** Yes at the invariant layer. `test/invariants.test.ts` and
`test/taxonName.test.ts` directly assert that case-variant pairs collide.
`test/taxaEdit.test.ts` covers rename-to-case-variant. The edge-add tests in
`test/taxaEdgeAdd.test.ts` use distinct-name clashes ("Fantasy" vs another
"Fantasy") rather than case-variant pairs, so edge-add's case-insensitivity is
covered **transitively** via the shared invariant engine but not by a dedicated
case-variant edge-add test.

## Defect 3 — Proposer withdrawal (gap, OBVIOUS)

**A. Surfaced?** **No.** Greps for `withdraw` / `cancel` over all seven
transcripts return nothing.

**B. How handled.** Not addressed in any phase.

**C. Implementation.** Missing entirely. `src/routes/proposals.ts` defines
three routes (`POST /proposals`, `GET /proposals`, `GET /proposals/:id`); there
is no `POST /proposals/{id}/withdraw`, no `DELETE /proposals/{id}`, and no
proposer-side termination handler anywhere in `src/`. Greps for `withdraw` /
`cancel` over `src/` return nothing.

**D. Tested?** No. No test file mentions withdrawal or cancellation.

## Defect 4 — Self-routed changes / proposer-as-reviewer (gap, SUBTLE)

**A. Surfaced?** **Partial — never framed as a gap.** The Phase 5 transcript
lists "self-routed proposals allowed" as one of several already-settled
ambiguities (cc-only-phase-5.txt:170), and the phase-5 test plan annotates a
test fixture as "submitted by Alice (self-routed) for simplicity"
(cc-only-phase-5.txt:454). The decision was made by CC during plan-write
rather than being put to the user as an open question.

**B. How handled.** Decided unilaterally; matches `defects.md`'s recommended
resolution (allow, queue to proposer like any other reviewer).

**C. Implementation.** Correct, no special-casing.
`src/proposals.ts` routing returns `t.owner` or `p.owner` depending on op
(`src/proposals.ts:634, 649, 663`) with no comparison against the proposer.
A change whose computed reviewer happens to be the proposer enters the
proposer's own queue and is then accepted/rejected/dismissed through the
normal review routes.

**D. Tested?** Yes, three dedicated tests:
- `test/proposalsIntegration.test.ts:192` — "self-routed proposal: change
  appears in proposer's own queue."
- `test/reviewIntegration.test.ts:352` — "self-routed accept: proposer accepts
  her own change."
- `test/cascadeHappy.test.ts:277` — "self-routed cascade — reviewer is also
  the proposer."

Coverage limitation: all three exercise the *pure* self-routed case (proposer
owns the entire target). No test covers a mixed-ownership proposal where some
operations self-route and others route to a different owner, so behavior at
that boundary is asserted only by construction, not by test.
