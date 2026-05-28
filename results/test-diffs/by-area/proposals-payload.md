# proposals-payload
> Payload-level validation of POST /proposals body: shape, op recognition, top-taxon constraints, first-failure semantics.

## Test inventory
- cc-only: 2 files, 41 tests
- cc-openspec: 7 files, 52 tests (plus 8 `describe` blocks counted in the area JSON; concrete `it` cases ≈ 52)

## cc-only-only scenarios
- Authorization composition with POST /proposals (null user → 403, unregistered well-formed → 403, NBSP-malformed X-Username → 400). (`proposalsParse.test.ts`)
- Submission-time existence checks surfacing as 404 (not as a payload tag): nested rename / detach / graft / no-op with unknown id. (`proposalsParse.test.ts`)
- `targetRootId` validation: unknown id → 404; non-root (has parents) → 409 with `details.kind = "not_a_root"`. (`proposalsParse.test.ts`)
- `top taxon not in target tree` surfaced as 409 with `details.kind = "top_not_in_tree"` (separate from a "top not in tree" payload validation tag). (`proposalsParse.test.ts`)
- Partial-payload semantics: listing only some children leaves siblings unmentioned in the change set; nested detach leaves uninvolved siblings absent from the response; listing a non-existent child is 404 (not lenient). (`proposalsPartialPayload.test.ts`)
- "Each op accepted in a valid position" omnibus smoke covering no-op + detach + rename + add-create + add-graft in a single 201 response. (`proposalsParse.test.ts`)
- End-to-end happy path returns `{ id: /^p\d+$/, payload.disposition: "structural" }`. (`proposalsParse.test.ts`)

## cc-openspec-only scenarios
- First-failure ordering with explicit tag-precedence assertions:
  - shape error in earlier-visited sibling beats existence error in later sibling. (`payload-first-failure.test.ts`)
  - top-taxon failure beats deep existence failure. (`payload-first-failure.test.ts`)
  - `payload-op-under-create` fires before `name-format` on the offending node. (`payload-first-failure.test.ts`)
  - `top-taxon-op` fires before `top-taxon-not-in-tree`. (`payload-top-taxon.test.ts`)
  - DFS pre-order: ancestor-existence failure surfaces before deeper-node existence. (`payload-existence.test.ts`)
- Explicit `payload-op-under-create` tag with positive coverage (rename / detach / no-op nested under add-create all rejected; add-create / add-graft nested under add-create accepted; no-op under add-graft accepted when live edge holds). (`payload-under-create.test.ts`)
- `graft-target-missing` reported as a distinct payload tag at the unit and HTTP layer (cc-only reports the equivalent only as nested-graft 404). (`payload-existence.test.ts`, `post-proposals-payload-errors.test.ts`)
- Validator purity assertions: `src/proposals/payload.ts` must not import the invariant engine / HTTP / store / handlers / serializer. (`payload-first-failure.test.ts`)
- `position` field guaranteed non-empty on every failure tag. (`payload-first-failure.test.ts`, `post-proposals-payload-errors.test.ts`)
- Subtree-anchor top-taxon happy path: top can be a non-root in-tree taxon. (`payload-top-taxon.test.ts`)
- Empty-string `targetRootId` → 400 malformed-body. (`post-proposals-body.test.ts`)
- Explicit positive: `add-graft` with extra `name` field is accepted (name ignored). (`payload-shape.test.ts`)
- Explicit positive: `add-graft` of a taxon already in the same target tree is accepted at submission (acceptance-time concern only). (`payload-existence.test.ts`)
- Per-tag name-format vocabulary check (`empty` / `leading-whitespace` / `trailing-whitespace`) re-emitted verbatim from the taxon-name validator for both rename and add-create. (`payload-name-format.test.ts`)

## Divergent expectations
- Nested op referencing an unknown / non-existent id:
  - cc-only treats it as a submission-time existence error → HTTP 404 (the validator pushes to a downstream existence check). (`proposalsParse.test.ts`, `proposalsPartialPayload.test.ts`)
  - cc-openspec treats it as a payload-validation failure → HTTP 400 with `details.tag = "payload-edge-missing"` (or `graft-target-missing` for add-graft). (`payload-existence.test.ts`, `post-proposals-payload-errors.test.ts`)
  Same input, different verdict (400 vs 404 and tag vs `details.kind`).
- "Top taxon exists but not in target tree":
  - cc-only → HTTP 409 with `details.kind = "top_not_in_tree"`. (`proposalsParse.test.ts`)
  - cc-openspec → HTTP 400 with `details.tag = "top-taxon-not-in-tree"`. (`post-proposals-payload-errors.test.ts`)
  Same input class, different status family (conflict vs validation_error). This is more than wording — the status family itself diverges.
- `targetRootId` unknown / not-a-root:
  - cc-only enforces these as separate first-class checks (404 / 409 with `not_a_root`). (`proposalsParse.test.ts`)
  - cc-openspec has no analogous payload-tag coverage for "targetRootId is not a root"; it only enforces shape (non-empty string). The "not in tree" check substitutes for the unknown-root case via top-taxon reachability. (`post-proposals-body.test.ts`, `payload-top-taxon.test.ts`)
- Detach-with-children:
  - cc-only treats it as a generic 400 ("leaf rule"). (`proposalsParse.test.ts`)
  - cc-openspec classifies it under `payload-op-fields` (per-op field rule). (`payload-shape.test.ts`)
  Verdict matches (rejected); the tag/category differs — borderline non-material.
- `add` with a non-null non-string id:
  - cc-only rejects → 400 (no tag distinction). (`proposalsParse.test.ts`)
  - cc-openspec: no explicit test for `add` with a numeric id; covered for `rename` only via `payload-op-fields`. (`payload-shape.test.ts`)
  Both projects reject some form; cc-only's explicit `add`-id-typing case has no direct analog.

## Shared coverage
- Body envelope shape rules: non-JSON body, non-object body, missing/typed `targetRootId`/`topTaxonId`/`payload`, non-object payload — all rejected. (`proposalsParse.test.ts` ↔ `post-proposals-body.test.ts`)
- Unknown top-level keys on the body are ignored; happy minimal no-op anchored at the root returns 201. (`proposalsParse.test.ts` ↔ `post-proposals-body.test.ts`)
- Op recognition: unknown op token / missing op field / non-object payload node / non-array `children` / non-object child entry — all rejected. (`proposalsParse.test.ts` ↔ `payload-shape.test.ts`)
- Per-op field rules: no-op needs id; rename needs id and name; add-create (`id: null`) needs name; detach needs id; detach must be a leaf; rename id/name must be strings. (`proposalsParse.test.ts` ↔ `payload-shape.test.ts`)
- Top-taxon op-kind constraint: top op = `add` or `detach` is rejected. (`proposalsParse.test.ts` ↔ `payload-top-taxon.test.ts`)
- Top-taxon id alignment: payload root id must equal `topTaxonId`. (`proposalsParse.test.ts` ↔ `payload-top-taxon.test.ts`)
- Name-format failures on rename and add-create (empty / leading whitespace / trailing whitespace). (`proposalsParse.test.ts` ↔ `payload-name-format.test.ts`)
- Unknown extra keys on a payload node are ignored (forward-compat). (`proposalsParse.test.ts` ↔ implicit in cc-openspec shape rules)
- Add-graft happy-path acceptance (graft of an existing taxon from a different owner/tree). (`proposalsParse.test.ts` ↔ `payload-existence.test.ts`)
