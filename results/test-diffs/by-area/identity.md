# identity
> Identity middleware, X-Username parsing/normalization, divergence detection, identity exposure on responses.

## Test inventory
- cc-only: 1 file, 11 tests
- cc-openspec: 4 files, 22 tests (3 describe blocks + 19 it cases; the malformed-input `it` is a 7-row table → 25 effective cases)

## cc-only-only scenarios
- Two-flavor middleware: `identityWithRegistry` (full §4 gate) vs `identityFormatOnly` (POST /users carve-out tested directly) — cc-openspec has only one middleware. (identityMiddleware.test.ts)
- Well-formed-but-unregistered header → 403 forbidden with handler never running (registry-gated route). cc-openspec's middleware does NOT 403 unregistered callers; it classifies them as `{kind:'unregistered'}` and lets the route decide. (identityMiddleware.test.ts)
- Asserts §15.6 error envelope shape on both validation and forbidden paths. (identityMiddleware.test.ts)
- `identityFormatOnly`: unregistered well-formed header is surfaced to handler as `{kind:'null'}` rather than `{kind:'unregistered'}`. (identityMiddleware.test.ts)
- Uses NBSP (U+00A0) as the malformed-input vehicle to survive RFC 7230 OWS-stripping. (identityMiddleware.test.ts)

## cc-openspec-only scenarios
- Dedicated divergence test: absent-vs-malformed and empty-vs-trailing-whitespace produce observably distinct outcomes (null caller vs ApiError). (divergence.test.ts)
- Caller shape on context exposed via test-only `/_test/whoami` route: explicit `{kind:'null'}` has no `username` key. (exposure.test.ts)
- `unregistered` Caller variant carries the **header-cased** username (not normalized). (exposure.test.ts, middleware-unit.test.ts)
- Per-row malformed cases tagged: `leading-whitespace` vs `trailing-whitespace` carried in `ApiError.details.tag`. Covers space, tab, and line-feed on both sides. (middleware-unit.test.ts)
- POST /reset exemption is explicit at the middleware level: does NOT read X-Username, does NOT set caller, but still calls next; even malformed `"   "` does not throw on /reset. (middleware.test.ts, middleware-unit.test.ts)
- Negative regression: GET /reset (wrong method) is NOT exempt — middleware runs and classifies. (middleware-unit.test.ts)
- Registry-lookup freshness: register-after-first-request promotes unregistered → registered; /reset reverts registered → unregistered. Observed both on `/users` status and on Caller shape. (middleware.test.ts, exposure.test.ts)
- Internal whitespace inside a well-formed name is preserved end-to-end. (middleware.test.ts)
- Stored-casing fidelity: registry preserves arbitrary casing (`"Alice"`, `"BOB"`) and Caller.username reflects stored form regardless of header casing. (exposure.test.ts)

## Divergent expectations
- Unregistered well-formed header: cc-only's gated middleware → 403 forbidden + handler short-circuits; cc-openspec → 200, `{kind:'unregistered', username:<header>}` passed to handler. MATERIAL — different middleware contracts. (identityMiddleware.test.ts vs middleware.test.ts, exposure.test.ts, middleware-unit.test.ts)
- Shape of "unknown caller" exposed to the handler: cc-only surfaces unregistered as `{kind:'null'}` (in the format-only variant); cc-openspec has a distinct `{kind:'unregistered', username}` variant. MATERIAL — Identity/Caller type shape differs. (identityMiddleware.test.ts vs exposure.test.ts)
- Identity casing on responses for unregistered: cc-only has no echo for unregistered (it 403s); cc-openspec preserves header casing exactly (`"GhOsT"` round-trips). MATERIAL — exposure contract. (exposure.test.ts)
- Malformed-input vehicle: cc-only uses NBSP (proving the parser rejects non-OWS whitespace at HTTP layer); cc-openspec bypasses HTTP transport entirely and tests the middleware function directly with literal `\t`, `\n`, and ASCII spaces. MATERIAL — different scopes of "malformed" verified. (identityMiddleware.test.ts vs middleware-unit.test.ts)
- POST /reset middleware behavior: cc-only has no /reset-exemption test in this area (reset tested elsewhere); cc-openspec explicitly tests that /reset bypasses X-Username parsing entirely, even for otherwise-malformed values. MATERIAL — middleware short-circuit behavior. (middleware.test.ts, middleware-unit.test.ts)
- Registered-handler echo: both echo canonical/stored casing for registered callers, so this is non-divergent. (identityMiddleware.test.ts, exposure.test.ts)

## Shared coverage
- Absent X-Username → null-shaped identity, handler runs. (identityMiddleware.test.ts, middleware-unit.test.ts, exposure.test.ts, middleware.test.ts)
- Empty X-Username → null-shaped identity, handler runs. (identityMiddleware.test.ts, middleware-unit.test.ts, exposure.test.ts, middleware.test.ts)
- Malformed X-Username (leading/trailing whitespace of some flavor) → 400 validation_error, handler never runs. (identityMiddleware.test.ts, middleware-unit.test.ts, divergence.test.ts)
- Registered exact-case header → handler sees `{kind:'registered', username:<canonical>}`. (identityMiddleware.test.ts, exposure.test.ts, middleware-unit.test.ts)
- Case-variant header for a registered user resolves to canonical/stored casing. (identityMiddleware.test.ts, exposure.test.ts, middleware-unit.test.ts)
- Internal whitespace in a well-formed name is acceptable. (identityMiddleware.test.ts implicitly via `"alice smith"`-style accepted forms is NOT covered; cc-openspec covers explicitly in middleware.test.ts) — only cc-openspec.
