# Implementation phases — index

This folder breaks the project described in `prd.md` into seven sequential
implementation phases, one brief per file. Each brief is meant to be handed to a
development harness together with the **full `prd.md`** and the
**`toolchain-supplement.md`** (which `prd.md` incorporates by reference,
§2/§13), plus the **non-normative `sample-taxonomy.md`** as a source of
fiction-genre names for tests (§13).

## How to use these briefs

- **`prd.md` is the authoritative specification.** Each brief scopes a slice of
  the work and points at the PRD sections that govern it. Where a brief restates
  a requirement, the PRD's own wording governs. The `toolchain-supplement.md` is
  incorporated into `prd.md` by reference and is equally binding: it governs
  toolchain and test mechanics (runtime version, module system, build model, test
  framework), while `prd.md` governs domain behavior. Hand it to the harness
  alongside every brief. The `sample-taxonomy.md` is **non-normative** test data
  — a naming resource for the §13 suite — not a specification input; it neither
  adds requirements nor constrains the system's structure.
- Phases are **sequential**: each assumes the previous phases are complete and
  their modules are available to call into.
- Each brief states what is **in scope**, what is **explicitly deferred** to a
  later phase, a **testing** expectation (per §13), and a **done-when** checklist
  describing required behavior.
- The done-when checklists describe behavior, not test scenarios. Per §13,
  choosing and structuring the specific test scenarios is the harness's
  responsibility and is deliberately not enumerated in these briefs.
- The reset endpoint (PRD §15) is introduced in Phase 1; by its fresh-start
  definition it must clear every later phase's state, and each phase confirms this
  for the state it adds.

## Test-plan requirement (for your reference)

This is a summary of a requirement that is **stated in each phase brief** (in its
Testing section) — it is delivered to the harness there, not here. For each
phase, the harness must produce, alongside the implementation and its tests, two
test-plan artifacts:

1. an **initial test plan**, written from the spec before implementation begins
   and then **frozen** (not edited afterward); and
2. a **final test plan** delivered at the end, superseding the initial one, with
   a short **changelog** of how it differs — what was added, removed, or changed
   while building, and why.

Separately, the briefs tell the harness not to treat the initial plan as a
contract: it should add tests freely as it works, with those additions appearing
in the final plan. Freezing the initial plan and keeping the final one separate
is what makes the anticipated-vs-discovered difference visible. Plans are per
phase (matching the incremental build), not one up-front plan for the whole
project.

## The spine

1. **Scaffold, error model, format validators** — stack skeleton, JSON error
   envelope and status mapping, the two pure format validators (taxon name,
   username), the test runner, and the `POST /reset` state-reset endpoint used
   for per-test isolation.
2. **Users, identity, registry** — registration, `X-Username` parsing, and the
   400/403 middleware that gates every later write.
3. **Domain model and the invariant engine** — in-memory store, IDs, edges, the
   reachability layer, the pure §3.3 invariant module, and the read surface.
4. **Direct owner actions** — create, edit, edge add/remove, write serialization,
   with **delete (§6.3)** as a tracked sub-milestone.
5. **Proposal submission** — payload model, routing, dependency classification,
   and initial disposition. Stops before any review decision.
6. **Single review loop** — accept-single, reject, latent→queued promotion, and
   ownership transfer on accepting a create.
7. **Cascade + invalidation + integration** — atomic accept-cascade with
   rollback, the three invalidation modes, dismiss, and end-to-end coverage.

## Suggested gates

- **After Phase 4** the system is a complete, multi-owner, proposal-free server —
  a strong checkpoint to compare harnesses before the proposal subsystem.
- **After Phase 7** the full §13 happy/edge/failure matrix is covered.