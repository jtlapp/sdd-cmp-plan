# Critical differences — `cc-only` vs `cc-openspec`

A filter on top of [`SUMMARY.md`](SUMMARY.md). The 15-item ranking there mixes
genuinely functional divergences (auth gates, queue-invalidation classification,
owner storage) with API-surface variation (status-code family, field naming,
internal representation, error-tag granularity). The number of truly critical
functional differences is much smaller. This file:

1. Filters by spec gap — the PRD-ambiguities each implementation had to resolve
   — and classifies how each project resolved them.
2. Calls out coverage gaps where one project tests a PRD-mandated behavior the
   other does not, implying real risk in the unverified implementation.
3. Re-annotates the 15-item ranking with critical / non-critical labels so the
   filter is auditable against the existing analysis.
4. Tallies the result.

Sources: PRD [`prd/prd.md`](../../prd/prd.md), the implementation transcript
summaries [`cc-only/SUMMARY.md`](../cc-only/SUMMARY.md) and
[`cc-openspec/SUMMARY.md`](../cc-openspec/SUMMARY.md), and the 18 per-area test
reports under [`by-area/`](by-area/).

## What counts as critical

A divergence is **critical** if it changes:

- whether a domain action (create / edit / delete / edge change / proposal
  submission / review action) is permitted for a given caller,
- what state mutation occurs (cascade scope, what is deleted vs detached, what
  changes ownership, what casing is stored),
- which changes appear in a reviewer's actionable queue, or what disposition
  the proposer observes,
- whether the system rejects an input that a literal reading of the PRD says it
  should accept (or vice versa).

A divergence is **non-critical** if it is only:

- HTTP status code variation for the same rejection (400 ↔ 409, 404 ↔ 400),
- error tag / message text, or tag granularity (one tag vs two discriminating
  the same domain situation),
- internal representation (`add` derived into one op vs two; tagged-union shape
  for latent reviewers; shape of an internal helper API),
- field naming on responses (`childIds` vs `children`),
- file layout / framework / unit-vs-integration testing style,
- source-grep import-discipline assertions,
- health/version endpoint body.

A coverage gap is critical if the untested behavior is a PRD-mandated rule
whose absence in one project's tests implies plausible-bug risk. A gap in
unit-test coverage of an internal helper is not critical when integration paths
exercise the same logic.

## Critical spec gaps

The PRD has open questions that both implementations had to resolve. Each gap
below is classified one of three ways:

- **Both filled, differently** — a real divergence; verdict given when the PRD
  supports one resolution, "ambiguous" when both are defensible.
- **Only one filled** — the other left the case undefined or its tests don't
  pin a resolution.
- **Both filled, same way** — listed for completeness; not a divergence.

### Gaps both implementations filled — differently

#### G1. Reads auth gate for well-formed-but-unregistered `X-Username`

- **PRD anchor:** §4 declares both "Registration required" (non-null usernames
  must be registered) and "All users (including null) can see all taxa and all
  proposals. There is no read-level access control" — apparently
  contradictory.
- **cc-only:** Identity middleware 403s any well-formed-but-unregistered
  caller before the handler runs, on every endpoint including reads
  ([by-area/identity.md](by-area/identity.md) §divergent #1;
  [by-area/taxa.md](by-area/taxa.md) §divergent "Read endpoints — registration
  gate"). All four read endpoints (`/taxa`, `/taxa/{id}`, `/trees`,
  `/trees/{rootId}`) reject the ghost caller.
- **cc-openspec:** Middleware classifies the same caller as `{kind:'unregistered',
  username:<header>}` and lets the handler decide. Reads are fully open: null,
  unregistered, and registered all receive 200.
- **Verdict:** **cc-openspec aligns better with the PRD.** §4's explicit
  read-openness clause is unconditional; the gate cc-only applies to reads
  contradicts it. cc-only's gate is correct on writes; the bug is the blanket
  application to reads.
- **User-observable consequence:** A ghost client who registers a username
  somewhere else but pings cc-only's read endpoints with a stale name gets a
  403; against cc-openspec the same request succeeds.

#### G2. Failed self-accept disposition (§11.4 case classification)

- **PRD anchor:** §11.4 case 2 ("Self-invalidation by the reviewer. A reviewer's
  own action … causes **another** of that same reviewer's queued changes to
  no longer validate.") auto-dismisses; case 3 (external invalidation) keeps
  the change `invalid` in the queue until dismissed. Where does a failed
  *self* accept belong? — neither case explicitly mentions it.
- **cc-only:** Treats a failed accept as case 2: the change becomes `invalid`
  *and* is removed from the queue; subsequent dismiss returns
  `change_not_in_queue`
  ([by-area/changes-lifecycle.md](by-area/changes-lifecycle.md) §divergent
  "Case 2 (failed accept)").
- **cc-openspec:** Treats a failed accept as case-3-shaped: the change becomes
  `invalid` but stays in the queue; retry returns `change-not-queued`. Case 2
  is reserved strictly for *sibling* changes broken by a successful action.
- **Verdict:** **cc-openspec is more literally correct.** §11.4 case 2 says
  "**another** of that same reviewer's queued changes" — explicitly *not* the
  change the reviewer is acting on. cc-only stretches case 2 to cover the
  acted-on change. The end-state semantics differ for the proposer (in cc-only
  the failed change disappears from queue; in cc-openspec the reviewer must
  dismiss it explicitly).

#### G3. Owner casing stored on POST / PATCH

- **PRD anchor:** §4 says usernames are compared case-insensitively and the
  registry preserves the casing as first registered (per cc-only/SUMMARY.md
  P2 — both projects agreed). §15.3 doesn't pin which casing the
  taxon's `owner` field carries after `POST /taxa` with header `alice`
  against registered `Alice`.
- **cc-only:** Stores `X-Username` verbatim. Header `alice` → `owner:"alice"`,
  even when the registered form is `Alice`
  ([by-area/taxa.md](by-area/taxa.md) §divergent "Owner casing on writes").
- **cc-openspec:** Canonicalizes to the registry's stored form. Header
  `alice` → `owner:"Alice"`.
- **Verdict:** **cc-openspec is more defensible.** Per §4 the registry is the
  source of truth for canonical casing. cc-only's verbatim storage means the
  same logical user can appear under several spellings of the `owner` field
  depending on how individual requests were cased. cc-openspec keeps one
  canonical spelling per user across all taxa, matching the registry's
  contract.
- **User-observable consequence:** A read endpoint sees different `owner`
  strings against the two implementations for the same user.

#### G4. `shared` predicate exposure on reads (§3.3 vs §15.2)

- **PRD anchor:** §3.3 defines `shared` (taxon reachable from more than one
  root) as a domain predicate. §15.2 lists read-response fields explicitly as
  "id, name, owner, child IDs, parent IDs" — `shared` is **not** listed.
- **cc-only:** Does not expose shared-ness in any read response
  ([by-area/taxa.md](by-area/taxa.md) §divergent "Response shape — `shared`
  field").
- **cc-openspec:** Exposes a derived `shared: boolean` on `/taxa`,
  `/taxa/{id}`, and per-node inside `/trees/{rootId}`.
- **Verdict:** **cc-only matches §15.2 literally; cc-openspec extends the API
  with a useful derived field.** Both are defensible — the PRD's read field
  list is enumerative, not necessarily exhaustive. Mark as **ambiguous**.
- **User-observable consequence:** Clients can read shared-ness directly from
  cc-openspec's response; against cc-only they must compute it from
  `parentIds.length` and cross-reference reachability.

#### G5. Submission-time existence checks on payload ids

- **PRD anchor:** §9.2 (top must exist), §10.2 (existence vs decision
  dependencies), §11.3 (queue-after-deps), §10.3 (acceptance-time validation
  against full tree) give conflicting signals about where in the pipeline a
  payload id that doesn't currently exist gets rejected.
- **cc-only:** Required every non-add-create id to exist *for routing
  purposes*, deferring deeper existence checks to acceptance time
  ([cc-only/SUMMARY.md](../cc-only/SUMMARY.md) Phase 5 critical;
  [by-area/proposals-payload.md](by-area/proposals-payload.md) §divergent
  "Nested op referencing an unknown id"). An unknown nested id → 404.
- **cc-openspec:** Required the entire dependency tree to be valid at
  submission, returning 400 with explicit tags
  (`payload-edge-missing`, `graft-target-missing`)
  ([cc-openspec/SUMMARY.md](../cc-openspec/SUMMARY.md) Phase 5 critical).
- **Verdict:** **Ambiguous.** Both readings are consistent with the PRD's
  collection of submission-time signals; the PRD genuinely doesn't pick.
  Note: the *status family* divergence (404 vs 400) is non-critical per the
  filter rules, but the underlying **rule** ("which existence failures are
  caught at submission") *is* different and could cause a proposal that
  succeeds in submission against one impl to fail submission against the
  other.

#### G6. Latent rename + ownership reassignment routing (§6.2 / §14 / §11.4 case 3)

- **PRD anchor:** §6.2/§14 say ownership reassignment is unilateral and has
  no side effects on queued changes; §11.4 case 3 enumerates triggers that
  externally invalidate queued changes but does **not** list "direct
  ownership reassignment." What happens to a queued or latent change whose
  reviewer's identity is tied to a taxon whose owner just changed?
- **cc-only:** Tests promotion-time re-resolution of a **latent** rename:
  after `PATCH /taxa owner: Bob` on the renamed taxon, when the rename is
  promoted (its outer add-create accepted), it is routed to **Bob**, not the
  original owner ([by-area/integration.md](by-area/integration.md) §cc-only-only
  #1; §divergent #1).
- **cc-openspec:** Tests sticky routing of an **already-queued** rename:
  `PATCH owner` does not move the change and does not invalidate it.
- **Verdict:** **Not strictly contradictory** — the two projects test *different
  states* of the same change (latent vs already-queued). But the projects
  imply different mental models: cc-only "reviewer resolves at promotion,"
  cc-openspec "reviewer is locked at queueing." A combined test — does an
  already-queued change re-route on owner change? does a latent change at
  promotion re-route? — appears in **neither** project. The combined
  behavior is genuinely under-tested in both. Mark as **ambiguous**, but
  flag the missing combined test as a real coverage gap.

### Gaps only one implementation filled

#### G7. Same id at multiple payload positions

- **PRD anchor:** PRD doesn't say whether the same taxon id may appear at two
  distinct positions in one proposal payload (e.g. a rename and a detach of
  the same taxon at different anchors).
- **cc-openspec:** Explicitly tested and allowed; each position is a distinct
  change with its own `changeId`
  ([cc-openspec/SUMMARY.md](../cc-openspec/SUMMARY.md) Phase 5 critical
  decision #12).
- **cc-only:** No test pins a verdict.
- **Verdict:** **Only cc-openspec filled.** cc-only's behavior may or may not
  match (likely does, by virtue of the change-derivation walk; not asserted).

#### G8. In-tree diamond rendering on GET /trees/{rootId} (when one slips in)

- **PRD anchor:** §3.3 invariant 2 forbids in-tree diamonds, so this is a
  degenerate / hypothetical state. Neither project should normally produce
  one. But test fixtures *did* construct one for testing the read endpoint.
- **cc-only:** Renders the second visit as a `{id}` stub
  ([by-area/taxa.md](by-area/taxa.md) §cc-only-only #2).
- **cc-openspec:** Renders the second visit as a full repeat with
  `shared: true`.
- **Verdict:** **Only one filled meaningfully.** Edge case on a degenerate
  state; non-critical for the domain, but each project's choice differs in
  payload shape under that state.

### Gaps both implementations filled — the same way

For completeness; these are areas where both implementations converged on the
same resolution to a PRD ambiguity. Not divergences.

| Gap | PRD anchor | Joint resolution |
|---|---|---|
| Reject-propagation scope | §12.3 vs §11.4 case 1 | Only `add`/`add-graft` rejection cascades; rename/detach rejection affects only the one change. |
| Cascade atomicity | §12.2 vs §15.5 contradiction | Full atomic rollback on mid-cascade failure (cc-only via errata, cc-openspec inherited the fix). |
| §6.3 precondition 1 "shared" definition | §6.3 | Full reachability, not the parent-count shortcut. |
| Invariant API style (snapshot vs delta) | brief ambiguity | Snapshot-first; delta is a wrapper. |
| no-op disposition literal value in status view | §11.5 | Both chose `"structural"`. |
| Existence-dep failure at promotion | §11.3 | Both: mark the dependent invalid (cc-only after user pushback; cc-openspec by initial design). |
| `add-create` → accepting reviewer becomes owner | §12.1 | Confirmed by both end-to-end. |

## Critical coverage gaps

Cases where one project's tests pin a PRD-mandated behavior that the other
does not exercise. These are not behavioral divergences — both implementations
*may* do the right thing — but the unverified side has no proof that it does.

### Gaps in cc-only's coverage

- **§6.3 owner-scoped deletion region at the pure-domain layer.** cc-openspec
  tests `ownerScopedRegion(g, n, owner)` with halt-frontier semantics,
  multi-frontier entries, the case where a halt-frontier child is also
  reachable via a separate wholly-owned path, cyclic-graph safety, and
  non-mutation of input
  ([by-area/domain.md](by-area/domain.md) §cc-openspec-only "Owner-scoped
  region"). cc-only exercises §6.3 only through the DELETE endpoint and a
  `planDeletion` integration test, not as a pure-domain unit. **Risk:** if
  cc-only's region algorithm has a subtle halt-frontier bug (e.g. mishandling
  a multi-path halt frontier), the integration tests would only catch it if
  they happen to exercise that exact shape.
- **Lazy-evaluation purity at reads.** cc-openspec's
  `phase-7-lazy-evaluation.test.ts` explicitly asserts that 5× `GET /queue`
  and 5× `GET /proposals/{id}` do **not** transition queued→invalid; reads
  are observably pure. cc-only relies on reads as triggers for lazy
  re-evaluation but never asserts the negative — a future regression that
  makes a read mutate disposition would not be caught.

### Gaps in cc-openspec's coverage

- **Full end-to-end Appendix A.1/A.2 lifecycle through accept→reject→dismiss.**
  cc-only's `reviewIntegration.test.ts` and `phase7Integration.test.ts` walk
  both worked examples through the full lifecycle: submission → routing →
  cascade-accept → reject → case-3 invalidation → manual dismiss → reset.
  cc-openspec breaks the same behavior into many smaller unit tests but
  never composes a single test that exercises an A.1/A.2 happy path through
  all phases ([by-area/proposals-end-to-end.md](by-area/proposals-end-to-end.md)).
  **Risk:** sequencing or state-machine bugs that only surface across many
  steps go uncovered.
- **HTTP-boundary concurrency on every mutating route.** cc-only's
  `writeSerialization.test.ts` proves the write lock is wired to `/taxa`
  POST/PATCH, `/reset`, `/proposals`, `/changes/.../accept`, and
  `/changes/.../accept-cascade`. cc-openspec proves the lock primitive in
  isolation (`write-lock.test.ts`) but does **not** prove it is wired to the
  HTTP handlers ([by-area/concurrency.md](by-area/concurrency.md)). **Risk:**
  a route that forgets to wrap its mutation in `withWriteLock` would pass
  cc-openspec's tests.
- **Auto-dismiss-on-failed-accept invariant end-to-end.** Tied to G2 above:
  cc-only's interpretation (case 2, auto-dismiss) is asserted end-to-end;
  cc-openspec's interpretation (case 3, keep in queue) is asserted. The PRD
  reading favors cc-openspec, but if you believe cc-only's interpretation,
  cc-openspec has no coverage of the auto-dismiss path.

## Behavioral-divergence appendix — re-annotation of the 15-item ranking

Reproducing the SUMMARY.md table with critical / non-critical labels per the
filter rules above. Cross-references to the spec-gap section use the G#.

| Rank | Scenario | Critical? | Maps to | Reason |
|---|---|---|---|---|
| 1 | Identity middleware on unregistered caller | **CRITICAL** | G1 | Changes whether a caller can read taxa/proposals. |
| 2 | §11.4 case classification on failed self-accept | **CRITICAL** | G2 | Changes whether the failed change stays in queue or auto-dismisses. |
| 3 | `GET /taxa/{id}` response shape (`shared`, naming) | **PARTIAL** | G4 | `shared` field is critical (domain predicate exposure); `childIds` vs `children` naming is API-shape only. |
| 4 | Reads auth gate (parallel to #1) | **CRITICAL** | G1 | Same as #1. |
| 5 | Owner casing on POST/PATCH | **CRITICAL** | G3 | Changes stored state for `owner`. |
| 6 | Composite invariant violation report ordering | NON-CRITICAL | — | Order of error list; same violations reported. cc-openspec adds a stability guarantee but neither side conflicts with PRD. |
| 7 | Payload `add` → `add-create`/`add-graft` split | NON-CRITICAL | — | Internal representation; routing, dependency rules, and outcomes identical. |
| 8 | Latent-rename reviewer shape (tagged union) | NON-CRITICAL | — | Internal data shape; both correctly exclude latent from any queue. |
| 9 | Top-not-in-tree: 409 vs 400 | NON-CRITICAL | — | Status-family variation for same rejection. Border case; filtered. |
| 10 | Nested unknown id: 404 vs 400 (+ G5) | PARTIAL | G5 | Status family is non-critical; the underlying *rule* (when to reject) is G5, ambiguous. |
| 11 | Latent rename after ownership reassignment | **CRITICAL** (ambiguous) | G6 | Different framings of routing semantics; combined behavior untested in both. |
| 12 | `/health` body (version field) | NON-CRITICAL | — | Out-of-domain endpoint. |
| 13 | Username empty/null tri-state vs binary in validator | NON-CRITICAL | — | Internal validator API; both correctly classify empty as null caller and reject leading/trailing whitespace. |
| 14 | Queue ordering FIFO vs determinism-only | NON-CRITICAL | — | PRD silent. cc-only pins a stricter contract; cc-openspec's weaker contract doesn't conflict. |
| 15 | Dismiss error tag granularity | NON-CRITICAL | — | Error-tag count for same domain situation; behavior identical. |

**Critical count:** 5 fully critical (ranks 1, 2, 4, 5, 11) + 2 partial (ranks
3, 10 — the parts that map to G4 and G5).

## Tally

### Spec-gap resolutions

| Outcome | Count | Items |
|---|---|---|
| Both filled, same way | 7 | reject-propagation scope; cascade atomicity; §6.3 precondition 1; invariant API style; structural-disposition literal; existence-dep at promotion; add-create ownership |
| Both filled, differently — cc-only more PRD-correct | 0 | — |
| Both filled, differently — cc-openspec more PRD-correct | 3 | G1 (reads auth), G2 (failed-accept case 2 vs 3), G3 (owner casing) |
| Both filled, differently — genuinely ambiguous | 3 | G4 (`shared` exposure), G5 (submission-time existence rule), G6 (ownership-reassignment routing — different scenarios tested) |
| Only cc-only filled | 0 | — |
| Only cc-openspec filled | 2 | G7 (same id at multiple positions), G8 (in-tree diamond rendering) |

### Critical coverage-gap count

| | Count | Items |
|---|---|---|
| Critical PRD behaviors tested only in cc-only | 2 | full A.1/A.2 lifecycle end-to-end; HTTP-boundary concurrency on every mutating route |
| Critical PRD behaviors tested only in cc-openspec | 2 | §6.3 owner-scoped region as a pure-domain unit; lazy-evaluation read-purity negative assertions |

## Verdict

The two implementations agree on the great majority of PRD behavior. The
SUMMARY.md ranking lists 15 "material" divergences, of which **5 are genuinely
critical** (rows 1, 2, 4, 5, 11), **2 are partially critical** (rows 3, 10),
and **8 are API-surface variation** that doesn't change what the system does
for any caller.

Of the 5 fully critical divergences, cc-openspec is more PRD-correct on 3
(reads auth gate, failed-accept disposition, owner casing) and matches cc-only
on the rest. cc-only is not the more PRD-correct side on any unambiguous
critical divergence. The two partially-critical items (G4, G5) and the
ownership-reassignment routing (G6) are genuine PRD ambiguities; ambiguous
items do not tilt the score.

Coverage gaps are evenly split: each project has two unverified PRD-mandated
behaviors that the other tests. cc-only's gaps are in pure-domain unit
coverage (`§6.3 region`, lazy-eval purity); cc-openspec's gaps are in
HTTP-wired end-to-end coverage (full A.1/A.2 lifecycle, route-level
concurrency). The two projects pay for their respective testing philosophies
in symmetric ways.

**Net result: cc-openspec is the more PRD-correct implementation on the
critical functional divergences.** The margin is real but slim — 3 wins on
critical correctness, 0 losses on critical correctness, with the rest tied or
genuinely ambiguous. The headline 15-item divergence list overstates how far
apart the implementations actually are.
