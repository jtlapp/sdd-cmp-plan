# Test-Suite Comparison: cc-only vs cc-openspec

A side-by-side comparison of the test suites produced by two Claude Code
configurations implementing the same 7-phase PRD. See [`README.md`](README.md)
for methodology and the [`by-area/`](by-area/) directory for per-area detail.

## At a glance

| | cc-only | cc-openspec |
|---|---:|---:|
| Test files | 46 | 96 |
| Total tests (incl. `describe` blocks for cc-openspec) | 484 | 1111 |
| Distinct `it`/`test` cases (estimated) | 484 | ~900 |
| Style | flat `test/*.test.ts`, `node:test` `test()` blocks | `test/<feature>/*.test.ts`, `describe`/`it`/`beforeEach` blocks |
| Layering | Mostly HTTP-boundary integration | Mixed: unit (store, derive, format, middleware) + HTTP integration |

cc-openspec produces roughly **twice the test files and twice the test cases**,
driven almost entirely by a unit-test layer that cc-only does not have
(proposal store, derive function, identity middleware, format validators).

## Material behavioral divergences

The following are scenarios where the two projects, given the same input,
expect functionally different behavior — not just different status codes or
error wording. These are the findings that matter for "is the implementation
under test actually equivalent?"

| Rank | Area | Scenario | cc-only expectation | cc-openspec expectation |
|---|---|---|---|---|
| 1 | [identity](by-area/identity.md) | Well-formed but unregistered `X-Username` | Middleware **403s and short-circuits** | Middleware classifies as `{kind:'unregistered'}` and **lets the handler decide** |
| 2 | [changes-lifecycle](by-area/changes-lifecycle.md) | §11.4 classification when a self-accept fails its invariant | Auto-dismisses the change (case 2) | Keeps the change `invalid` and in queue (case 3); case 2 reserved for sibling-broken-by-success |
| 3 | [taxa](by-area/taxa.md) | `GET /taxa/{id}` response shape | `childIds` / `parentIds`; no shared-ness field | `children` / `parents` plus a derived `shared:boolean` |
| 4 | [taxa](by-area/taxa.md) | Reads (`GET /taxa`, `GET /trees`) auth gate | Registered-or-null only (unregistered → 403) | Fully open to all callers |
| 5 | [taxa](by-area/taxa.md) | Owner casing on POST/PATCH | Stores `X-Username` verbatim | Canonicalizes owner to registry casing |
| 6 | [domain](by-area/domain.md) | Composite invariant violation report ordering | Order unspecified | Pinned: cycles → duplicates → name-clashes |
| 7 | [proposals-derive](by-area/proposals-derive.md) | Payload `op:"add"` derivation | Single `add` op in emitted changes | Splits into `add-create` and `add-graft` ops |
| 8 | [proposals-derive](by-area/proposals-derive.md) | Latent-rename reviewer shape | Not asserted (only queue absence) | Tagged union: `{kind:'deferred', parentChangeId}` pointing to the immediate create parent |
| 9 | [proposals-payload](by-area/proposals-payload.md) | Top taxon not in target tree | 409 conflict (`top_not_in_tree`) | 400 validation (`top-taxon-not-in-tree`) |
| 10 | [proposals-payload](by-area/proposals-payload.md) | Nested unknown id in payload | 404 (submission-time existence check) | 400 (payload validation with explicit tag) |
| 11 | [integration](by-area/integration.md) | Latent rename after ownership reassignment | Reroutes to new owner at promotion | (asserts only the queued sticky case; latent case not pinned) |
| 12 | [app-smoke](by-area/app-smoke.md) | `GET /health` body | `{status:"ok"}` exactly | `{status:"ok", version:"..."}` — non-empty version |
| 13 | [format](by-area/format.md) | Username empty/null | `parseUsername` tri-state: `undefined`/`null`/`""` → null user | `validateUsername` binary: `""` → rejected as `empty`; no null-input concept |
| 14 | [proposals-queue](by-area/proposals-queue.md) | Queue ordering rule | FIFO by submission asserted | Only determinism across reads asserted; FIFO not pinned |
| 15 | [changes-lifecycle](by-area/changes-lifecycle.md) | Dismiss error discrimination | Two tags: `change_not_invalid` vs `change_not_in_queue` | Single tag: `change-not-dismissible` |

Items 9, 10, 12, 14, 15 sit at the boundary of "non-material" — they differ in
the *shape* of the response but reflect a real domain choice (the validator's
classification of the same input, whether ordering is a guarantee or an
incident). They are included because a downstream client written against one
project's response would behave differently against the other.

## Coverage gaps in each direction

### Where cc-only tests something cc-openspec does not

- **`/health` registerReset callback seam** ([app-smoke](by-area/app-smoke.md)) — verifies the reset-callback registry is actually invoked end-to-end. cc-openspec has no equivalent wiring assertion.
- **HTTP-boundary concurrency on every mutating route** ([concurrency](by-area/concurrency.md)) — `/taxa` POST/PATCH, `/reset`, `/proposals`, `/changes/.../accept`, `/changes/.../accept-cascade`. cc-openspec proves the lock primitive but never proves it is wired to the HTTP handlers.
- **Lazy invalidation negative assertions** ([changes-lifecycle](by-area/changes-lifecycle.md)) — explicit HTTP-level tests that unrelated writes do NOT eagerly transition queued changes; `GET /queue` is idempotent.
- **End-to-end Appendix A.1/A.2 acceptance lifecycle** ([proposals-end-to-end](by-area/proposals-end-to-end.md)) — cc-only carries the worked examples through accept/reject; cc-openspec stops at submission.
- **Auto-dismiss-on-failed-accept invariant** ([proposals-end-to-end](by-area/proposals-end-to-end.md)) — only tested end-to-end in cc-only.
- **`?proposer=unregistered → []` corner** ([proposals-queue](by-area/proposals-queue.md)) — PRD decision #10.
- **Deep-nested latent suppression in queue** ([proposals-queue](by-area/proposals-queue.md)).
- **§6.3 cycle-attribution under non-cycle entry chain** ([domain](by-area/domain.md)) — entry root excluded from reported cycle members.
- **Rename simulation pinning every containing tree** ([domain](by-area/domain.md)) — §3.3.
- **Phase-7 all-three-cases-then-reset omnibus** ([integration](by-area/integration.md)).

### Where cc-openspec tests something cc-only does not

- **Proposal store as a unit-test layer** ([proposals-store](by-area/proposals-store.md)) — 96 tests over id allocation, install, transitions, queue determinism, resolve-parent. cc-only has zero dedicated store tests; most properties are exercised indirectly via integration.
- **Derive function as a pure unit** ([proposals-derive](by-area/proposals-derive.md)) — `decisionDeps`, `existenceDeps`, `taxonRef` discriminator, sequencer injection, DFS pre-order changeId.
- **Identity middleware exposure / divergence / freshness** ([identity](by-area/identity.md)) — four dedicated files vs one in cc-only.
- **Owner-scoped deletion region semantics** ([domain](by-area/domain.md)) — §6.3 halt-frontier and foreign-edge behavior as pure domain tests.
- **`checkAddCreate` / `checkAddEdge` / `checkRename` wrapper APIs** ([domain](by-area/domain.md)).
- **`GET /proposals/{id}` endpoint** ([proposals-queue](by-area/proposals-queue.md)) — entirely absent from cc-only's queue-area files.
- **Serialization unit tests** ([proposals-queue](by-area/proposals-queue.md)) — `simplifyPayloadParent`, `toQueueEntry`, `renderStatusTree` including Phase 6 dispositions, `mintedTaxonId`, cascade-invalid reason.
- **Validator purity / source-import constraints** ([proposals-payload](by-area/proposals-payload.md), [domain](by-area/domain.md), [proposals-store](by-area/proposals-store.md)) — source-grep tests asserting modules don't import from forbidden layers.
- **Reject-cascade reason attribution** ([integration](by-area/integration.md)) — cascade invalidation cites the immediate ancestor, not the original trigger.
- **Move-as-two-proposals non-atomicity** ([integration](by-area/integration.md)) — §14.1.
- **Per-endpoint auth tests as units** ([auth](by-area/auth.md)) — composition-order assertions, envelope-shape contracts.
- **Unexpected-throw error envelope normalization** ([errors](by-area/errors.md)) — plain `Error`, non-`Error` values; server-side logging.
- **NBSP / ZWJ rejection in username** ([format](by-area/format.md)).
- **No-mutation guarantee snapshot tests** ([proposals-routing](by-area/proposals-routing.md)) — whole-state byte-equality after failed proposal submission.

## Coverage asymmetries by area

Areas with **broadly equivalent** behavioral coverage (organization differs but
verdicts match): users, reset, app-smoke (modulo the version-field divergence).

Areas where cc-openspec tests substantially more **distinct properties**:
proposals-store, proposals-derive, identity, domain (owner-scoped region + wrappers),
errors (unexpected throw), proposals-queue (serialization + GET-by-id), integration
(Phase 2/3 cross-capability files, lazy-eval negatives).

Areas where cc-only tests substantially more **HTTP-wired behavior**:
concurrency (route gating), proposals-end-to-end (full accept/reject lifecycle),
changes-lifecycle (lazy-invalidation negatives at HTTP level), reads-auth.

## Testing philosophy in one paragraph each

**cc-only**: prefers HTTP-boundary integration testing. State transitions,
invariant checks, store mechanics, and middleware all get exercised through
real route calls. Test files are flat under `test/` and named after the
endpoint/feature (`taxaCreate`, `proposalsParse`, `cascadeRollback`). Yields a
suite that proves the wire contract; pays for it with weaker isolation when a
unit fails (failure points back to a route, not the offending function).

**cc-openspec**: prefers a unit-test layer beneath the integration layer. Pure
domain functions, store internals, the `deriveChanges` pipeline, and middleware
all have dedicated unit test files; HTTP integration files focus on the wiring
and on cross-cutting scenarios. Tests sit under `test/<feature>/` directories
mirroring `src/<feature>/`. Yields finer error localization and explicit
purity/import-discipline assertions; pays for it with some weaker
wire-integration coverage (e.g., the write lock primitive is tested in
isolation but not proven wired to routes).

## How to read the per-area reports

Each [`by-area/<name>.md`](by-area/) report has four sections:

- **cc-only-only scenarios** — functional behavior tested only in cc-only.
- **cc-openspec-only scenarios** — functional behavior tested only in cc-openspec.
- **Divergent expectations** — analogous scenarios with different functional outcomes (this is the high-signal section).
- **Shared coverage** — brief confirmation of overlap (not exhaustive).

Per-area reports are the source of truth; this summary aggregates and ranks.
