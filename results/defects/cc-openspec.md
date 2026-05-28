# Defect handling — cc-openspec (Claude Code + OpenSpec)

How the OpenSpec-scaffolded implementation at `/Users/joe/repos/sdd-cmp-cc-openspec/`
handled the four defects planted in `sdd-cmp-plan/defects.md`. Conversation
sources: `sdd-cmp-plan/results/cc-openspec/cc-openspec-phase-{1..7}.txt`. Code
sources: `sdd-cmp-cc-openspec/src/`, `sdd-cmp-cc-openspec/test/`,
`sdd-cmp-cc-openspec/openspec/specs/`.

**At a glance.** **None of the four defects was explicitly surfaced as a spec
contradiction or gap during the seven phases**, despite cc-openspec asking
roughly 2.5× more questions overall than cc-only (40 vs 16 per the conversation
summaries). The OpenSpec workflow produced derived specs that quietly picked
the right interpretation for Defects 1, 2, and 4 — but it did so without
naming the underlying PRD contradictions, and it produced no errata-style
artifact comparable to cc-only's `prd-errata.md`. **Defect 3** (the obvious
withdrawal gap) was missed entirely, just as in cc-only.

## Summary table

| Defect | Surfaced? | Handled? | Implementation | Tested? |
|---|---|---|---|---|
| 1. Cascade atomicity (inconsistency, obvious) | **No** — never raised as a §12.2/§15.5 contradiction | Implicitly: derived spec just chose atomic | **Correct** (atomic, journal-based rollback) | **Yes** — `test/changes/cascade-handler.test.ts` mid-cascade rollback scenario |
| 2. Name case-sensitivity (inconsistency, subtle) | **No** | Implicitly correct | **Correct** (case-insensitive via `equalsCI`) | **Yes** — `test/domain/invariants.test.ts` covers case-variant pairs |
| 3. Proposer withdrawal (gap, obvious) | **No** | Not addressed | **Missing** — no withdraw endpoint | **No** |
| 4. Self-routed change (gap, subtle) | **No** — never named as a case | Implicitly correct | **Correct** (queue for self-review, no special-casing) | **Implicit only** — exercised incidentally by integration tests; no named self-routed test |

## Defect 1 — Cascade atomicity (§12.2 vs §15.5, inconsistency, OBVIOUS)

**A. Surfaced?** **No.** Phase 7 discusses "cascade rollback" extensively as
a *design* topic (how to journal, how to compose with promotion, etc.) but
never quotes §15.5's partial-commit wording or flags it as inconsistent with
§12.2. The defect was not raised by CC, not asked of the user, and not noted
in the cc-openspec SUMMARY.

**B. How handled.** The OpenSpec change for Phase 7 silently committed to the
atomic interpretation. The archived spec at
`openspec/specs/change-cascade-acceptance/spec.md:63` states "Cascade pipeline
runs an atomic worklist in payload-topological order"; line 255 adds "either
every step commits or no…." Neither passage cites the conflicting §15.5
wording; the spec was rewritten from intent rather than from a reconciliation
of the two PRD passages.

**C. Implementation.** Correct (atomic, journal-based rollback).
- `src/changes/cascade-journal.ts` defines a "Copy-on-touch journal of every
  cascade-internal mutation"; on rollback the journal "replays its entries in
  reverse to restore the [pre-cascade] state" (file header lines 1–10).
- `src/changes/cascade-handler.ts:5–16` documents the atomic worklist with
  "On failure: rollback + return 409 cascade-failed."
- `src/changes/cascade-handler.ts:249–257` calls `journal.rollback()` and
  emits a `cascade-failed` envelope on any mid-cascade failure.

**D. Tested?** Yes. `test/changes/cascade-handler.test.ts` contains a "mid-
cascade in-tree-duplicate rollback restores pre-cascade state" scenario that
asserts (a) the outer add-create's minted taxon is removed, (b) every change's
disposition is restored to its pre-cascade value (queued/latent), and (c)
queue membership reverts.

## Defect 2 — Name case-sensitivity (§6.4 vs §3.3/§3.4, inconsistency, SUBTLE)

**A. Surfaced?** **No.** Phase 4 implements edge-add (§6.4) without quoting
or questioning the "exact, case-sensitive strings" parenthetical. No phase
transcript mentions a case-sensitivity contradiction; the cc-openspec SUMMARY
does not list it.

**B. How handled.** Inherited case-insensitive comparison from the Phase 2
user-registry work (registry username matching was settled as
case-insensitive); the same `equalsCI` primitive was reused for taxon names.

**C. Implementation.** Correct (case-insensitive everywhere).
- `src/format/compare.ts:5–7` defines `equalsCI(a, b) = a.toLowerCase() ===
  b.toLowerCase()`.
- `src/domain/invariants.ts:137` documents "Invariant 3 — per-tree name
  uniqueness, case-insensitive (PRD §3.3 (3), §3.4)."
- `src/domain/invariants.ts:154` keys candidate buckets by
  `tx.name.toLowerCase()`; line 173 uses `equalsCI(na, nb)` for per-pair
  confirmation. This single function is the validator used by edge-add,
  rename, and proposal-acceptance paths.

**D. Tested?** Yes. `test/domain/invariants.test.ts:243` covers "Invariant 3 —
per-tree name uniqueness (case-insensitive)" with case-variant pairs.

## Defect 3 — Proposer withdrawal (gap, OBVIOUS)

**A. Surfaced?** **No.** Greps for `withdraw` / `cancel` over all seven
transcripts return nothing. The cc-openspec SUMMARY does not list it either,
despite 12 distinct Phase 5 spec issues being surfaced.

**B. How handled.** Not addressed in any phase.

**C. Implementation.** Missing entirely. `src/app.ts:78, 84–85` registers the
three proposal routes (`POST /proposals`, `GET /proposals`,
`GET /proposals/:id`); change action routes are accept / accept-cascade /
reject / dismiss only — all reviewer-facing. There is no withdraw handler under
`src/proposals/`, no proposer-side termination route, and no archived OpenSpec
change addressing withdrawal.

**D. Tested?** No. No test file references withdrawal or cancellation.

## Defect 4 — Self-routed changes / proposer-as-reviewer (gap, SUBTLE)

**A. Surfaced?** **No.** Greps for `self-routed` / `self routed` /
`proposer-as-reviewer` over all seven transcripts return nothing. Phase 5
discusses routing extensively but never names the proposer-owns-target case.

**B. How handled.** Decided implicitly by writing routing as a pure function
of taxon ownership.

**C. Implementation.** Correct, no special-casing.
`src/proposals/derive.ts:73–109` defines `resolveReviewer()`. For rename it
returns `concrete(t.owner)`; for add/detach it returns `concrete(p.owner)`
(the payload-parent's owner). The function has no parameter for the proposer
and no comparison against any proposer identity. A change whose computed
reviewer happens to be the proposer enters the proposer's own queue exactly
as any other reviewer's queue.

**D. Tested?** **Implicit only.** No test file mentions "self-routed" or
"proposer owns" by name. Integration scenarios such as
`test/integration/phase-6-multi-owner.test.ts` happen to include proposers
acting on their own subtrees (and so exercise self-routing as a side effect),
but no test is named or scoped to the proposer-as-reviewer case, and no test
explicitly asserts the boundary behavior between self-routed and
externally-routed changes within a single mixed proposal.

## Process artifact note

cc-openspec produced no equivalent to cc-only's `prd-errata.md`. The
`openspec/specs/` directory contains 22 derived spec capabilities (each phase
archived) and `openspec/changes/archive/` retains the per-phase proposals, but
none of them record a resolution of any of the four planted defects — even
where the resulting implementation made the correct choice. Where cc-only's
process leaves a trail (errata file with the contradicting passages quoted
and replaced), cc-openspec's process leaves only the *final* spec, with no
record that a contradiction or gap existed in the source PRD.
