# Development process — Claude Code + Allium

This is the per-phase procedure for the **Claude Code + Allium** configuration. It
uses Allium as intended — a behavioural `.allium` spec is the primary artifact, built
and maintained alongside the code — extended only as needed to (a) implement in
phases and (b) record anticipated vs. final tests.

> **How Allium differs from the OpenSpec config (read this first).**
> Allium's natural loop is *conversational*: the `elicit` skill runs a structured
> discovery session, asking one question at a time, surfacing ambiguities and
> contradictions, and making the human decide. That conversation is this
> configuration's primary defect-detection surface — far more so than OpenLore's
> drift was in the other config. The README's central claim is that Allium's formal
> structure "makes contradictions visible" where Markdown hides them. So the single
> most important thing you can do to use Allium *as intended* is **let the
> elicitation conversation actually happen** instead of dumping the PRD and saying
> "build it." See the experiment-hygiene rules below for how to answer its questions
> without coaching it toward the planted defects.

---

## Allium's surfaces (what you'll actually drive)

**Skills** (slash commands in Claude Code; fully-qualified `/allium:*` form works
everywhere, short form `/elicit` etc. in some editors):

| Skill | Purpose | Used in this experiment |
|---|---|---|
| `/allium` | Entry point; examines project and routes you to the right skill | Optional, once |
| `/allium:elicit` | Build a spec through structured conversation (forward, from intent) | **Yes — main spec step** |
| `/allium:distill` | Extract a spec from existing code (backward) | No (we build forward from the PRD) |
| `/allium:propagate` | Generate tests from a spec | **Yes — test derivation** |
| `/allium:tend` | Targeted edits to an existing spec | **Yes — small inter-phase spec changes** |
| `/allium:weed` | Find/fix divergence between spec and code | **Yes — per-phase reconciliation** |

**CLI** (`allium-tools`, optional but recommended — when installed, `.allium` files
are validated automatically after every write/edit and diagnostics feed back into
the conversation):

| Command | Purpose |
|---|---|
| `allium check` | Validate spec, report structural diagnostics |
| `allium plan` | Derive **test obligations** from a spec |
| `allium model` | Extract the domain model as structured data |
| `allium parse` | Parse to syntax tree (rarely needed by hand) |

> ⚠️ **Pre-release caveat.** allium-tools is pre-release and its exact CLI verb set is
> in flux (some docs show `analyse`; the tools repo lists `check`/`parse`/`plan`/`model`).
> After install, run `allium --help` and substitute the real verb names. Drive the
> workflow through the **skills**; treat the CLI as the validation/test-obligation
> engine the skills call into. Keep whatever you choose identical across all phases.

---

## 0. One-time setup (before Phase 1)

```bash
git init

# Allium skill into Claude Code via the JUXT plugin marketplace
# (run these inside Claude Code, not the shell):
#   /plugin marketplace add juxt/claude-plugins
#   /plugin install allium

# Allium CLI (recommended — enables auto-validation + test obligations)
brew tap juxt/allium && brew install allium      # or: cargo install allium-cli
allium --help                                    # confirm the real verb names (see caveat)
```

Put the inputs under `prd/` as plain reference material — **do not** pre-write any
`.allium` spec yourself; the harness builds it via elicitation:

```
prd/prd.md
prd/toolchain-supplement.md
prd/sample-taxonomy.md
prd/phase-1-scaffold.md … prd/phase-7-cascade-invalidation-integration.md
```

Create working directories:

```bash
mkdir -p specs test-plans      # specs/ holds .allium files; test-plans/ holds the frozen/final plans
```

> ⚠️ **Experiment hygiene (critical for this config).** The elicit skill will ask
> *you* questions. Answer **only** from the PRD's own wording. When the PRD genuinely
> doesn't decide something (a planted gap), say exactly that — "the PRD doesn't
> specify this" — and let the harness record it as an `open question` and choose a
> resolution. Do **not** volunteer which way to resolve it, do **not** mention that
> anything is intentional, and never reference the experiment, defects, or scoring —
> not in answers, `CLAUDE.md`, commits, or the specs. An `open question` the harness
> writes, or a contradiction it flags back to you, **is** your detection signal;
> coaching it destroys the measurement.

---

## Per-phase loop (repeat for Phases 1 → 7)

Phases are sequential. The `.allium` spec is **cumulative** — it grows each phase and
persists across sessions (that persistence is Allium's whole point), so do not reset
or discard it between phases.

### Step 1 — Elicit / extend the spec for this phase

This is the forward spec step **and the primary defect-detection surface.**

**Phase 1** (no spec yet): start a fresh elicitation.

```
/allium:elicit

We're building the system described in the produce requirements design document `prd/prd.md` (with `prd/toolchain-supplement.md`,
incorporated by reference). Work in phases; this session covers ONLY Phase 1, scoped
by `prd/phase-1-scaffold.md` — the error model and the two format validators (taxon
name, username). The brief scopes this phase and points at the governing PRD sections;
where the brief restates a requirement,
the wording in `prd/prd.md` governs. Capture scope comments marking what's deferred to later
phases. Write the spec to `specs/taxonomy.allium`. Ask me what you need; I'll answer
from the PRD.
```

**Phases 2–7** (spec exists): extend it. Use `tend` for mechanical additions you can
state precisely; use `elicit` when the phase needs real discovery (most do here —
domain invariants, proposals, review, cascade all have genuine ambiguity).

```
/allium:elicit

Continue the spec in `specs/taxonomy.allium`. This session adds ONLY Phase N, scoped by
`prd/phase-N-*.md` and the PRD sections it cites. Read the existing spec first and don't
re-litigate settled entities. `prd/prd.md` is authoritative for requirements. Ask me what you need; I'll
answer from the PRD. Flag any tension you find between this phase's requirements and
what's already in the spec.
```

Per-phase Allium one-liners (the "this phase adds…" description):

| Phase | Phase adds… |
|---|---|
| 1 | the error/response model and two pure format validators (taxon-name §3.4, username §4) |
| 2 | users, identity, the registry, and the write-gating authorization rules (§4, §15.1) |
| 3 | the taxon/edge domain model, reachability, the three §3.3 invariants, and reads (§3, §15.2) |
| 4 | direct owner actions — create, edit, edge add/remove, delete — and write serialization (§5–§7, §11.1) |
| 5 | proposal submission, per-op routing, dependency classification, and initial disposition (§8–§10, §11.3) |
| 6 | the single-review loop: accept, reject, promotion, create-ownership transfer (§11.2–§11.3, §12.1, §12.3) |
| 7 | atomic accept-cascade, the three §11.4 invalidation modes, dismiss, and integration (§11.4, §12.2, §12.4) |

When the CLI is installed, the skill runs `allium check` after writing the spec and
fixes structural issues in the same turn. Let that happen — a contradiction the
checker surfaces (e.g. two rules with incompatible preconditions over the same
comparison) is exactly the kind of defect signal you want recorded.

> **Why this catches things:** Allium forces every rule's preconditions and outcomes
> into a form where two rules governing the same thing in incompatible ways collide
> visibly. A case-sensitivity contradiction or an undecided self-routing case tends to
> surface here as a checker diagnostic or an `open question`, rather than being
> silently resolved. Don't pre-empt it.

### Step 2 — Freeze the initial test plan

Allium derives test *obligations* from the spec, which is the natural source for an
anticipated-tests artifact. Before implementing:

```bash
allium plan specs/taxonomy.allium      # derive test obligations (verb per `allium --help`)
```

Then, in Claude Code:

```
Using the Allium test obligations from `allium plan` and this phase's spec, write the
initial test plan for Phase N to `test-plans/phase-N-initial.md` — what needs testing
and why, derived from the spec before any implementation. This file will be frozen.
```

Commit it on its own so the freeze is enforced by git history:

```bash
git add test-plans/phase-N-initial.md
git commit -m "phase-N: initial test plan (frozen)"
```

After this commit, do not edit `phase-N-initial.md` again.

### Step 3 — Implement (Claude Code, spec-driven)

Have the agent implement this phase's scope with the `.allium` spec as the binding
description of behaviour:

```
Implement Phase N now. The spec in `specs/taxonomy.allium` is the authoritative
description of behaviour; the code is its expression. Build only this phase's scope
(respect the deferred markers). Write the phase's automated tests, covering the
obligations from the initial test plan plus anything you discover while building.
Use the runtime/test framework from `prd/toolchain-supplement.md`.
```

If implementation surfaces a behaviour the spec didn't capture, update the spec
(`/allium:tend`) rather than letting code and spec diverge — then let the CLI
re-check. Don't touch the frozen initial test plan; new tests belong in the final
plan.

### Step 4 — Reconcile spec ↔ code (`weed`) + propagate tests

```
/allium:weed
```

`weed` finds and fixes divergence between the `.allium` spec and the implementation —
this is Allium's drift-equivalent, and the natural per-phase consistency gate. Then
generate/refresh tests from the (now-reconciled) spec:

```
/allium:propagate

Generate tests for Phase N's behaviour from specs/taxonomy.allium, in the project's
test framework. Don't duplicate existing passing tests; fill gaps against the spec's
obligations.
```

Run the suite via the toolchain-supplement's single documented command and get it
green before closing the phase.

### Step 5 — Final test plan + changelog

```
Write `test-plans/phase-N-final.md` the final plan superseding the initial one,
reflecting what was actually tested (including propagated tests and anything added
while building), plus a short changelog of how it differs from the frozen initial
plan — scenarios added, removed, or changed, and why.
```

```bash
git add -A
git commit -m "phase-N: implementation, tests, final test plan"
```

### Step 6 — Phase gate

Stop. The `.allium` spec now covers Phases 1…N cumulatively and is the baseline the
next phase extends.

> **Suggested gates (from the phase index):** after Phase 4 the system is a complete
> multi-owner, proposal-free server. After Phase 7 the full §13 matrix is covered.

---

## Verifying `POST /reset` across phases

From Phase 2 on, each phase's spec should capture that `POST /reset` returns the
server to fresh-boot state (callable without a registered user), and each phase's test
plan should include a reset-clears-my-new-state case. This is PRD-required behaviour,
fair to expect of every configuration equally.

---

## Quick command reference

| Purpose | Command | Where |
|---|---|---|
| Install Allium skill | `/plugin marketplace add juxt/claude-plugins` → `/plugin install allium` | Claude Code, once |
| Install Allium CLI | `brew tap juxt/allium && brew install allium` (or `cargo install allium-cli`) | shell, once |
| Confirm CLI verbs | `allium --help` | shell, once |
| Route to a skill | `/allium` | Claude Code |
| Build/extend spec | `/allium:elicit` (or `/allium:tend` for small edits) | Claude Code, per phase |
| Validate spec | `allium check specs/taxonomy.allium` | shell / auto-hook |
| Derive test obligations | `allium plan specs/taxonomy.allium` | shell, per phase |
| Reconcile spec↔code | `/allium:weed` | Claude Code, per phase |
| Generate tests | `/allium:propagate` | Claude Code, per phase |
| Extract domain model | `allium model specs/taxonomy.allium` | shell, optional |

**Deliberately unused:** `/allium:distill` (we build forward from the PRD, not backward
from code). The two autonomous agents (`tend`/`weed` as background agents) are
optional — use the interactive skills so the discovery conversation stays in your main
session where you can answer from the PRD.

---

## Suggested `CLAUDE.md`

Durable project facts and the workflow contract only — **no** mention of the
experiment, defects, or scoring.

```markdown
# Project: Collaborative Taxon Tree Server

## Requirements (source of intent)
- `prd/prd.md` is the authoritative statement of *requirements* — what the system must
  do. `prd/toolchain-supplement.md` is incorporated by reference and equally binding for
  toolchain and test mechanics (runtime, module system, build, test framework); domain
  requirements live in `prd/prd.md`.
- `prd/phase-N-*.md` scope the requirements into sequential phases. Where a brief
  restates a requirement, `prd/prd.md`'s wording governs. Build only the current phase's
  scope; respect each brief's "explicitly deferred" list.
- `prd/sample-taxonomy.md` is non-normative test data (fiction-genre names) — a naming
  resource for tests, not a requirements input.

## Specification (what we build from)
- `specs/taxonomy.allium` is *the specification* — the behavioural model derived from the
  requirements and the authoritative description of behaviour for implementation. The code
  is the expression of this spec; keep them aligned.
- Derive and maintain the spec from the requirements: read `prd/` to understand intent,
  then capture it in the spec. Once captured, the spec is what you implement and test
  against — consult it first, not the raw requirements, during coding.
- When the spec and the requirements disagree, or the requirements can't be cleanly
  expressed in the spec (ambiguity, contradiction, or silence), do not paper over it:
  record an `open question` / surface the conflict and ask. Resolve from `prd/prd.md`'s
  wording where it speaks; where it's silent, leave the open question for a human decision.
  Reconciling that gap — not overriding the spec with the PRD — is the job.
  
## Testing
- Each phase ships an automated test suite for the behavior it introduces, run by the
  single documented command from the toolchain supplement.
- Two test-plan artifacts per phase: `test-plans/phase-N-initial.md` (derived from the
  spec's test obligations before implementation, then frozen — never edited after its
  commit) and `test-plans/phase-N-final.md` (what was actually tested, with a changelog
  of how it differs). Add tests freely as you discover needs; those additions belong in
  the final plan, not the frozen initial one.
- Treat the PRD's §14 "accepted properties" as intended behavior to verify.

## State reset
- `POST /reset` restores fresh-boot state and is callable without a registered user.
  Every phase that adds state confirms `reset` clears that state.

## Allium toolchain workarounds
- Known parser limitation (juxt/allium#37): a `contract` operation signature cannot
  express a zero-argument operation — both `name: () -> ReturnType` and
  `name: -> ReturnType` fail to parse. If you need a parameterless contract operation
  (e.g. a listing, global-state fetch, or reset surface), use the documented unit-
  parameter workaround: `name: (_unit: Any) -> ReturnType`. The `_unit: Any` parameter
  exists only to satisfy the grammar — it carries no domain meaning, must not be
  referenced in `requires`/`ensures`, and should not influence the modelled behaviour.
  Don't spend effort rediscovering the bug or inventing a different shape; apply this
  workaround and move on.
```

---

## Cross-config comparability notes

- **Same inputs, same gate discipline, same model** as the other two configs; only the
  tooling layer differs.
- **Biggest divergence to document:** in this config the spec step is a *conversation*
  that turns to you. Your answers are part of the harness's environment. Keep them
  PRD-faithful and uncoached, and log the questions it asked you per phase — the set of
  questions (especially ones with no PRD answer) is itself a detection result worth
  recording alongside the `open question`s in the spec.
- Allium's `weed` is the nearest analogue to OpenLore's `drift`, but it reconciles
  spec↔code, not PRD↔spec — same caveat as the other config about where PRD defects do
  and don't surface.