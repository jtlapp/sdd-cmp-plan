# Results of comparing OpenSpec with vanilla Claude Code

## Effort and Cost

| | CC-Only<br>Compute Time | OpenSpec<br>Compute Time* | CC-Only<br>API Cost | OpenSpec<br>API Cost* |
| --- | --- | --- | --- | --- |
| Phase 1 | 0.08 hrs |  hrs | $ 2.11 | $  |
| Phase 2 |  hrs |  hrs | $  | $  |
| Phase 3 |  hrs |  hrs | $  | $  |
| Phase 4 |  hrs |  hrs | $  | $  |
| Phase 5 |  hrs |  hrs | $  | $  |
| Phase 6 |  hrs |  hrs | $  | $  |
| Phase 7 |  hrs |  hrs | $  | $  |
| TOTAL |  hrs |  hrs | $  | $  |

\* I reduced the actual OpenSpec values by 4% to remove cost of running OpenLore drift.

## Conversation Comparison

I recorded all conversations between Claude Code and the user and performed an analysis of the conversations. The following table summarizes the analysis. Details can be found at [vanilla CC conversation anaylsis](/results/cc-only/SUMMARY.md) AND [OpenSpec conversation analysis](/results/cc-openspec/SUMMARY.md).

| Metric | Vanilla Claude Code | OpenSpec |
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
[cc-only](results/defects/cc-only.md), [cc-openspec](results/defects/cc-openspec.md).

### Defect Scoreboard

Both tools correctly implemented the same 3 of the 4 defects. The missing defect was additional functionality allowing a proposer of changes to a tree to withdraw their proposal. In fairness, there should have been no expectation for the LLM to see this as a required feature.

|                                                            | Vanilla Claude Code | OpenSpec |
| ---                                                        | ---                 | ---      |
| Defects surfaced in conversation                           | 1 / 4               | 0 / 4    |
| Defects correctly resolved in the implementation           | 3 / 4               | 3 / 4    |
| Defects with a dedicated test                              | 3 / 4               | 2 / 4    |
| Spec-correction artifact produced                          | Yes (`prd-errata.md`) | No     |

### Per-Defect Comparison

| Defect | Kind / difficulty | Vanilla Claude Code | OpenSpec |
| --- | --- | --- | --- |
| Cascade atomicity §12.2 vs §15.5 | inconsistency / obvious | **Surfaced**; user resolved (§12.2 wins); atomic impl; tested | Not surfaced; atomic impl (silently chosen in derived spec); tested |
| Name case-sensitivity §6.4 vs §3.3/§3.4 | inconsistency / subtle | Not surfaced; case-insensitive impl; tested (edge-add implicit) | Not surfaced; case-insensitive impl; tested |
| Proposer withdrawal | gap / obvious | Not surfaced; **no endpoint**; not tested | Not surfaced; **no endpoint**; not tested |
| Self-routed change | gap / subtle | Listed as a settled decision in Phase 5; correct impl; tested (happy path) | Not surfaced; correct impl; tested only implicitly |

## PRD Gap Implementation and Testing

This section summarizes how each tool resolved the PRD ambiguities that surfaced during implementation and which PRD-mandated behaviors each tool verified via test. Full reasoning lives in [`results/test-diffs/CRITICAL-DIFFS.md`](results/test-diffs/CRITICAL-DIFFS.md); the tables below are a scoreboard distillation focused on critical and partially-critical gaps. A gap is **critical** when its resolution changes a domain action's outcome or stored state; **partial** means only part of the divergence (e.g. the underlying rule, not its status-code dressing) is critical.

### Implementation Divergence

Each row in the per-gap detail table below is a PRD ambiguity that forced the two tools to pick a resolution. Both tools resolved every gap, but on some they resolved *differently* — and on a few the PRD doesn't pick a winner, so both resolutions are defensible. Codes (G1–G6) match the [Critical spec gaps](results/test-diffs/CRITICAL-DIFFS.md#critical-spec-gaps) section of CRITICAL-DIFFS.md.

On critical PRD correctness OpenSpec wins 3, Vanilla Claude Code wins 0, with 3 gaps genuinely ambiguous; critical coverage gaps split evenly 2-2.

#### Implementation divergence scoreboard

|                                       | Vanilla Claude Code | OpenSpec |
| ---                                   | ---                 | ---      |
| Unambiguous critical gaps PRD-correct | 0 / 3               | 3 / 3    |
| PRD-ambiguous gaps (both defensible)  | 3                   | 3        |

CRITICAL-DIFFS.md's 15-item ranking lists 5 critical + 2 partial rows but ranks #1 and #4 both map to G1 (the reads-auth gate surfacing in two ranked areas), so the 7 ranking rows collapse to 6 unique underlying gaps.

#### Implementation divergence tally

| Outcome                            | Count | Gaps       |
| ---                                | ---   | ---        |
| OpenSpec more PRD-correct          | 3     | G1, G2, G3 |
| Vanilla Claude Code more PRD-correct | 0   | —          |
| Ambiguous (PRD doesn't pick)       | 3     | G4, G5, G6 |

#### Implementation divergence per-gap detail

| Gap | PRD reading | Vanilla Claude Code | OpenSpec | Verdict |
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

|                                            | Vanilla Claude Code | OpenSpec |
| ---                                        | ---                 | ---      |
| Gaps tested only by this side              | C1, C2              | C3, C4   |

#### Testing divergence per-gap detail

| Gap | Tested by | Description |
| --- | --- | --- |
| C1  | Vanilla Claude Code | A.1/A.2 lifecycle end-to-end through accept → reject → dismiss → reset |
| C2  | Vanilla Claude Code | HTTP-boundary write-lock wiring on every mutating route |
| C3  | OpenSpec            | §6.3 owner-scoped region as a pure-domain unit, including halt-frontier edge cases |
| C4  | OpenSpec            | Lazy-evaluation read-purity negative assertions |
