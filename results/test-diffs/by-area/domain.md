# domain
> Pure domain invariants: reachability, owner-scoped regions, check-add-create, wrappers, multi-tree consistency.

## Test inventory
- cc-only: 3 files, 50 tests (`invariants.test.ts`, `reachability.test.ts`, `domainIntegration.test.ts`)
- cc-openspec: 5 files, 72 `it` cases (excluding 17 `describe` blocks from the raw 95 count) (`invariants.test.ts`, `reachability.test.ts`, `check-add-create.test.ts`, `wrappers.test.ts`, `owner-scoped-region.test.ts`)

## cc-only-only scenarios
- End-to-end app integration: registration + multi-owner DAG + GET /taxa + GET /trees + GET /trees/{rootId} exercising all four §15.2 reads (`domainIntegration.test.ts`).
- §15.6 envelope code round-trip (400 malformed X-Username, 403 unregistered, 404 unknown taxon id) through domain read routes (`domainIntegration.test.ts`).
- Phase-1 notFound fallback persists for unknown deeper route paths under /taxa (`domainIntegration.test.ts`).
- POST /reset wipes BOTH registry AND taxon store in one call, including a previously-valid X-Username becoming 403 afterward (`domainIntegration.test.ts`).
- Three-cycle reachable from a non-cycle root chain (R → A → B → C → A) — cycle reported names only {A,B,C}, NOT R (`invariants.test.ts`). cc-openspec only tests pure three-cycles without the entry-chain attribution detail.
- Cyclic-graph cross-check: a 2-cycle does NOT spuriously trigger invariants 2 or 3 (vacuous when no roots exist) (`invariants.test.ts`).
- Shared-taxon name-clash: a shared taxon X under R1 and R2, where R2 has a sibling Y also named "Thriller", fires a clash ONLY for R2 (`invariants.test.ts`). cc-openspec has the cross-tree-clash flavor but does not exercise the shared-taxon-as-collider case where the conflict comes from the OTHER containing tree's sibling.
- Rename-simulation cross-tree clash: after mutating a shared taxon's name to "Conflict", the clash is reported in the tree where a sibling already had that name — pinpoints §3.3 "every containing tree" enforcement (`invariants.test.ts`).
- `evaluateAll` mutual-independence: graph violating only inv-1 reports cycle alone; only inv-2 reports duplicate alone; only inv-3 reports name_clash alone (`invariants.test.ts`).
- `evaluateAll` reports BOTH inv-2 and inv-3 attributed to the right taxa when both fire in one graph (`invariants.test.ts`).
- `inTreeVisitCounts` exposes path-count semantics on a diamond — pins X visited twice while R, A, B visited once (`reachability.test.ts`).
- `descendants` API: leaf empty, root covers whole subtree, mid-tree returns strict downward closure (excludes ancestors), cycle-safe (`reachability.test.ts`). cc-openspec's `reachableSubtree` covers similar ground but omits the explicit "ancestors are not descendants" assertion.
- `treesContaining` on an unknown id returns [] (`reachability.test.ts`).
- A taxon with no parents is its own containing tree (`reachability.test.ts`).
- Detach causes a previously-child taxon to become a root again (`reachability.test.ts`).

## cc-openspec-only scenarios
- **Owner-scoped region** is a whole sub-area absent from cc-only:
  - Leaf-only region, single-child wholly-owned region, textbook wholly-owned subtree (`owner-scoped-region.test.ts`).
  - Halts at other-owned child and records {parent, child} in haltFrontier (`owner-scoped-region.test.ts`).
  - Cascade does NOT continue past halt-frontier even into owner-owned descendants behind a foreign-owned hop — the §6.3 cascade rule (`owner-scoped-region.test.ts`).
  - Multiple halt-frontier children produce multiple frontier entries (`owner-scoped-region.test.ts`).
  - Halt-frontier child also reachable via a separate wholly-owned path: stays out of region via foreign path, but is in region via owned path; halt-frontier entry still emitted for the foreign edge (`owner-scoped-region.test.ts`).
  - Case-insensitive owner-name matching (`owner-scoped-region.test.ts`).
  - Unknown `n` yields empty region; other-owned `n` yields empty region (`owner-scoped-region.test.ts`).
  - Cyclic graph terminates and includes nodes once (`owner-scoped-region.test.ts`).
  - Does not mutate input Graph (`owner-scoped-region.test.ts`).
- **checkAddCreate** wrapper, an entire wrapper API absent from cc-only:
  - Safe create passes (`check-add-create.test.ts`).
  - Sibling name clash in target tree detected (exact + case-variant) (`check-add-create.test.ts`).
  - Create whose payload-parent is a shared taxon clashes in the OTHER containing tree (`check-add-create.test.ts`).
  - Create under nonexistent parent is structurally fine — §3.3 only, no taxon-not-found check (`check-add-create.test.ts`).
  - Create alone cannot introduce a cycle (zero outbound edges, single inbound) (`check-add-create.test.ts`).
  - Wrapper does not mutate g.taxa / g.childrenOf / g.parentsOf (`check-add-create.test.ts`).
  - Violations carry the minted id (`check-add-create.test.ts`).
  - Repeat calls deterministic (`check-add-create.test.ts`).
  - Source-level keystone tripwire: `checkAddCreate` body must call `checkInvariants` and must NOT re-derive cycle/equalsCI/roots logic (`check-add-create.test.ts`).
- **checkAddEdge** wrapper:
  - Safe add, cycle-creating add rejected, self-loop add rejected, in-tree diamond add rejected, in-tree name-clash add rejected (case-variant), idempotent add (already-existing edge) passes, no input-graph mutation (`wrappers.test.ts`).
- **checkRename** wrapper:
  - Rename to same name OK (no self-clash) (`wrappers.test.ts`).
  - Rename to unused name passes (`wrappers.test.ts`).
  - Same-tree clash rejected; case-variant clash rejected (`wrappers.test.ts`).
  - Rename of a shared taxon causes clash in a DIFFERENT containing tree (the load-bearing cross-tree case) (`wrappers.test.ts`).
  - Cross-tree rename with no clash anywhere passes (`wrappers.test.ts`).
  - No input-graph mutation (`wrappers.test.ts`).
  - Wrapper ignores taxon-name-format validation — §3.3 only; empty string accepted if no clash (`wrappers.test.ts`).
- Disjoint cycles emit at least two cycle violations (cc-only checks single-cycle reporting only) (`invariants.test.ts`).
- `checkInvariants` aggregates in documented order: cycles → in-tree-duplicate → in-tree-name-clash, verified via index comparison on a multi-component graph (`invariants.test.ts`). cc-only's `evaluateAll` tests both-firing but does not pin a stable ORDER.
- Purity contract: checkers do not mutate input and do not throw on pathological graphs (`invariants.test.ts`).
- Reachability purity: roots/containingRoots/isShared/reachableSubtree do not mutate and do not throw on cyclic graphs (`reachability.test.ts`).

## Divergent expectations
- **Cycle violation shape**: cc-only's cycle violation carries `taxa: TaxonId[]` (set of taxa in the cycle, e.g. `[a.id, b.id]` for A→B→A; entry-chain root R excluded for R→A→B→C→A) (`invariants.test.ts`). cc-openspec's carries `cycle: TaxonId[]` (a list; assertions only check `.includes(...)`, not exact membership) (`invariants.test.ts`). Non-material per normalization rule (different field name/test names), but cc-only additionally asserts the entry-chain root is OMITTED from the cycle list — a stricter semantic claim cc-openspec does not test.
- **Name violation casing in payload**: cc-only's `name_clash.name` is asserted lowercased ("fantasy") — implying the engine canonicalizes before reporting (`invariants.test.ts`). cc-openspec's `in-tree-name-clash.name` is asserted with original casing ("Fantasy") (`invariants.test.ts`). Material if a UI consumer reads `.name`: same input ("Fantasy" vs "FANTASY" duplicate) yields different reported `.name` strings. Both verdicts (clash detected) agree.
- **Owner-scoped region semantics**: cc-openspec defines and tests an `ownerScopedRegion(g, n, owner)` returning `{region: Set, haltFrontier: {parent, child}[]}` with explicit halt-frontier-records-edge semantics (`owner-scoped-region.test.ts`). cc-only has NO equivalent test — the §6.3 deletion-region rules are not exercised at the pure-domain layer (they presumably live in cc-only's changes-lifecycle / taxa areas instead). This is a coverage gap, not a verdict divergence: no two-project conflict on a shared input.
- **Cycle detection coverage**: cc-only tests cycle attribution under a non-cycle entry chain (R → cycle); cc-openspec does not. cc-openspec tests disjoint cycles emit ≥2 violations; cc-only does not.
- **Composite-order guarantee**: cc-openspec pins the order cycles → duplicates → name-clashes (`invariants.test.ts`); cc-only treats order as unspecified and asserts only that the right kinds appear (`invariants.test.ts`). Material for consumers iterating `violations[0]`.

## Shared coverage
- Empty graph passes all invariants / is ok:true (`invariants.test.ts` both sides).
- Linear chain / tree passes invariant 1 (no cycles) (`invariants.test.ts` both).
- Cross-tree (across-tree) diamond passes invariant 1 — not a cycle (`invariants.test.ts` both).
- Self-loop (A→A) is detected as a cycle naming A (`invariants.test.ts` both).
- Two-taxon cycle (A→B→A) detected, both taxa named (`invariants.test.ts` both).
- Three-taxon cycle (A→B→C→A) detected, all three named (`invariants.test.ts` both).
- Linear chain / clean tree passes invariant 2 (no in-tree duplicates) (`invariants.test.ts` both).
- Cross-tree diamond passes invariant 2 — sharing across trees is legal (`invariants.test.ts` both).
- In-tree diamond detected as inv-2 violation with `rootId` + `taxonId` attribution (`invariants.test.ts` both).
- Deeper in-tree diamond (multi-hop paths to same descendant under one root) detected (`invariants.test.ts` both).
- In-tree duplications in two separate trees each fire independently (`invariants.test.ts` both).
- Across-tree share + in-tree diamond in only one tree: clash reported once, only for the offending tree (`invariants.test.ts` both).
- Distinct sibling names pass invariant 3 (`invariants.test.ts` both).
- Exact-case sibling name duplicate in one tree detected as inv-3 (`invariants.test.ts` both).
- Case-insensitive name uniqueness: case-variant names clash (`invariants.test.ts` both).
- Same name across different trees is fine — per-tree scope (`invariants.test.ts` both).
- Cross-tree same-name with in-tree clash in only one tree flags only that tree (`invariants.test.ts` both).
- Composite (`evaluateAll` / `checkInvariants`): a graph violating all three kinds reports each kind exactly once (cc-only: both 2+3 simultaneously; cc-openspec: all three simultaneously) (`invariants.test.ts` both).
- Empty graph has no roots; parentless taxa are roots; children are not roots (`reachability.test.ts` both).
- Containing-roots: a leaf traces up to its single root in a chain (`reachability.test.ts` both).
- Cross-tree diamond — descendant's containing roots are {R1, R2} (`reachability.test.ts` both).
- Deeper multi-root graph: taxon reachable through different ancestor chains returns all containing roots (`reachability.test.ts` both).
- `isShared`: true iff containingRoots size > 1; isolated roots / linear-chain children / in-tree-diamond targets are NOT shared (`reachability.test.ts` both). Material agreement: in-tree-diamond X is an inv-2 violation, NOT shared.
- Reachable-subtree / descendants: includes the top + all descendants; descends only from requested top; terminates on cyclic graph; terminates on self-loop (`reachability.test.ts` both).
