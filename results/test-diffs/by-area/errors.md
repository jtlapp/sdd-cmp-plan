# errors
> Error envelope shape and shared error response structure.

## Test inventory
- cc-only: 1 files, 7 tests
- cc-openspec: 1 files, 12 tests

## cc-only-only scenarios
- Unit-level check of `errorBody()` envelope construction directly (without HTTP round-trip) — verifies envelope shape `{ error: { code, message, details? } }` at the builder level. (errors.test.ts)
- Unit-level check that `ApiError` instance carries `code`, `message`, `details` and is an `Error` subclass. (errors.test.ts)

## cc-openspec-only scenarios
- Unexpected `Error` thrown from a handler is normalized to a `{ error: { code: "internal_error", message } }` envelope with 500. (envelope.test.ts) — MATERIAL: shape of error envelope for unexpected throws.
- Non-`Error` value thrown (e.g. a string) is normalized to the same `internal_error` envelope with 500. (envelope.test.ts) — MATERIAL: confirms unexpected throws are funneled through the envelope.
- Original throw is logged server-side via `console.error` (logger receives the original `Error`). (envelope.test.ts) — MATERIAL: confirms single boundary that both normalizes and logs.
- Content-Type is `application/json` for unexpected-throw responses (separate from ApiError responses). (envelope.test.ts)

## Divergent expectations
- Envelope is exercised differently: cc-only invokes a helper `httpError(c, code, msg, details?)` per route to produce the envelope; cc-openspec installs a single `onError` / `normalizeThrows` / `notFoundHandler` middleware stack and throws `ApiError` from the route. MATERIAL: cc-openspec's tests pin error normalization to a single boundary (middleware), while cc-only's tests pin it to a per-call helper. (errors.test.ts vs envelope.test.ts)

## Shared coverage
- `STATUS_BY_CODE` / `ApiError` → HTTP status mapping for `validation_error` → 400, `forbidden` → 403, `not_found` → 404, `conflict` → 409. (errors.test.ts, envelope.test.ts) — cc-openspec additionally covers `internal_error` → 500; status-code differences for individual rejections are non-material, but both confirm the same mapping surface.
- Envelope shape `{ error: { code, message } }` with `details` included verbatim when supplied. (errors.test.ts, envelope.test.ts)
- `details` key is omitted entirely (not present as `null`/`undefined`) when not supplied. (errors.test.ts, envelope.test.ts)
- Content-Type is `application/json` for error responses produced from `ApiError`. (errors.test.ts, envelope.test.ts)
