# Phase Test-Plan Prediction Accuracy: cc-only vs cc-openspec

How well did each implementation predict its final test plan before writing code? Both projects ship paired `phase-N-initial.md` (frozen at phase start) and `phase-N-final.md` (closed at phase end) plans, and every final carries a changelog documenting how the test plan evolved during implementation. Those changelogs are direct evidence of how much the up-front plan held up.

See [`SUMMARY.md`](SUMMARY.md) and [`CRITICAL-DIFFS.md`](CRITICAL-DIFFS.md) for the resulting-test-suite comparison; this file focuses on the *plan-to-plan* delta, not the suite shape.

## Methodology

For each of seven phases, each project records deltas between its initial test plan and the final plan that landed with the code. The two changelogs use different native formats; we map both into a shared 5-column taxonomy so the counts are directly comparable.

| Shared column | cc-only sources | cc-openspec sources |
| --- | --- | --- |
| **Added** | `Added:` bullets | `+` entries, `Added` sub-section bullets |
| **Revised** | `Refined:` bullets, `C-LAZY/C-EXIST/C-DISMISSAUTH`-style implementation-decision entries | `~` entries, `Changed rows` bullets, `Reframed` bullets |
| **Renamed** | `Renamed:` bullets | (none observed) |
| **Removed** | `Not added:` bullets (Phases 6–7 only) | `-` entries, `Reduced` bullets, `Removed rows` and `Test files removed` entries, `Scenarios from the initial plan deferred or descoped` entries |
| **Confirmed-no-test** | `Confirmed without separate test:` bullets | `~` entries explicitly recording a deliberate non-test |

Each delta is also tagged with one *reason* drawn from the changelog entry's own justification text:

- **Coverage gap** — initial plan simply missed a case (e.g. non-string inputs to a validator).
- **Integration / wiring** — discovered while assembling end-to-end tests that a behavior wasn't covered across the seam.
- **Runtime surprise** — only surfaced when code ran (e.g. RFC 7230 OWS stripping in cc-openspec Phase 2 CL-1, or Hono `onError` not firing for non-Error throws in cc-openspec Phase 1).
- **Spec ambiguity** — spec was unclear; implementation forced a pick, often recorded as an indexed Decision.
- **Cosmetic** — file rename, parameterization, layout reshuffle with no behavioral change.
- **PRD re-reading** — re-reading the spec / a sibling phase's coverage reclassified a planned row (most commonly "already covered exhaustively elsewhere").

One changelog entry = one delta, regardless of how many test cases it describes. Multi-action entries (e.g. cc-openspec Phase 2 CL-1, tagged "added + changed") are assigned the action verb that leads the entry's title; the secondary action is noted in *Notable individual deltas* below where material. cc-openspec's "Frozen rows that landed unchanged" inventories are positive confirmations of plan stability and are *not* counted as deltas. cc-openspec Phase 7's "Test files added" inventory is treated as the phase's test-file index, not as 12 individual deltas — consistent with how the same project's earlier phases handle their file lists.

Source files (frozen and final plans) live in each project's `test-plans/` directory: see `sdd-cmp-cc-only/test-plans/phase-{1..7}-{initial,final}.md` and `sdd-cmp-cc-openspec/test-plans/phase-{1..7}-{initial,final}.md`.

## Scoreboard at a glance

| | cc-only | cc-openspec |
| --- | ---: | ---: |
| Total deltas across 7 phases | 54 | 53 |
| Added | 31 | 24 |
| Revised | 16 | 11 |
| Renamed | 1 | 0 |
| Removed | 5 | 17 |
| Confirmed-no-test | 1 | 1 |
| % substantive (Added + Revised + Removed) | 96.3% | 98.1% |
| % cosmetic (Renamed + Confirmed-no-test) | 3.7% | 1.9% |
| Phases where this project's initial plan predicted more accurately | 2 | 4 |
| Phases tied | 1 | 1 |

The totals are nearly identical (54 vs 53), but the **shape** of the deltas differs sharply: cc-only's plans tend to **under-predict** the final scope (lots of additions during implementation, only 5 removals over seven phases), while cc-openspec's plans tend to **over-predict** (fewer additions and 17 removals — initial plans frequently listed rows that were later cut as redundant, unreachable, or flaky). Both projects produce similar overall plan churn, but they err in opposite directions.

## Per-phase deltas

`A / R / Re / X / C` = Added / Revised / Renamed / Removed / Confirmed-no-test.

| Phase | cc-only A/R/Re/X/C | cc-only total | cc-openspec A/R/Re/X/C | cc-openspec total | More accurate | Note |
| ---: | --- | ---: | --- | ---: | --- | --- |
| 1 | 2 / 1 / 1 / 0 / 1 | 5 | 2 / 1 / 0 / 0 / 1 | 4 | cc-openspec | Near-parity; both projects caught the validator non-string boundary as a coverage gap |
| 2 | 6 / 1 / 0 / 0 / 0 | 7 | 3 / 2 / 0 / 2 / 0 | 7 | tie | Same root cause (Hono HTTP-transport whitespace normalization) drives most deltas in both; cc-only adds tests, cc-openspec splits layers and removes rows |
| 3 | 7 / 1 / 0 / 0 / 0 | 8 | 5 / 1 / 0 / 1 / 0 | 7 | cc-openspec | cc-only adds more coverage-gap tests; cc-openspec consolidates a planned static-grep row into a source-level check |
| 4 | 7 / 1 / 0 / 0 / 0 | 8 | 5 / 0 / 0 / 5 / 0 | 10 | cc-only | cc-openspec culls five planned rows in one phase (re-entry deadlock, single-row reset, cross-step reassign chain, concurrent DELETE+PUT, etc.) |
| 5 | 5 / 3 / 0 / 0 / 0 | 8 | 3 / 1 / 0 / 3 / 0 | 7 | cc-openspec | First phase where cc-only's Revised count climbs noticeably (graft-preserves-ownership reframings) |
| 6 | 2 / 4 / 0 / 3 / 0 | 9 | 6 / 4 / 0 / 1 / 0 | 11 | cc-only | cc-only introduces "Not added" notes for the first time; cc-openspec records four design-level Changed rows (serializer rule, field placement, top-taxon dep semantics, body parsing) |
| 7 | 2 / 5 / 0 / 2 / 0 | 9 | 0 / 2 / 0 / 5 / 0 | 7 | cc-openspec | cc-only records three implementation-decision Revised entries (C-LAZY / C-EXIST / C-DISMISSAUTH, indexed as decisions 12–14); cc-openspec defers four Appendix-A and full-lifecycle omnibus scenarios |
| **Total** | **31 / 16 / 1 / 5 / 1** | **54** | **24 / 11 / 0 / 17 / 1** | **53** | cc-openspec 4, cc-only 2, tie 1 | |

**Trajectory.** Both projects' per-phase delta counts trend mildly upward with phase complexity, but neither degrades sharply. cc-only's *shape* shifts more than its volume: Phases 1–5 are dominated by Added (initial plans miss scope), then Phases 6–7 shift toward Revised + Removed (initial plans over-anticipate scope that the implementation merges or judges redundant). cc-openspec's shape is more stable — Removed entries appear from Phase 2 onward and stay common throughout, suggesting OpenSpec's re-derive step exposes "this row is already covered by an earlier phase / sibling spec" reclassifications fairly consistently.

## Reason distribution

| Reason | cc-only | cc-openspec |
| --- | ---: | ---: |
| Coverage gap | 28 | 24 |
| Integration / wiring | 7 | 3 |
| Runtime surprise | 7 | 7 |
| Spec ambiguity | 6 | 8 |
| Cosmetic | 5 | 2 |
| PRD re-reading | 1 | 9 |
| **Total** | **54** | **53** |

The most asymmetric category is **PRD re-reading** (1 vs 9). Every cc-openspec instance is a row that the implementation reclassified out of the test plan because re-reading the spec / sibling phases revealed it was already covered, or it didn't belong at the layer the initial plan placed it. This is consistent with OpenSpec's mandated re-derive step before applying a change — that step forces a fresh look at the spec, and the consequence is mostly *removals* of tests that turn out to be redundant rather than additions of new tests.

**Integration / wiring** runs the other way (7 vs 3): cc-only discovers more wiring-level deltas (cross-phase reset composition, integration smoke that confirms a Phase-1 fallthrough survives a Phase-2 mount, "blocked → fix → retry" delete narratives) — consistent with cc-only's HTTP-boundary-dominant test style, where assembly-level surprises are routinely caught at the integration seam.

**Spec ambiguity** is slightly higher on the cc-openspec side (6 vs 8), but the gap is smaller than the PRD-re-reading gap. Both projects surface spec ambiguities at comparable rates; cc-openspec records them as numbered design decisions, cc-only records them as prose-tagged implementation-decision entries (`C-LAZY`, `C-EXIST`, `C-DISMISSAUTH` in Phase 7 are explicitly cross-referenced to "decisions 12 / 13 / 14" in the resolved-ambiguities index — cc-only's only formal decision-recording channel is this changelog).

**Runtime surprise** is identical (7 vs 7) and is dominated by one root cause: Hono's HTTP transport strips RFC 7230 OWS from header values before middleware sees them, breaking every malformed-header test that asserts via `app.request()`. Both projects discovered this independently; they resolved it differently (cc-only switches to U+00A0 NBSP so the malformed input survives the transport; cc-openspec adds a function-level test layer that bypasses HTTP entirely).

## Notable individual deltas

- **cc-openspec Phase 2 CL-1** — HTTP-transport OWS-stripping discovery led to a two-layer test strategy (HTTP integration + middleware-function unit) and a new `design.md` Decision 10. Same root cause as cc-only's NBSP switch (Phase 2 / Phase 3 / Phase 4 changelogs), but the resolutions differ in posture: cc-openspec adds an entire test layer; cc-only adjusts the input character. Both are runtime-surprise deltas; only cc-openspec's resolution survived three subsequent phases without a follow-up correction.
- **cc-openspec Phase 1 normalize-non-Error-throws middleware** — Discovered during implementation that Hono's `onError(err: Error, c)` does not fire for non-`Error` throws (e.g. `throw "surprise"`); the framework lets the throw escape. Added a `normalizeThrows` middleware so the planned envelope test would pass. The spec wasn't changed — the spec demanded the envelope behavior, and this was the mechanism that delivers it. cc-only does not record a parallel discovery, but its envelope tests cover the same surface.
- **cc-only Phase 7 C-LAZY / C-EXIST / C-DISMISSAUTH** — Three implementation choices that diverged from initial-plan expectations were recorded inline in the test-plan changelog and indexed against "decisions 12 / 13 / 14" in the resolved-ambiguities index. These are the most explicit decision-recording entries cc-only produces anywhere in the project. cc-openspec's equivalent — design-decisions recorded against the OpenSpec change — sits in `openspec/changes/.../design.md`, not in the test plan.
- **cc-openspec Phase 4** has five `Reduced` / `Removed` entries in one phase — the only such concentration in either project. Four of the five cite cross-phase test duplication ("already covered exhaustively in Phase 2"; "end-to-end coverage gives the same signal at lower duplication"); one cites testability ("would require inspecting internal state of the lock that we deliberately do not expose"). cc-only Phase 4 has zero removals — every Phase 4 addition is purely additive.
- **cc-only's "No scenarios were removed" line** appears verbatim in Phases 1–5; Phases 6–7 break the pattern with `Not added:` bullets (five across the two phases). The shift coincides with the project entering territory (proposal lifecycle, cascade) where the initial plans over-enumerated symmetric cases that the shared-helper implementation made redundant. cc-openspec's removal cadence is steadier: removals appear from Phase 2 onward and never disappear.
- **cc-openspec Phase 7's four descopings** — `§13.4 standalone-vs-cascade non-equivalence` (covered by rollback test), `§13.10 full-lifecycle integration test` (omnibus deemed redundant), `§14.2 deletion-may-require-collaboration` (covered by Phase 4), and `§15.1 / §15.2 Appendix A worked examples` (covered by per-behavior integration tests). All four cite redundancy with existing coverage rather than scope cuts. This is the most concentrated set of PRD re-reading deltas in the dataset.

## Process-artifact differences

The two projects use noticeably different documentation conventions in the changelog itself:

- **cc-only** uses prose category tags (`Added:`, `Refined:`, `Renamed:`, `Confirmed without separate test:`, `Not added:`) with a `Reason:` clause per bullet. Phases 1–5 end with "No scenarios were removed"; Phases 6–7 add explicit `Not added:` bullets. The Phase 7 changelog introduces an ad-hoc indexing scheme (`C-LAZY`, `C-EXIST`, `C-DISMISSAUTH`) and cross-references "decisions 12–14" in the project's resolved-ambiguities index — the only formal decision-recording channel cc-only uses.
- **cc-openspec** uses symbolic markers (`+`, `~`, `-`) with reason-cluster sub-sections ("Implementation-driven additions", "Implementation detail surfaced during testing", "Frozen rows that landed unchanged"). Phase 2 introduces `CL-N` entry tags for cross-reference. Material deltas use a "What changed / How resolved / Reason" sub-structure. Several entries cite a per-change `design.md` Decision number (the OpenSpec workflow's standard decision-recording channel), and every final ends with a `check_spec_drift` result note (0 drift in all seven phases).

Neither convention is graded here as better or worse — both produce traceable evidence of plan-to-plan evolution. The structural difference matters only as background for the count comparison: cc-openspec's `+/~/-` form makes Removed entries syntactically distinct, which may explain why the project's authors recorded more of them; cc-only's prose form lacks a syntactic affordance for removals and historically marked them only when they passed a salience threshold (Phases 6–7).
