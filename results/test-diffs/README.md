# Test-Suite Comparison: cc-only vs cc-openspec

This directory holds the comparison of test suites produced by two Claude Code
configurations implementing the same 7-phase PRD:

- `/Users/joe/repos/sdd-cmp-cc-only` — flat `test/*.test.ts`, mostly HTTP-boundary tests.
- `/Users/joe/repos/sdd-cmp-cc-openspec` — `test/<feature>/*.test.ts`, mixed unit + integration.

The PRDs and phase briefs in the two projects are identical. Both projects use
`node:test` + `node:assert/strict`. Differences reflect the configurations'
choices about what to test and what behavior to expect.

## Start here

- [`SUMMARY.md`](SUMMARY.md) — aggregate findings: ranked behavioral divergences, coverage gaps in each direction, testing philosophy.
- [`by-area/`](by-area/) — 18 per-area reports. Each has `cc-only-only`, `cc-openspec-only`, `divergent expectations`, and `shared coverage` sections.

## Methodology

A three-step pipeline:

1. **Extract** ([`scripts/extract.js`](scripts/extract.js)) walks each project's
   `test/` directory, scans every `.test.ts` file as plain text, and emits a
   JSON corpus of `(file, test name, line number, kind)` tuples. Kind is one of
   `test`, `it`, `describe`. Regex-only — no AST parser, no TypeScript
   dependency. Output: [`extracted/cc-only.json`](extracted/cc-only.json),
   [`extracted/cc-openspec.json`](extracted/cc-openspec.json).

2. **Group** ([`scripts/group.js`](scripts/group.js)) maps each test file into
   one of 18 functional areas defined in
   [`extracted/areas.json`](extracted/areas.json). The mapping is hand-curated
   from path/filename heuristics; the script verifies that every test file in
   both projects matches exactly one area
   (see [`extracted/coverage.json`](extracted/coverage.json)). Per-area corpora
   land in [`extracted/by-area/`](extracted/by-area/).

3. **Compare** — for each area, an LLM agent reads the relevant test files in
   both projects, normalizes away surface differences (see below), and writes
   a markdown report to [`by-area/<area>.md`](by-area/). After all 18 reports
   were complete, the findings were synthesized into [`SUMMARY.md`](SUMMARY.md).

## Normalization rules

The PRD gave both projects freedom in error response codes, error message
wording, and additional optional parameters. Those differences are
**non-material** for the comparison.

A divergence is **non-material** if it is:

- A different HTTP status code for the same rejection (400 vs 422, 404 vs 409).
- Different error message text.
- A different error reason tag / code string (e.g. `top_not_in_tree` vs
  `top-taxon-not-in-tree`) when the projects agree on the rejection itself.
- An additional optional input parameter present in one project.
- An additional optional output field present in one project that doesn't
  reflect a domain-state distinction.

A divergence is **material** if it changes:

- Whether an input is accepted or rejected.
- What state mutation occurs (cascade vs. no cascade, single vs. many records).
- The structural shape of a response (list vs. single item, presence or
  absence of a field that reflects domain state — e.g. a `shared: boolean`
  on a taxon read).
- Pinned ordering guarantees (FIFO required vs. determinism-only).

The errors area is a special case: there, the *shape* of the error envelope is
itself the domain under test, so envelope-structural differences are
in-scope while individual message strings remain out of scope.

## Functional areas

Tests were grouped into these 18 areas. The full mapping is in
[`extracted/areas.json`](extracted/areas.json).

| Area | cc-only files | cc-openspec files | Report |
|---|---:|---:|---|
| app-smoke | 1 | 2 | [report](by-area/app-smoke.md) |
| auth | 2 | 5 | [report](by-area/auth.md) |
| changes-lifecycle | 11 | 11 | [report](by-area/changes-lifecycle.md) |
| concurrency | 2 | 1 | [report](by-area/concurrency.md) |
| domain | 3 | 5 | [report](by-area/domain.md) |
| errors | 1 | 1 | [report](by-area/errors.md) |
| format | 2 | 3 | [report](by-area/format.md) |
| identity | 1 | 4 | [report](by-area/identity.md) |
| integration | 3 | 14 | [report](by-area/integration.md) |
| proposals-derive | 4 | 7 | [report](by-area/proposals-derive.md) |
| proposals-end-to-end | 2 | 4 | [report](by-area/proposals-end-to-end.md) |
| proposals-payload | 2 | 8 | [report](by-area/proposals-payload.md) |
| proposals-queue | 2 | 5 | [report](by-area/proposals-queue.md) |
| proposals-routing | 0 | 3 | [report](by-area/proposals-routing.md) |
| proposals-store | 0 | 6 | [report](by-area/proposals-store.md) |
| reset | 1 | 5 | [report](by-area/reset.md) |
| taxa | 7 | 10 | [report](by-area/taxa.md) |
| users | 2 | 2 | [report](by-area/users.md) |

Two areas (`proposals-routing`, `proposals-store`) have zero cc-only files
because cc-only didn't isolate those concerns: routing folds into
`proposals-payload` and `proposals-end-to-end`, and store-level properties are
exercised implicitly through HTTP integration. The respective area reports
note this and cross-check the relevant cc-only files anyway.

## Layout

```
results/test-diffs/
  README.md                # this file
  SUMMARY.md               # aggregate findings
  by-area/                 # 18 per-area comparison reports
    app-smoke.md
    auth.md
    ...
  extracted/               # mechanical extraction outputs
    cc-only.json           # full test corpus, cc-only
    cc-openspec.json       # full test corpus, cc-openspec
    areas.json             # area -> file-pattern mapping (hand-curated)
    coverage.json          # audit of which files matched which area
    by-area/               # per-area JSON corpora consumed by the agents
      app-smoke.json
      ...
  scripts/                 # the pipeline
    extract.js             # walks test/, emits corpus
    group.js               # partitions corpus by area
    package.json           # type: module, no dependencies
```

## Re-running the pipeline

```sh
cd results/test-diffs/scripts
node extract.js /Users/joe/repos/sdd-cmp-cc-only      ../extracted/cc-only.json
node extract.js /Users/joe/repos/sdd-cmp-cc-openspec  ../extracted/cc-openspec.json
node group.js
```

If a project's test layout changes, update `extracted/areas.json` to add the
new file patterns and re-run `group.js`. To regenerate a per-area report, run
the comparison agent again with the area's JSON corpus as input — the prompts
used for each area are documented inline in the per-area reports' headers via
the scope line.

## Limitations

- Extraction is regex-based. A test declared with a non-literal name
  (e.g., a variable concatenation) would be missed. Spot-checks against
  known files showed no misses in either project's actual test syntax.
- "Behavioral equivalence" is judged by an LLM reading the source. Subtle
  divergences buried in helper functions or in fixture differences may be
  underreported. The per-area reports cite test file basenames so claims can
  be verified manually.
- The `cc-openspec` test count is inflated by `describe` blocks counted as
  entries; the actual `it`-case count is roughly 800-900 (see SUMMARY).
- The 18-area decomposition is one cut at the problem. A test that touches
  two areas (e.g., reset semantics exercised in `phase7Integration.test.ts`)
  appears in only one area's report. Cross-area effects are flagged inline
  when material.
