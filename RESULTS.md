# Results of comparing OpenSpec with Native CC

## Effort and Cost

| | Native CC<br>Compute Time | OpenSpec<br>Compute Time* | Native CC<br>API Cost | OpenSpec<br>API Cost* |
| --- | --- | --- | --- | --- |
| Phase 1 | 5 min | 36 min | $ 2.11 | $ 11.78 |
| Phase 2 | 14 min | 33 min | $ 5.36 | $ 14.08 |
| Phase 3 | 15 min | 35 min | $ 5.19 | $ 14.66 |
| Phase 4 | 26 min | 45 min | $ 12.47 | $ 27.21 |
| Phase 5 | 22 min | 57 min | $ 8.98 | $ 28.91 |
| Phase 6 | 25 min | 60 min | $ 9.74 | $ 40.29 |
| Phase 7 | 34 min | 76 min | $ 16.79 | $ 61.34 |
| TOTAL |  hrs |  hrs | $  | $  |

\* I reduced the actual OpenSpec values by 4% to remove cost of running OpenLore drift.

## Caveats

- **Initial/final test plans.** I had the workflows create anticipated test cases in advance of implementation, which certainly affected outcomes. The workflows also maintained summaries of the final test cases and the diffs from the initial test cases. This also increased usage.
- **Overtaxed OpenSpec.** OpenSpec is not intended for more than 10 tasks at a time, but several phases had more than 10.
- **Didn't spec from scratch.** I started with a PRD detailing observable behavior. Spec-driven development is geared toward working with the LLM to define the specification from scratch.
- **Assisted with surfaced problems.** The workflows gave opportunities for me to explore aspects of implementation during planning, but I mainly explored the aspects that the LLM appeared to be indicating were potentially problematic.

## Conversation Comparison

I recorded all conversations between Claude Code and the user and performed an analysis of the conversations. The following table summarizes the analysis. Details can be found at [Native CC conversation analysis](/results/cc-only/SUMMARY.md) and [OpenSpec conversation analysis](/results/cc-openspec/SUMMARY.md).

| Metric | Native CC | OpenSpec |
| --- | --- | --- |
| (a) Prompts from Claude Code | 16 | 40 |
| (b) Topics presented for discussion | 55 | 141 |
| (c) Topics user provided input on | 25 | 80 |
| (d) Problems raised | 27 | 32 |
| (e) Problems user answered | 13 | 28 |
| (f) Critical problems raised | 7 | 15 |
| (g) Critical problems user answered | 7 | 15 |

- **(a) Prompts from Claude Code** — distinct CC turns that asked the user any question or invited input. A single turn with five sub-questions = 1 prompt.
- **(b) Topics presented for discussion** — every distinct topic AND nested sub-bullet CC raised for the user to weigh in on. A topic with three nested sub-points counts as 4 (1 parent + 3 children).
- **(c) Topics user provided input on** — subset of (b) the user's reply explicitly addressed.
- **(d) Problems raised** — spec issues only: gaps, ambiguities, inconsistencies, or contradictions in the PRD or phase brief. Implementation issues and pure design-preference questions are not counted.
- **(e) Problems user answered** — subset of (d) where the user's reply gave a resolution or direction.
- **(f) Critical problems raised** — user-selected subset of (e) where the problem's resolution has a material impact on functionality.
- **(g) Critical problems user answered** — subset of (f) where the user's reply gave a resolution or direction.

## Handling of Introduced Defects

Here is a summary of how the two tools handled the four intentionally planted defects. Per-implementation details:
[Native CC](results/defects/cc-only.md), [OpenSpec](results/defects/cc-openspec.md).

### Defect Scoreboard

Both tools correctly implemented the same 3 of the 4 defects. The missing defect was additional functionality allowing a proposer of changes to a tree to withdraw their proposal. In fairness, there should have been no expectation for the LLM to see this as a required feature.

|                                                            | Native CC | OpenSpec |
| ---                                                        | ---                 | ---      |
| Defects surfaced in conversation                           | 1 / 4               | 0 / 4    |
| Defects correctly resolved in the implementation           | 3 / 4               | 3 / 4    |
| Defects with a dedicated test                              | 3 / 4               | 2 / 4    |
| Spec-correction artifact produced                          | Yes (`prd-errata.md`) | No     |

### Per-Defect Comparison

| Defect | Kind / difficulty | Native CC | OpenSpec |
| --- | --- | --- | --- |
| Cascade atomicity §12.2 vs §15.5 | inconsistency / obvious | **Surfaced**; user resolved (§12.2 wins); atomic impl; tested | Not surfaced; atomic impl (silently chosen in derived spec); tested |
| Name case-sensitivity §6.4 vs §3.3/§3.4 | inconsistency / subtle | Not surfaced; case-insensitive impl; tested (edge-add implicit) | Not surfaced; case-insensitive impl; tested |
| Proposer withdrawal | gap / obvious | Not surfaced; **no endpoint**; not tested | Not surfaced; **no endpoint**; not tested |
| Self-routed change | gap / subtle | Listed as a settled decision in Phase 5; correct impl; tested (happy path) | Not surfaced; correct impl; tested only implicitly |

## Test Suite Comparison

Beyond differing on a handful of specific behaviors (covered in the next section), the two implementations produced test suites that differ substantially in *shape* — in scale, organizational style, and the layer at which they exercise the code. Full per-area detail lives in [`results/test-diffs/`](results/test-diffs/), with [`SUMMARY.md`](results/test-diffs/SUMMARY.md) as the entry point and 18 per-area reports under [`by-area/`](results/test-diffs/by-area/).

### Scale and structure

|  | Native CC | OpenSpec |
| --- | --- | --- |
| Test files | 46 | 96 |
| Total test cases (approx.) | 484 | ~900 |
| Layering | mostly HTTP-boundary integration | mixed: pure-domain unit + HTTP integration |

### Testing approach

Native CC — HTTP-boundary integration as dominant style:
- State transitions, invariant checks, store mechanics, and middleware all exercised through real route calls.
- Proves the wire contract end-to-end, but with weaker failure localization — when something breaks, the failure points back to a route rather than the offending function.

OpenSpec — unit-test layer underneath an integration layer:
- Pure-domain functions, store internals, change-derivation pipeline, and middleware each have dedicated unit-test files.
- HTTP integration files focus on wiring and on cross-cutting scenarios.
- Finer error localization and explicit purity/import-discipline assertions, at the cost of weaker wire-integration coverage in places — for example, the write-serialization lock is verified as a primitive in isolation but not proven wired to every mutating route.

### What each suite is positioned to catch

The two strategies are good at catching different classes of regression:

- Native CC's HTTP-first approach is positioned to catch:
  - End-to-end lifecycle and state-machine bugs that only surface across many steps (full proposal accept → reject → dismiss → reset walks).
  - Integration-wiring bugs where a route forgets to apply concurrency control or auth gating.
  - Observable response-shape regressions on real requests.
- OpenSpec's unit-layered approach is positioned to catch:
  - Subtle bugs in pure-domain algorithms — for instance, deletion-region semantics around halt frontiers — before they get masked by the integration paths that exercise them.
  - Read-side purity regressions (assertions that repeated reads do not mutate state).
  - Isolation-layer purity violations such as a domain module reaching into the HTTP layer.
- Symmetric blind spots: each side has a small number of PRD-mandated behaviors that only the other side verifies. These are quantified in the [Testing Divergence](#testing-divergence) subsection below.

## Phase Test-Plan Prediction Accuracy

For every phase, each project froze a `phase-N-initial.md` test plan before writing code, then closed a `phase-N-final.md` with a changelog of how the plan evolved during implementation. Comparing those changelogs across all seven phases is direct evidence of how well each tool's up-front test plan held up. Full per-phase reasoning, the reason-category breakdown, and notable individual deltas live in [`results/test-diffs/PHASE-DIFFS.md`](results/test-diffs/PHASE-DIFFS.md); the tables below are the headline data.

### Prediction-accuracy scoreboard

The `%` columns express each row's delta count as a percentage of the project's total initial test scenarios across all seven phases (472 for Native CC; 1,457 for OpenSpec — counted at the same one-row-or-bullet granularity used for deltas). The `% substantive` / `% cosmetic` / phase-win rows already express a different kind of percentage, so their `%` cells are dashed.

| | Native CC | % of initial tests | OpenSpec | % of initial tests |
| --- | ---: | ---: | ---: | ---: |
| Total deltas across 7 phases | 54 | 11.4% | 53 | 3.6% |
| Added | 31 | 6.6% | 24 | 1.6% |
| Revised | 16 | 3.4% | 11 | 0.8% |
| Removed | 5 | 1.1% | 17 | 1.2% |
| Cosmetic | 2 | 0.4% | 1 | 0.1% |
| % substantive (Added + Revised + Removed) | 96.3% | — | 98.1% | — |
| % cosmetic | 3.7% | — | 1.9% | — |
| Phases where this project's initial plan predicted more accurately | 0 | — | 7 | — |
| Phases tied | 0 | — | 0 | — |

### Per-phase deltas

Each `%` column is `total deltas in the phase ÷ initial scenarios planned for that phase × 100`. The "More accurate" column picks the project with the lower percentage (ties when within 0.5 pp).

| Phase | Native CC total | Native CC % | OpenSpec total | OpenSpec % | More accurate |
| ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 5 | 12.5% | 4 | 5.6% | OpenSpec |
| 2 | 7 | 17.9% | 7 | 6.5% | OpenSpec |
| 3 | 8 | 10.0% | 7 | 5.0% | OpenSpec |
| 4 | 8 | 7.9% | 10 | 5.7% | OpenSpec |
| 5 | 8 | 8.1% | 7 | 2.3% | OpenSpec |
| 6 | 9 | 14.3% | 11 | 3.7% | OpenSpec |
| 7 | 9 | 18.0% | 7 | 2.0% | OpenSpec |
| **Total** | **54** | **11.4%** | **53** | **3.6%** | OpenSpec 7, Native CC 0 |

Absolute totals are nearly identical (54 vs 53), but normalized against initial-plan size OpenSpec churned roughly **one-third as much** of its planned tests (3.6% vs 11.4%).

## PRD Gap Implementation and Testing

This section summarizes how each tool resolved the PRD ambiguities that surfaced during implementation and which PRD-mandated behaviors each tool verified via test. Full reasoning lives in [`results/test-diffs/CRITICAL-DIFFS.md`](results/test-diffs/CRITICAL-DIFFS.md); the tables below are a scoreboard distillation focused on critical and partially-critical gaps. A gap is **critical** when its resolution changes a domain action's outcome or stored state; **partial** means only part of the divergence (e.g. the underlying rule, not its status-code dressing) is critical.

### Implementation Divergence

Each row in the per-gap detail table below is a PRD ambiguity that forced the two tools to pick a resolution. Both tools resolved every gap, but on some they resolved *differently* — and on a few the PRD doesn't pick a winner, so both resolutions are defensible. Codes (G1–G6) match the [Critical spec gaps](results/test-diffs/CRITICAL-DIFFS.md#critical-spec-gaps) section of CRITICAL-DIFFS.md.

On critical PRD correctness OpenSpec wins 3, Native CC wins 0, with 3 gaps genuinely ambiguous; critical coverage gaps split evenly 2-2.

#### Implementation divergence scoreboard

|                                       | Native CC | OpenSpec |
| ---                                   | ---                 | ---      |
| Unambiguous critical gaps PRD-correct | 0 / 3               | 3 / 3    |
| PRD-ambiguous gaps (both defensible)  | 3                   | 3        |

CRITICAL-DIFFS.md's 15-item ranking lists 5 critical + 2 partial rows but ranks #1 and #4 both map to G1 (the reads-auth gate surfacing in two ranked areas), so the 7 ranking rows collapse to 6 unique underlying gaps.

#### Implementation divergence tally

| Outcome                            | Count | Gaps       |
| ---                                | ---   | ---        |
| OpenSpec more PRD-correct          | 3     | G1, G2, G3 |
| Native CC more PRD-correct | 0   | —          |
| Ambiguous (PRD doesn't pick)       | 3     | G4, G5, G6 |

#### Implementation divergence per-gap detail

| Gap | PRD reading | Native CC | OpenSpec | Verdict |
| --- | --- | --- | --- | --- |
| G1 reads-auth gate | §4 declares reads explicitly open to all callers | Identity middleware 403s any unregistered caller, including on reads | Reads accept null, unregistered, and registered callers alike | OpenSpec aligns with §4 |
| G2 failed self-accept disposition | §11.4 case 2 applies to "another" queued change, not the acted-on one | Treats failed accept as case 2: change becomes invalid and is auto-dismissed from the queue | Treats failed accept as case 3: change becomes invalid but stays queued for manual dismissal | OpenSpec matches §11.4 literally |
| G3 owner casing on writes | §4 makes the registry the source of truth for canonical casing | Stores `X-Username` verbatim; the same user can appear under different spellings on different taxa | Canonicalizes to the registry's stored form; one spelling per user across all taxa | OpenSpec preserves registry as canonical source |
| G4 `shared` field on reads | §15.2 enumerates response fields but is not necessarily exhaustive | Omits `shared` from all read responses | Exposes derived `shared: boolean` on taxa and tree nodes | Ambiguous — both defensible |
| G5 submission-time existence checks | §9–§11 give conflicting signals on which existence failures are caught at submission | Requires existence only for routing; defers deeper checks to acceptance | Validates the full dependency tree at submission with explicit error tags | Ambiguous — PRD doesn't pick |
| G6 latent rename + ownership reassignment | §6.2/§14 silent on reviewer routing after owner change | Tests promotion-time re-resolution of a latent rename | Tests sticky routing of an already-queued rename | Ambiguous — different scenarios tested; combined behavior untested in both |

### Testing Divergence

Each row in the per-gap detail table below is a PRD-mandated behavior verified by tests on one side only — a *coverage* gap rather than a behavioral one. Both implementations *may* do the right thing; the unverified side just has no proof. Codes (C1–C4) are introduced for this table; full reasoning is in the [Critical coverage gaps](results/test-diffs/CRITICAL-DIFFS.md#critical-coverage-gaps) section of CRITICAL-DIFFS.md.

#### Testing divergence scoreboard

|                                            | Native CC | OpenSpec |
| ---                                        | ---                 | ---      |
| Gaps tested only by this side              | C1, C2              | C3, C4   |

#### Testing divergence per-gap detail

| Gap | Tested by | Description |
| --- | --- | --- |
| C1  | Native CC | A.1/A.2 lifecycle end-to-end through accept → reject → dismiss → reset |
| C2  | Native CC | HTTP-boundary write-lock wiring on every mutating route |
| C3  | OpenSpec            | §6.3 owner-scoped region as a pure-domain unit, including halt-frontier edge cases |
| C4  | OpenSpec            | Lazy-evaluation read-purity negative assertions |

## Conclusions

### Developer Experience

- OpenSpec `explore` is **much friendlier** and more enjoyable than CC's `plan`.
  - I don't have to worry about CC spontaneously deciding to implement.
  - I'm not facing walls of text repeating implementation.
  - I'm not trying to communicate via multiple-choice menus.
- OpenSpec takes **much longer to compute** and is much more costly.
- Native CC is **better for vibe coding** a quick solution by minimizing user's input.

### Design Visibility

- OpenSpec **invites more participation** in the design and implementation process.
- OpenSpec is a **great workflow for understanding** what the AI is doing.
  - Offers "threads" for the user to "pull on" to investigate implementation decisions.
  - OpenSpec is a better workflow for helping junior devs learn from AI.