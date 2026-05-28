# concurrency
> Write lock, serialization of concurrent mutations.

## Test inventory
- cc-only: 2 files, 12 tests
- cc-openspec: 1 file, 9 tests

## cc-only-only scenarios
- HTTP-boundary serialization: same-tick `POST /taxa` produce monotonic IDs in submission order (`writeSerialization.test.ts`).
- HTTP-boundary: same-tick PATCH after POST observes committed POST state (`writeSerialization.test.ts`).
- `POST /reset` runs under the write lock and wipes intermediate state, restarting ID counter (`writeSerialization.test.ts`).
- HTTP-boundary: same-tick `POST /proposals` produce ordered proposal+change IDs (`writeSerialization.test.ts`).
- HTTP-boundary: same-tick `POST /changes/.../accept` serialize and both renames reflected in live state (`writeSerialization.test.ts`).
- HTTP-boundary: same-tick `POST /changes/.../accept-cascade` serialize cleanly without state corruption across distinct roots/reviewers (`writeSerialization.test.ts`).
- Concurrent PUT-edge mutation and read yield a consistent post-write state (`writeSerialization.test.ts`).

## cc-openspec-only scenarios
- Ten concurrent increments under the lock produce exactly 10 (read-await-write counter pattern proving serialization beyond order — `write-lock.test.ts`).
- Synchronous fn returning a value resolves to that value (`write-lock.test.ts`).
- Async fn returning a value resolves to that value (`write-lock.test.ts`).
- Independent (non-lock) async code is NOT blocked while the lock is held (`write-lock.test.ts`).

## Divergent expectations
- None observed. Both projects agree on FIFO order, slot-held-until-settled, and rejection propagation with no stall.

## Shared coverage
- Two concurrent writes serialize in invocation/submission order (`writeLock.test.ts` / `write-lock.test.ts`).
- Many (10) concurrent writes preserve FIFO order (`writeLock.test.ts` / `write-lock.test.ts`).
- A synchronous throw propagates to the caller and does not stall subsequent writes (`writeLock.test.ts` / `write-lock.test.ts`).
- An async rejection propagates to the caller (cc-only frames this as "rejection surfaced, not swallowed"; cc-openspec frames it as "async rejection propagates and releases the slot") (`writeLock.test.ts` / `write-lock.test.ts`).
- The lock is held until the fn's returned promise fully settles — a later write cannot observe the in-flight state (`writeLock.test.ts` / `write-lock.test.ts`).
