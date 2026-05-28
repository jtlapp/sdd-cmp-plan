# app-smoke
> Basic app/health smoke tests, top-level wiring.

## Test inventory
- cc-only: 1 files, 9 tests
- cc-openspec: 2 files, 7 tests

## cc-only-only scenarios
- POST /reset is callable with an unregistered, well-formed X-Username (§4 exemption) (app.test.ts)
- POST /reset is callable with a malformed X-Username (§4 exemption extends to malformed) (app.test.ts)
- POST /reset is callable with an empty X-Username / null user (app.test.ts)
- POST /reset is idempotent — two successive calls both return 204 (app.test.ts)
- POST /reset invokes every registered reset callback (verifies the registry-wiring seam used by later phases) (app.test.ts)

## cc-openspec-only scenarios
- GET /health response body includes a `version` field (non-empty string) alongside `status: "ok"` (health.test.ts)

## Divergent expectations
- GET /health body shape: cc-only asserts the body is exactly `{ status: "ok" }` (deepEqual, no other fields permitted); cc-openspec asserts the body contains `status: "ok"` AND a non-empty `version` string. The presence of a domain-reflecting `version` field is a material structural difference — cc-only's deepEqual would fail against cc-openspec's body. (app.test.ts vs health.test.ts)

## Shared coverage
- GET /health returns 200 with JSON content-type and `status: "ok"` (app.test.ts in both; health.test.ts in cc-openspec)
- POST /reset returns 204 on the happy path with no X-Username header (app.test.ts in both)
- Unknown path returns 404 with the standard error envelope (`error.code === "not_found"`), not Hono's default text (app.test.ts in both)
- Wrong method on a known path (POST /health) returns the JSON error envelope rather than raw text/HTML (app.test.ts in both)
