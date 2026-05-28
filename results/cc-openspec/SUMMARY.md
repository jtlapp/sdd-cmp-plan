# Summary — Claude Code + OpenSpec (with OpenLore drift)

Quantitative engagement and spec-issue summary across the seven phase transcripts (`cc-openspec-phase-{1..7}.txt`). Counts and problem lists derived from the transcripts themselves; see the counting definitions at the bottom of this document.

## Engagement metrics

| Metric | P1 | P2 | P3 | P4 | P5 | P6 | P7 | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (a) Prompts from Claude Code | 5 | 6 | 3 | 5 | 5 | 10 | 6 | 40 |
| (b) Topics presented for discussion | 20 | 18 | 8 | 9 | 31 | 33 | 22 | 141 |
| (c) Topics user provided input on | 16 | 11 | 5 | 6 | 19 | 14 | 9 | 80 |
| (d) Problems raised | 3 | 2 | 3 | 3 | 12 | 4 | 5 | 32 |
| (e) Problems user answered | 3 | 2 | 0 | 2 | 12 | 4 | 5 | 28 |
| (f) Critical problems raised | 0 | 0 | 1 | 2 | 7 | 3 | 2 | 15 |
| (g) Critical problems user answered | 0 | 0 | 1 | 2 | 7 | 3 | 2 | 15 |

## Problems raised, by phase

### Phase 1 — Scaffold, error model, format validators
- **Validator/error-code coupling undefined** — §3.4 fixes the validator rule and §15.6 fixes the error code, but the spec is silent on whether the validator itself produces §15.6 codes or just a yes/no/why result that the error helper maps to a code; this determines whether validators are reusable outside HTTP.
  *Resolution:* User directed validators to NOT produce error codes — mapping happens only at the HTTP-response boundary. (user-provided)
- **§15.6 has no 5xx code** — §15.6 enumerates only 400/403/404/409, so an unhandled non-ApiError throw has no documented envelope/status; without a fix the envelope contract leaks at unexpected throws.
  *Resolution:* User delegated; CC introduced an `internal_error` code at 500 in the error-model spec and called this out as a §15.6 extension. (CC-proposed, user accepted via delegation)
- **Health endpoint name unspecified** — the Phase 1 brief asks for "a health/version endpoint" without naming the path or body shape.
  *Resolution:* User delegated; CC chose `GET /health` returning `{ status: "ok", version }` and wrote it into the spec. (CC-proposed, user accepted via delegation)

### Phase 2 — Users, identity, registry
- **Quartet elided to trichotomy in Phase 2 brief** — the brief describes "null/malformed/registered" but omits the well-formed-unregistered case, which §4 and §15.6 spell out as 403; the brief's classification is incomplete relative to the PRD.
  *Resolution:* Make the four-way classification explicit in the spec (decision #9). (CC-proposed, user accepted via "whatever")
- **PRD under-specifies header-format-check scope for open endpoints** — PRD gives three exemption levels (full exemption for /reset, "open" for POST/GET /users, full §4 gate for writes) but does not disambiguate whether POST /users and GET /users are exempt from the malformed-header 400 or only from the registered-caller requirement.
  *Resolution:* Header format check is global; POST /users and GET /users still 400 on malformed X-Username; only POST /reset is fully exempt. (user-provided — "lock it in")

### Phase 3 — Domain model and invariant engine
- **Snapshot vs. delta invariant API ambiguous** — (CRITICAL) brief says "given a candidate state or a proposed change," which are quite different API shapes; spec doesn't pin which.
  *Resolution:* CC chose snapshot-first with thin delta wrappers. (CC-proposed, user accepted)
- **`shared` not surfaced by §15.2 despite being a §3.3 predicate** — `shared` is a defined domain predicate in §3.3 but §15.2's read fields don't include it; spec gap on whether read responses should expose it.
  *Resolution:* CC added `shared` to per-taxon response shape. (CC-proposed, user accepted)
- **ID generation and reset behavior unspecified** — spec needs to commit to monotonic counter behavior and reset-zeros-it so Phase 4+ can rely on it.
  *Resolution:* CC pinned it in the new `taxon-domain` spec (monotonic `t${n}`, reset to 1). (CC-proposed, user accepted)

### Phase 4 — Direct owner actions
- **"Shared" precondition definition (§6.3 precondition 1)** — (CRITICAL) operational meaning of "no taxon in the deletion region is reachable from more than one root" is ambiguous; a tempting parent-count > 1 shortcut quietly differs from the PRD's stated property when fan-out occurs above N.
  *Resolution:* User confirmed intent ("avoid cascade-deleting an item reachable from more than one root"); CC ruled out the shortcut and committed to using `isShared` to match PRD wording. (user-provided)
- **Edge-add subtree validation gap (§6.4)** — (CRITICAL) whether the Phase 3 invariant engine's `checkAddEdge` actually validates across the child's whole live subtree when the edge is added, or only treats the child as a leaf.
  *Resolution:* CC verified the engine builds a candidate Graph that includes c's existing subtree and walks from every root — no gap exists; Phase 4 tests should still explicitly exercise subtree cases. (CC-proposed, user accepted by moving on)
- **Unregistered-owner status-code gap (§15.6)** — §15.6's status-code mapping has no clean home for "PATCH-supplied new owner is well-formed but not registered" — not 400 (not malformed), not 403 (caller is fine), not 404 (users not listed), not 409 (not a conflict).
  *Resolution:* 400 validation_error with tag `unregistered-owner`. (user-provided)

### Phase 5 — Proposal submission
- **Existence checks at submission vs deferred** — (CRITICAL) §9.2, §10.2, §11.3, and §11.4 give conflicting signals about whether non-top existence is validated at submission or recorded as a dependency for later.
  *Resolution:* User picked routing snapshot at submission; missing target → 400. (user-provided)
- **Shape-error vs existence-dependency boundary** — (CRITICAL) PRD does not draw an explicit line between "malformed payload → 400" and "well-formed but its existence dependency may never resolve."
  *Resolution:* User directed that the entire dependency tree must be valid at submission, returning 400 otherwise. (user-provided)
- **Status view no-op disposition value** — §11.5 says no-ops carry "a disposition indicating they are structural" without naming the literal value.
  *Resolution:* User chose `"structural"`. (user-provided)
- **Change-ID assignment for creates** — payload has no taxon ID for `add-create`; PRD doesn't say how reviewers reference such a change.
  *Resolution:* User accepted CC's server-assigned global `changeId` field present on every operative node. (CC-proposed, user accepted)
- **Reviewer field shape for latent-under-create** — PRD doesn't specify how to surface a reviewer whose identity depends on a not-yet-accepted parent create.
  *Resolution:* User chose `reviewer: null` in status view while latent-under-create. (user-provided)
- **POST /proposals 201 body shape** — §15.4 only says "proposal ID and initial status tree" without specifying the envelope.
  *Resolution:* User accepted same shape as GET /proposals/{id}. (user-provided)
- **Reason field on status nodes** — (CRITICAL) §11.5 mentions a reason for negative states, but Phase 5 never produces them.
  *Resolution:* User directed shaping the field now. (user-provided)
- **GET /proposals list shape and additional filters** — §15.2 only says "optionally filterable by proposer" without specifying entry fields, ordering, pagination, or other filters.
  *Resolution:* User accepted lean entries with `?proposer=` and `?targetRootId=` filters. (user-provided)
- **§3.3 global invariants at submission** — (CRITICAL) PRD doesn't explicitly say whether cycle/duplicate/clash invariants are checked at submission or only at acceptance.
  *Resolution:* User confirmed acceptance-time only per §10.3. (user-provided)
- **Detach's existence dependency — taxon vs edge** — (CRITICAL) PRD's "currently exist at that position" language is ambiguous about whether detach checks just the taxon or the parent→child edge.
  *Resolution:* User confirmed edge check. (user-provided)
- **Rename's existence requirement — strict vs unified reading** — (CRITICAL) §10.2 literally classifies only path ancestors as existence deps; doesn't say whether rename's own payload-position edge must exist.
  *Resolution:* User chose unified reading (every operative-node-with-id requires its payload-parent edge). (user-provided)
- **Same id at multiple payload positions (rename + detach of same id)** — (CRITICAL) PRD doesn't say whether the same taxon id may appear at distinct payload positions, nor how to disambiguate the resulting changes.
  *Resolution:* Allowed; each operative position is a distinct change with its own changeId. (CC-proposed, user accepted)

### Phase 6 — Single review loop
- **Failed-accept disposition undefined** — (CRITICAL) brief says an accept that fails revalidation "simply fails with a reason," but doesn't specify whether the change stays queued, transitions to invalid, or something else.
  *Resolution:* Transition to invalid, store reason, keep in queue (case-3-shaped lazy). (user-provided)
- **Existence-dep failure at promotion undefined** — (CRITICAL) §11.3 says promote "provided existence dependencies also currently hold" but is silent on what happens when they don't; §11.4 case 1 doesn't cover the case either.
  *Resolution:* Transition to invalid, extending §11.4 case 1 by analogy. (user-provided)
- **§12.3 vs §11.4 case 1 phrasing tension** — (CRITICAL) §12.3 says rejecting a change makes "all payload descendants invalid" without qualification, while §11.4 case 1 restricts cascade to add/graft-ancestor rejection.
  *Resolution:* Adopt dep-model interpretation — only add/graft rejection cascades; rename/detach reject affects only the one change. (CC-proposed, user accepted)
- **Reject body reason field unspecified** — §15.5 lists POST /changes/{id}/reject with no body schema, while §11.5 mentions an optional human-readable reason on rejected/invalid.
  *Resolution:* Accept optional `{ reason?: string }` body with a fixed default reason when omitted. (user-provided)

### Phase 7 — Cascade, invalidation, integration
- **Proposer-status poll not named as a lazy-evaluation trigger** — (CRITICAL) §11.4 names reviewer reads and actions as triggers but is silent on whether proposer polls (§11.5) also trigger re-evaluation, leaving the proposer view's freshness undefined.
  *Resolution:* User chose to allow the proposer view to lag reality. (user-provided)
- **§11.4 doesn't specify whether invalid markings are persisted or computed on read** — lazy-evaluation wording leaves the storage model unspecified.
  *Resolution:* User directed CC to pick the simpler implementation; CC then chose persist-on-detection. (user-provided)
- **Direct ownership reassignment missing from §11.4 case-3 trigger enumeration** — (CRITICAL) the case-3 enumeration lists edit/delete/edge-change/cross-proposal-accept but omits §14 ownership reassignment, leaving its invalidation impact undefined.
  *Resolution:* User stated owner is not part of validity state, so ownership change cannot invalidate; CC then separately resolved the routing half as sticky. (user-provided)
- **§12.2 cascade-failure "reason" shape underspecified** — PRD says only "a reason identifying the failure" without defining whether it is a string or a structured object.
  *Resolution:* User said "a string is fine — keep it simple." (user-provided)
- **§11.4 side-effect walk scope unbounded by proposal** — CC initially scoped the walk to the actor's proposal; user's challenge ("Suppose a reviewer has multiple independent proposal trees…") exposed that the spec's "queued changes that could be affected" implicitly requires a global walk across proposals/proposers/reviewers, which §11.4 doesn't explicitly state.
  *Resolution:* User raised the challenge; CC reformulated the rule as a single global walk with one case-2/case-3 predicate; user then said "let's move on to the proposal," implicitly accepting the corrected formulation. (user-provided)

## Counting definitions

- **(a) Prompts from Claude Code** — distinct CC turns that asked the user any question or invited input. A single turn with five sub-questions = 1 prompt.
- **(b) Topics presented for discussion** — every distinct topic AND nested sub-bullet CC raised for the user to weigh in on. A topic with three nested sub-points counts as 4 (1 parent + 3 children).
- **(c) Topics user provided input on** — subset of (b) the user's reply explicitly addressed.
- **(d) Problems raised** — spec issues only: gaps, ambiguities, inconsistencies, or contradictions in the PRD or phase brief. Implementation issues and pure design-preference questions are not counted.
- **(e) Problems user answered** — subset of (d) where the user's reply gave a resolution or direction.
- **(f) Critical problems raised** — subset of (e) where the problem's resolution has a material impact on functionality.
- **(g) Critical problems user answered** — subset of (f) where the user's reply gave a resolution or direction.
