# taxa
> POST/PATCH/DELETE /taxa, edge endpoints, GET /taxa, GET /trees, taxon store mechanics.

## Test inventory
- cc-only: 7 files, 120 tests
- cc-openspec: 10 files, 208 tests (counts include `describe` group nodes; `it` count ~135)

## cc-only-only scenarios

- **GET /trees** returns full taxon records keyed under `{trees: [...]}` and tests that shape exhaustively (`reads.test.ts`). cc-openspec returns only `{id, name}` per root under `{roots: [...]}`.
- **GET /trees/{rootId}** finitization via stubs for fixture-induced in-tree diamonds: cc-only asserts exactly one full expansion plus one bare `{id}` stub for a duplicated node (`reads.test.ts`). cc-openspec instead expands once per tree and marks with `shared:true`.
- **Reads gated by registration**: explicit tests that unregistered ghost callers get 403 and NBSP-malformed `X-Username` gets 400 on all four read endpoints (`reads.test.ts`).
- **POST /taxa** explicitly tests that unknown body keys including `owner` are ignored and the caller becomes owner (`taxaCreate.test.ts`); cc-openspec doesn't test owner-key ignore.
- **PATCH** explicit case-only rename (`Fantasy` → `FANTASY`) returns 200 with new casing (`taxaEdit.test.ts`); no equivalent in cc-openspec.
- **PATCH** unknown-keys-with-valid-change accept path (decision #6) tested explicitly (`taxaEdit.test.ts`).
- **PATCH** 409 envelope is asserted to carry `kind` + offending `root/taxa` in `details` (`taxaEdit.test.ts`); cc-openspec asserts `details.tag` + `offendingTaxa` but no equivalent "offending root" surface.
- **PUT edge** subtree-graft name-clash from a foreign subtree's internal name (G→Fantasy grafted under R→Fantasy) is tested as a single end-to-end POST/attach scenario (`taxaEdgeAdd.test.ts`). cc-openspec covers the same idea via seeded subtree-merging tests (`put-edge-subtree.test.ts`) but uses different shape.
- **PUT edge** asserts post-rejection byte-identical state via full `/taxa` snapshot diff (`taxaEdgeAdd.test.ts`); cc-openspec checks only the targeted edge index.
- **DELETE taxon** "N has multiple parents → at least one precondition fires; either tag accepted" (`taxaDelete.test.ts`) explicitly leaves precondition-firing order unconstrained. cc-openspec pins precondition-1-before-precondition-2 (see Divergent below).

## cc-openspec-only scenarios

- **GET /taxa** and **GET /taxa/{id}** response shape includes a derived `shared: boolean` field plus separate `children`/`parents` arrays (six total fields), tested explicitly (`http.test.ts`, `serialize.test.ts`). cc-only uses `childIds`/`parentIds` with no `shared` field.
- **GET /trees** returns `{roots: [{id, name}]}` with no recursive children, and **GET /trees/{rootId}** returns `{root, tree}` with `shared:true` markers and omits `parents` from node shape (`http.test.ts`).
- **Reads are fully open**: null user + unregistered + registered all succeed on all four endpoints; explicit "openness" describe blocks (`http.test.ts`).
- **POST /taxa** owner-casing canonicalization: `X-Username: alice` against `register("Alice")` stores `owner:"Alice"` (`post-taxa.test.ts`). cc-only stores owner verbatim from `X-Username`.
- **PATCH** owner reassignment canonicalizes new owner casing to registry's stored form (`patch-taxon.test.ts`).
- **PATCH** rename-failure rolls back owner change in same call → atomicity verified end-to-end (`patch-taxon.test.ts`).
- **PATCH** validation-order tests: `unregistered-owner` before `checkRename`; `malformed-body` before owner-registry lookup (`patch-taxon.test.ts`).
- **POST /taxa** validation order: `malformed-body` before `missing-name`; `missing-name` before format check (`post-taxa.test.ts`).
- **DELETE edge** repeated DELETE: first 204, second 404 idempotent-fail contract (`delete-edge.test.ts`). cc-only just tests "no edge between them → 404" without the repeat sequence.
- **DELETE edge** authorization-before-existence ordering: unknown child + non-owner caller → 403 not 404 (`delete-edge.test.ts`, `put-edge.test.ts`). cc-only does not pin this ordering.
- **DELETE taxon** "post-state consistency: no dangling references remain" — explicit post-condition integrity check (`delete-taxon.test.ts`).
- **Store-level**: `deleteRegion` primitive tested directly (region taxa + halt-frontier edges in one call, dual-index consistency, frontier-only mode, outgoing-edge cleanup) (`store-writes.test.ts`). cc-only has no equivalent region-deletion store primitive.
- **Store-level**: `addEdge`/`removeEdge` return values (true/false on existed-or-not), `setTaxonFields` no-op semantics, store-permits-invariant-violations baseline (cycles/diamonds/self-loops accepted at store seam) (`store.test.ts`, `store-writes.test.ts`).

## Divergent expectations

- **PUT edge self-loop**: cc-only → `409 conflict { kind: "cycle" }` (treated as a degenerate cycle, `taxaEdgeAdd.test.ts`). cc-openspec → `400 same-parent-and-child` (short-circuited before invariant engine, `put-edge.test.ts`). **Material**: different HTTP class (400 vs 409) and different semantic category.
- **DELETE taxon — precondition firing order**: cc-only's "multiple parents both fail" test explicitly accepts either `shared_in_region` or `multiple_parents` (`taxaDelete.test.ts`). cc-openspec pins precondition-1-fires-first when both would fail (`delete-taxon.test.ts`). **Material**: cc-openspec constrains a behavior cc-only leaves underdetermined.
- **DELETE edge — unknown child by non-owner**: cc-openspec pins **403 not-parent-owner** (authorization before child existence, `delete-edge.test.ts`, mirrored for PUT). cc-only only tests unknown child with the owner caller (404) and doesn't constrain the non-owner+unknown-child ordering. **Material**: cc-openspec adds an ordering invariant.
- **Read endpoints — registration gate**: cc-only requires the caller to be either null or registered (unregistered ghost → 403; malformed username → 400). cc-openspec treats all four read endpoints as fully open (any header value → 200). **Material**: which callers are accepted differs.
- **Response shape — `shared` field**: cc-openspec exposes a derived `shared` boolean on `/taxa`, `/taxa/{id}`, and `/trees/{rootId}` nodes. cc-only never exposes shared-ness in any read shape. **Material**: GET response shape differs.
- **GET /trees response**: cc-only returns full taxon records under `trees`; cc-openspec returns lightweight `{id,name}` summaries under `roots`. **Material**: shape and field set both differ.
- **In-tree diamond rendering** (when one exists in storage): cc-only uses stub-on-second-visit; cc-openspec uses repeat-with-`shared:true`. **Material**: tree response structure differs for the same underlying graph.
- **Owner casing on writes**: cc-openspec canonicalizes owner to the registry's stored casing on POST and PATCH (`alice` → `Alice`). cc-only stores the X-Username header verbatim. **Material**: stored side-effect differs.
- **PATCH atomicity on combined rename+reassign**: cc-only tests success-path atomicity ("both apply"). cc-openspec additionally tests **rollback on rename failure** — owner change rolled back when name clash fires. **Material** (only as a constraint asymmetry — cc-openspec pins atomicity on the failure path; cc-only does not).
- **PATCH unregistered new owner**: cc-only returns 400 (decision #9, `taxaEdit.test.ts`). cc-openspec returns 400 with tag `unregistered-owner` (`patch-taxon.test.ts`). Status agrees; tag name differs (non-material per normalization).

## Shared coverage

- POST /taxa happy path: registered caller → 201, monotonic IDs, caller-as-owner, visible in GET /taxa and /trees.
- POST /taxa rejection: null caller 403, unregistered 403, malformed username 400, non-JSON 400, missing/non-string name 400, format violations (empty/whitespace) 400.
- PATCH happy paths: rename by owner, reassign to registered user, combined rename+reassign, self-reassign no-op, current-name no-op.
- PATCH rejection: unknown id 404, non-owner 403, null/unregistered/malformed caller, empty body 400, malformed name 400, unregistered new owner 400, in-tree and cross-tree name clashes 409.
- PUT edge happy path: parent-owner adds edge → 204 with idempotent re-add; cross-tree sharing of a child allowed.
- PUT edge rejection: unknown parent/child 404, non-parent-owner 403, null caller 403, malformed header 400, cycle 409, in-tree duplicate (diamond) 409, in-tree name clash 409 (incl. case variants and grafted-subtree name clash).
- DELETE edge happy path: parent-owner detaches → 204, detached child with no other parents becomes root, subtree preserved (detach ≠ delete).
- DELETE edge rejection: unknown parent 404, non-parent-owner 403, null caller 403, no-edge-between-them 404.
- DELETE taxon happy paths: lone root, wholly-owned subtree cascade, deep chain, non-root with single owner-owned parent, halt-at-other-owner with detached survivor, stranded U-owned descendant beneath halt point survives, multiple other-owned halt-frontier children each detached.
- DELETE taxon preconditions: shared-in-region (N itself shared OR descendant shared via second tree) → 409; halt-frontier taxon that is itself shared elsewhere does NOT trip precondition 1; parent-not-owned → 409; non-owner 403; unknown id 404; rejected delete leaves state byte-identical.
- Store unit tests: monotonic `t1`/`t2`/… ID minting, fresh-store empty baseline, attach idempotency, detach removes from both indices, clear/reset zeroes counter, allTaxa in creation order, parents-of derived index symmetric.
- Reset wipes all taxa AND zeros the ID counter so the next mint is `t1`; previously-issued ids return 404 afterwards.
