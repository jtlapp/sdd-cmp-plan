# Results of comparing OpenSpec with vanilla Claude Code

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
