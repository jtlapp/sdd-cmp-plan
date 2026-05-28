# auth
> Registered-user gate, X-Username envelope, reviewer authorization.

## Test inventory
- cc-only: 2 files, 15 tests
- cc-openspec: 5 files, 21 tests (3 describe blocks excluded from count where `it` siblings are counted)

## cc-only-only scenarios
- Already-accepted change rejected with 409 / `change_not_queued` state=accepted (`reviewAuth.test.ts`).
- Already-rejected change rejected with 409 / state=rejected (`reviewAuth.test.ts`).
- Latent change accept rejected with 409 / state=latent (`reviewAuth.test.ts`).
- Invalid change (made invalid via reject-propagation) accept rejected with 409 / state=invalid (`reviewAuth.test.ts`).
- Unknown change id on accept/reject → 404 (registered reviewer) (`reviewAuth.test.ts`).
- Malformed X-Username (NBSP-prefixed) on accept/reject → 400 short-circuits before reviewer-auth (`reviewAuth.test.ts`).
- End-to-end chain: malformed X-Username on a protected write route short-circuits at identity layer (400) before write gate (`requireWriter.test.ts`).
- End-to-end chain: unregistered well-formed X-Username on a protected write route → 403 with "unregistered" wording distinct from null-user wording (`requireWriter.test.ts`).

## cc-openspec-only scenarios
- GET /queue gated: null caller → 403, unregistered → 403, registered → 200 with empty queue (`get-queue-auth.test.ts`). Confirms non-reviewers (any registered user) CAN read review-only queue state.
- POST /proposals auth fires before body parsing: null caller + non-JSON body → 403 (not 400) (`post-proposals-auth.test.ts`). Material: pins composition order of gate vs. payload validation.
- POST /proposals empty X-Username → 403 forbidden (treated as null caller, not malformed) (`post-proposals-auth.test.ts`).
- Reviewer-auth unit: deferred reviewer always throws not-reviewer regardless of caller; even when caller matches the parent change id (`reviewer-auth.test.ts`).
- Reviewer-auth unit: details payload tagged `{ tag: "not-reviewer" }` on rejection (`reviewer-auth.test.ts`).
- Gate-isolation unit: `requireRegistered` reads only `c.get('caller')`, never `c.req` (tripwire) (`require-registered.test.ts`).
- Gate envelope: forbidden response carries no `details` key for gate failures (`envelope.test.ts`, `require-registered.test.ts`).
- Gate envelope: rejected username does NOT appear in the error message (`envelope.test.ts`, `require-registered.test.ts`).
- Gate envelope: null vs unregistered share `error.code = forbidden` (differentiable only by message) (`envelope.test.ts`, `require-registered.test.ts`).

## Divergent expectations
- Reviewer authorization on accept/reject is end-to-end HTTP-tested in cc-only (registered non-reviewer → 403 on `/changes/:id/accept|reject`, `reviewAuth.test.ts`); cc-openspec tests the reviewer-match logic only as a pure-unit helper (`reviewer-auth.test.ts`) with no HTTP-level test that a registered non-reviewer is rejected on the accept/reject endpoints. Both agree non-reviewers are rejected; the wiring of that helper into the HTTP path is not asserted in cc-openspec within the auth area.
- Malformed-header → 400 short-circuit before auth: cc-only asserts this at the HTTP layer for both write-gate (`requireWriter.test.ts`) and reviewer routes (`reviewAuth.test.ts`); cc-openspec explicitly documents the path as unreachable via HTTP (HTTP transport normalizes whitespace; see comments in `envelope.test.ts` and `post-proposals-auth.test.ts`) and covers it only in the identity area's middleware unit tests. This is a cross-area boundary decision, not a material auth-semantics divergence — both projects agree malformed input never reaches the gate.

## Shared coverage
- Null caller (missing X-Username) on protected route → 403 forbidden (`requireWriter.test.ts`, `envelope.test.ts`, `require-registered.test.ts`, `get-queue-auth.test.ts`, `post-proposals-auth.test.ts`, `reviewAuth.test.ts`).
- Empty X-Username treated as null caller → 403 (`requireWriter.test.ts`, `post-proposals-auth.test.ts`).
- Unregistered well-formed caller on protected route → 403 forbidden (`requireWriter.test.ts`, `reviewAuth.test.ts`, `envelope.test.ts`, `require-registered.test.ts`, `get-queue-auth.test.ts`, `post-proposals-auth.test.ts`).
- Registered caller on protected route → 200/201 success (`requireWriter.test.ts`, `envelope.test.ts`, `get-queue-auth.test.ts`, `post-proposals-auth.test.ts`).
- Case-variant header for a registered user resolves to canonical stored casing → 200 (`requireWriter.test.ts`, `envelope.test.ts`).
- Reviewer match is case-insensitive and exact-username (concrete reviewer) (`reviewAuth.test.ts` via end-to-end Alice/Bob, `reviewer-auth.test.ts` unit).
- Registered non-reviewer is rejected from review actions (cc-only HTTP via `reviewAuth.test.ts`; cc-openspec unit via `reviewer-auth.test.ts`).
