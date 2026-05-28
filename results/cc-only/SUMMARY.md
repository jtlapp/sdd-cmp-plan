# Summary — Vanilla Claude Code (with `/plan`)

Quantitative engagement and spec-issue summary across the seven phase transcripts (`cc-only-phase-{1..7}.txt`). Counts and problem lists derived from the transcripts themselves; see the counting definitions at the bottom of this document.

## Engagement metrics

| Metric | P1 | P2 | P3 | P4 | P5 | P6 | P7 | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| (a) Prompts from Claude Code | 2 | 2 | 1 | 3 | 1 | 2 | 5 | 16 |
| (b) Topics presented for discussion | 8 | 5 | 8 | 6 | 7 | 5 | 16 | 55 |
| (c) Topics user provided input on | 1 | 5 | 0 | 5 | 0 | 4 | 10 | 25 |
| (d) Problems raised | 1 | 4 | 6 | 4 | 7 | 4 | 1 | 27 |
| (e) Problems user answered | 0 | 4 | 0 | 4 | 0 | 4 | 1 | 13 |
| (f) Critical problems raised | 0 | 0 | 1 | 0 | 2 | 3 | 1 | 7 |
| (g) Critical problems user answered | 0 | 0 | 1 | 0 | 2 | 3 | 1 | 7 |

## Problems raised, by phase

### Phase 1 — Scaffold, error model, format validators
- **§15.6 has no 5xx code** — the PRD error-code mapping enumerates only 400/403/404/409, leaving unhandled-exception (500) responses outside the documented envelope contract.
  *Resolution:* CC self-resolved inline by emitting the envelope under a new `internal_error` code at 500; the user was never asked. (CC-proposed, user accepted tacitly)

### Phase 2 — Users, identity, registry
- **POST /users §15.1 vs §4 conflict** — §15.1 says POST /users is "open to all (no authentication)" but §4 says every non-null username must be confirmed against the registry; the two collide on POST /users with a well-formed but unregistered X-Username.
  *Resolution:* Skip the registry check on POST /users (bootstrap carve-out). (CC-proposed, user accepted)
- **Scope of malformed X-Username format check** — §4 says malformed X-Username is rejected as a validation error but doesn't say whether that check applies on every endpoint (including reads open to all) or only on endpoints needing a non-null user.
  *Resolution:* Apply format check universally on all endpoints except /reset. (CC-proposed, user accepted)
- **Undefined response shapes for /users endpoints** — PRD doesn't pin the JSON response shapes for POST /users or GET /users.
  *Resolution:* POST returns `{username: "Alice"}`; GET returns `{users: ["Alice", "Bob"]}`. (CC-proposed, user accepted)
- **Registry casing semantics underspecified** — PRD specifies lookups are case-insensitive but doesn't say what casing the registry stores or lists.
  *Resolution:* Preserve the casing as first registered. (CC-proposed, user accepted)

### Phase 3 — Domain model and invariant engine
- **GET /trees/{rootId} JSON shape unspecified** — §15.2 names fields but doesn't pin the JSON shape (nested vs. flat list) for the per-tree response.
  *Resolution:* CC defaulted to recursive nested. (CC-proposed, user accepted)
- **GET /trees per-entry shape unspecified** — §15.2 doesn't pin whether each tree entry uses the full taxon field set or a smaller `{rootId, name, owner}`.
  *Resolution:* CC defaulted to full taxon shape with empty parentIds. (CC-proposed, user accepted)
- **/trees/{id} for non-root taxon undefined** — spec doesn't say whether requesting a tree by a non-root taxon ID is 404 or returns a subtree.
  *Resolution:* CC defaulted to 404. (CC-proposed, user accepted)
- **Child ordering unspecified** — §3.1 declares children "unordered" in the model, but JSON serialization must pick an order; spec silent.
  *Resolution:* CC defaulted to insertion order. (CC-proposed, user accepted)
- **Invariant-module API shape ambiguous** — (CRITICAL) brief says "given a candidate state or a proposed change" without specifying which (state-based vs. change-shaped probes).
  *Resolution:* CC defaulted to state-based only. (CC-proposed, user accepted)
- **`shared` predicate exposure inconsistency** — §3.3 defines `shared` as a domain predicate but §15.2's read field list omits it.
  *Resolution:* CC kept it off the read surface, exposed internally only. (CC-proposed, user accepted)

### Phase 4 — Direct owner actions
- **PATCH with empty body** — PRD doesn't specify the response when PATCH /taxa/{id} is called with `{}` (no name, no owner).
  *Resolution:* 400 validation_error. (CC-proposed, user accepted)
- **PUT existing edge** — spec doesn't define behavior when PUT /taxa/{parentId}/children/{childId} is called and the edge already exists.
  *Resolution:* 204 idempotent no-op. (CC-proposed, user accepted)
- **DELETE missing edge** — spec doesn't define behavior when DELETE on an edge is called and both taxa exist but no edge between them exists.
  *Resolution:* 404 not_found. (CC-proposed, user accepted)
- **DELETE taxon success response** — spec doesn't specify the success status code for DELETE /taxa/{id}.
  *Resolution:* 204 No Content. (CC-proposed, user accepted)

### Phase 5 — Proposal submission
- **`topTaxonId` vs `topNodeId` naming** — §15.4 and brief say `topTaxonId` but Appendix A examples use `topNodeId`; the on-the-wire field is undefined.
  *Resolution:* CC chose `topTaxonId`, treating appendix as non-normative typo. (CC-proposed, user accepted tacitly)
- **payload.id vs topTaxonId equality** — PRD does not state whether `payload.id` must equal `topTaxonId`.
  *Resolution:* CC required equality (400 otherwise). (CC-proposed, user accepted tacitly)
- **Submission-time existence-check scope** — (CRITICAL) PRD doesn't explicitly say which id-existence checks happen at submission vs deferred to acceptance.
  *Resolution:* CC required every non-add-create id to exist for routing, deferring deeper existence-dependency checks to §10.3. (CC-proposed, user accepted tacitly)
- **Disposition value for no-op in §11.5 status view** — §11.5 calls for a disposition meaning "structural and produces no change" without naming the literal value.
  *Resolution:* CC chose literal string `"structural"`. (CC-proposed, user accepted tacitly)
- **POST /proposals 201 response body shape** — §15.4 only says "the proposal ID and its initial status tree" without specifying envelope fields.
  *Resolution:* CC returned same shape as GET /proposals/{id}. (CC-proposed, user accepted tacitly)
- **GET /proposals filter form** — §15.2 says "optionally filterable by proposer" without specifying query parameter form or case handling.
  *Resolution:* CC chose `?proposer=<username>` matched via registry's canonical form. (CC-proposed, user accepted tacitly)
- **GET /queue invalid-awaiting-dismiss in Phase 5** — (CRITICAL) §15.2 mentions including the invalid-awaiting-dismiss sub-state, but that state cannot arise in Phase 5.
  *Resolution:* CC scoped Phase 5 queue to truly-queued changes only, deferring the sub-state to Phase 7. (CC-proposed, user accepted tacitly)

### Phase 6 — Single review loop
- **Reject-propagation scope** — (CRITICAL) §12.3 says "all payload descendants become invalid" but cites §11.4 case 1, which only describes add/graft-ancestor rejection; ambiguous whether rename/detach rejection cascades.
  *Resolution:* Only add/graft rejection cascades; rename/detach rejection does not. (CC-proposed, user accepted)
- **Acceptance-failure state transition** — (CRITICAL) brief says "fails with a reason" but doesn't specify the resulting state of a change whose accept fails validation.
  *Resolution:* 409 conflict, change stays in queued state, no transition. (CC-proposed, user accepted)
- **Promotion when existence dep has broken** — (CRITICAL) §11.3 says promote "provided existence dependencies also currently hold" but is silent on what happens when they don't.
  *Resolution:* User pushed back on CC's initial "leave latent"; CC then changed to mark invalid and recursively invalidate descendants. (user-provided)
- **Non-queued accept/reject status code** — spec doesn't explicitly say which HTTP code to return when acting on a change that exists but isn't queued (latent/accepted/rejected).
  *Resolution:* 409 conflict, reserving 403 for non-reviewer. (CC-proposed, user accepted)

### Phase 7 — Cascade, invalidation, integration
- **§12.2 vs §15.5 contradiction on cascade atomicity** — (CRITICAL) PRD §12.2 specifies atomic full-rollback on cascade failure while §15.5 describes partial-commit semantics; both cannot be correct. (This is planted Defect 1 from `defects.md`.)
  *Resolution:* User provided exact replacement wording for §15.5 and directed CC to record the correction in a new `prd/prd-errata.md` rather than editing the PRD. (user-provided)

## Counting definitions

- **(a) Prompts from Claude Code** — distinct CC turns that asked the user any question or invited input. A single turn with five sub-questions = 1 prompt.
- **(b) Topics presented for discussion** — every distinct topic AND nested sub-bullet CC raised for the user to weigh in on. A topic with three nested sub-points counts as 4 (1 parent + 3 children).
- **(c) Topics user provided input on** — subset of (b) the user's reply explicitly addressed.
- **(d) Problems raised** — spec issues only: gaps, ambiguities, inconsistencies, or contradictions in the PRD or phase brief. Implementation issues and pure design-preference questions are not counted.
- **(e) Problems user answered** — subset of (d) where the user's reply gave a resolution or direction.
- **(f) Critical problems raised** — subset of (e) where the problem's resolution has a material impact on functionality.
- **(g) Critical problems user answered** — subset of (f) where the user's reply gave a resolution or direction.
