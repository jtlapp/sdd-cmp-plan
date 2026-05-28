# proposals-queue
> GET /proposals, GET /queue, GET /proposals/{id}, serialization of queue/status views.

## Test inventory
- cc-only: 2 files, 19 tests
- cc-openspec: 5 files, 63 tests

## cc-only-only scenarios
- GET /queue: unregistered caller is forbidden (queueRead.test.ts).
- GET /queue: malformed X-Username rejected (queueRead.test.ts).
- GET /proposals: malformed X-Username rejected (proposalsList.test.ts).
- GET /queue: routed changes appear only in their reviewer's queue across alice/bob/carol (queueRead.test.ts).
- GET /queue: deeply-nested latent grandchild ("Paranormal Romance") never appears for any reviewer (queueRead.test.ts).
- GET /queue: explicit assertion of submission-order ordering by change-id (queueRead.test.ts).
- GET /proposals: multi-proposal submission-order assertion on `proposals[].id` (proposalsList.test.ts).
- GET /proposals?proposer=unregistered → empty (decision #10) (proposalsList.test.ts).

## cc-openspec-only scenarios
- GET /proposals/{id}: unknown id → 404 with `proposal-not-found` tag (get-proposal-by-id.test.ts).
- GET /proposals/{id}: null caller may read (get-proposal-by-id.test.ts).
- GET /proposals/{id}: response shape mirrors the 201 status tree (get-proposal-by-id.test.ts).
- GET /proposals/{id}: per-node status rules — no-op structural, queued rename has reviewer username, latent under create has reviewer=null, no `reason` field in Phase 5 (get-proposal-by-id.test.ts).
- GET /proposals: list entries omit status tree; keys exactly {proposalId, proposer, targetRootId, topTaxonId} (get-proposals-list.test.ts).
- GET /proposals: filter by `targetRootId` narrows; is exact-string (case-sensitive) (get-proposals-list.test.ts).
- GET /proposals: proposer + targetRootId filters combine as intersection (get-proposals-list.test.ts).
- GET /proposals: unrecognized query params ignored; empty `proposer=` treated as no filter (get-proposals-list.test.ts).
- GET /queue: case-insensitive lookup on caller's username (Bob / bob / BOB) (get-queue-listing.test.ts).
- GET /queue: determinism across two successive reads (get-queue-listing.test.ts).
- GET /queue: latent under graft (with concrete reviewer) does NOT appear in graft-target reviewer's queue (get-queue-listing.test.ts).
- Unit serialization — `simplifyPayloadParent`: live→{taxonId}, top→{top:true}, to-create resolves via resolver, throws when unresolvable (serialize-queue-entry.test.ts).
- Unit serialization — `toQueueEntry`: taxonRef shape for rename/add-create/add-graft; disposition=invalid carries reason; reason omitted when undefined; queued never emits reason (serialize-queue-entry.test.ts).
- Unit serialization — `renderStatusTree`: per-node rules (no-op, rename, add-create, add-graft, detach has no children, latent reviewer null) (serialize-status-tree.test.ts).
- Unit serialization — `renderStatusTree`: isomorphic node count & nesting; defensive throw on count mismatch (serialize-status-tree.test.ts).
- Unit serialization — `renderStatusTree` Phase 6 dispositions: accepted/rejected/invalid surfacing, mintedTaxonId as id on accepted add-create, cascade-invalid reason references rejected ancestor (serialize-status-tree.test.ts).

## Divergent expectations
- Proposer-filter case behavior: cc-only treats `?proposer=ALICE` as case-insensitive but the response echoes the registry's canonical casing ("Alice") (proposalsList.test.ts); cc-openspec is case-insensitive on the filter match but the registered/expected canonical is "Alice" (get-proposals-list.test.ts). Material conclusion: both case-insensitive on proposer filter; no divergence in filtering rule, only in what canonical casing each suite registers.
- Queue caller-username casing: cc-openspec explicitly asserts case-insensitive caller lookup on `/queue` (Bob/bob/BOB all return the same single entry); cc-only does not test this and registers/queries with lowercase only — no contradictory assertion, but cc-only leaves the behavior unverified.
- Queue ordering: cc-only asserts strict submission-order by change-id (FIFO); cc-openspec only asserts determinism across two reads, not a specific ordering. Not contradictory but materially different specificity.
- Proposal id field name in list entries: cc-only uses `id` (proposalsList.test.ts: `body.proposals[0].id`); cc-openspec uses `proposalId` (get-proposals-list.test.ts ListBody). Material for clients.

## Shared coverage
- GET /proposals: empty server returns `{ proposals: [] }` (proposalsList.test.ts / get-proposals-list.test.ts).
- GET /proposals: null (unauthenticated) caller may list (proposalsList.test.ts / get-proposals-list.test.ts).
- GET /proposals: filtering by proposer narrows to that proposer's proposals (proposalsList.test.ts / get-proposals-list.test.ts).
- GET /proposals: proposer filter is case-insensitive (proposalsList.test.ts / get-proposals-list.test.ts).
- GET /proposals: unmatched / non-existent proposer filter returns 200 with empty list (proposalsList.test.ts / get-proposals-list.test.ts).
- GET /queue: queued rename entry carries proposalId, targetRootId, op=rename, and identifies the renamed taxon plus its payload parent (queueRead.test.ts / get-queue-listing.test.ts).
- GET /queue: add-create entry references the new taxon by name (no concrete id) with payload parent (queueRead.test.ts / get-queue-listing.test.ts).
- GET /queue: add-graft entry references the existing taxon by id with payload parent and no name (queueRead.test.ts / get-queue-listing.test.ts).
- GET /queue: latent changes never appear in any reviewer's queue (queueRead.test.ts / get-queue-listing.test.ts).
- GET /queue: routing — changes appear only in the queue of the concrete reviewer for that change (queueRead.test.ts / get-queue-listing.test.ts).
