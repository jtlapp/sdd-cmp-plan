# users
> POST /users (registration), GET /users (listing).

## Test inventory
- cc-only: 2 files, 34 tests
- cc-openspec: 2 files, 32 tests (20 `it` in `http.test.ts` + 12 `it` in `store.test.ts`)

## cc-only-only scenarios
- Caller-identity coverage at the POST /users endpoint: unregistered-but-well-formed X-Username can still register (bootstrap carve-out), registered caller can register a different name, malformed X-Username rejected even with valid body — `registry.test.ts`.
- GET /users caller-identity matrix: registered caller, case-variant of registered caller, unregistered non-null X-Username → 403, malformed X-Username → 400 — `registry.test.ts`.
- Bare-JSON-value bodies (string / array / number / null at top level) rejected at POST /users — `registry.test.ts` (cc-openspec covers only string and array, not number/null/true).
- Whitespace-only username variants explicitly enumerated (space, tab, newline, multi-space) — `registry.test.ts`.
- Reset interactions verified through the users endpoints: registry cleared, name re-registerable, prior X-Username now 403 — `registry.test.ts`, `usersIntegration.test.ts`.
- Integration-level round-trip through `createApp` covering 400 / 409 / 403 / 404 envelopes and `/reset` exemption for malformed/unregistered callers — `usersIntegration.test.ts`.

## cc-openspec-only scenarios
- Store-layer unit tests (independent of HTTP): empty-at-boot accessors, `isRegistered` / `originalCasing` / `list` behavior, case-insensitive membership, duplicate-detection return shape, registration-order preservation, reset clears case-key map, register does not mutate input — `store.test.ts`.
- Explicit "validation precedes duplicate check" tests: malformed username → 400 (not 409) when a collision exists; body-shape failure → 400 (not 409) — `http.test.ts`.
- Failed registration leaves registry unchanged (empty username does not appear in list) — `http.test.ts`.
- Missing-body (no body at all) on POST /users → 400 — `http.test.ts`.
- GET /users response shape explicitly asserted to be an object with a `users` key (not a bare array) — `http.test.ts`.

## Divergent expectations
- Registration order on listing: cc-only asserts list ordering only in the multi-registration success path and the canonical-casing test; cc-openspec asserts registration-order preservation explicitly (`charlie, alice, bob` insertion order survives) — both projects expect deterministic registration order, so no material divergence, just depth — `registry.test.ts` vs `http.test.ts`.
- Caller-identity gate on POST /users: cc-only tests the carve-out (unregistered/malformed X-Username paths at this endpoint) here; cc-openspec defers those to the identity area (per comment in `http.test.ts`). Material to *where* coverage lives, not to expected endpoint behavior.

## Shared coverage
- POST /users: well-formed name → 201 with `{username}` echoing original casing — `registry.test.ts`, `http.test.ts`.
- POST /users: internal whitespace allowed — `registry.test.ts`, `http.test.ts`.
- POST /users: null user (no X-Username) can register (self-registration / openness) — `registry.test.ts`, `http.test.ts`.
- POST /users rejects empty object / missing username, non-string username, empty-string username, leading-whitespace, trailing-whitespace — `registry.test.ts`, `http.test.ts`.
- POST /users rejects non-JSON body and bare-JSON-string / bare-JSON-array bodies — `registry.test.ts`, `http.test.ts`.
- POST /users: identical-case duplicate → 409 — `registry.test.ts`, `http.test.ts`.
- POST /users: case-variant duplicate → 409 with original (first-registered) casing preserved — `registry.test.ts`, `http.test.ts`.
- GET /users: empty registry → 200 `{users: []}` with JSON content-type — `registry.test.ts`, `http.test.ts`.
- GET /users: null user (no X-Username) can list — `registry.test.ts`, `http.test.ts`.
- GET /users: original/first-registered casing preserved across multiple registrations — `registry.test.ts`, `http.test.ts`.
