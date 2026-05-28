# Results of comparing OpenSpec with vanilla Claude Code

## Effort and Cost

| | CC-Only Compute Time | OpenSpec Compute Time* | CC-Only API Cost | OpenSpec API Cost* |
| Phase 1 | 0.08 hrs |  hrs | $ 2.11 | $  |
| Phase 2 |  hrs |  hrs | $  | $  |
| Phase 3 |  hrs |  hrs | $  | $  |
| Phase 4 |  hrs |  hrs | $  | $  |
| Phase 5 |  hrs |  hrs | $  | $  |
| Phase 6 |  hrs |  hrs | $  | $  |
| Phase 7 |  hrs |  hrs | $  | $  |
| Total |  hrs |  hrs | $  | $  |

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
