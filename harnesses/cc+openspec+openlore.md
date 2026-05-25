# Development process — OpenSpec + OpenLore (drift/orient subset)

This is the per-phase procedure for the **Claude Code + OpenSpec + OpenLore Spec Layer**
configuration. It uses OpenSpec to author specs forward from the PRD and OpenLore
for **orientation** (`analyze`/`orient`) and **drift detection** (`drift`/`audit`)
only. It deliberately does **not** use OpenLore `generate`, `verify`, `decisions`,
or ADRs.

> **Scope decisions baked in (do not change mid-experiment):**
> - OpenSpec authors specs; OpenLore never runs `generate` (it would overwrite
>   OpenSpec's forward specs with code-derived ones and erase the spec-vs-code gap
>   that `drift` is supposed to surface).
> - No ADR mechanism, no `openlore decisions`, no decisions pre-commit hook.
> - OpenLore's contribution is cross-phase orientation + drift, not PRD defect
>   detection. Expect PRD defects to surface in the OpenSpec proposal step and in
>   Claude Code reading the PRD — not from OpenLore.

---

## 0. One-time setup (before Phase 1)

Run these once in an empty project directory.

```bash
# Toolchain
npm install -g @fission-ai/openspec@latest
npm install -g openlore

git init                       # OpenLore drift compares against git refs; a repo is required

# OpenSpec: scaffold openspec/ and write agent slash-commands
openspec init                  # pick Claude Code when prompted

# OpenLore: config + first (empty) analysis + MCP-ready agent config files
openlore init
openlore analyze --ai-configs  # writes CODEBASE.md + AI config files (see note below)
openlore doctor                # sanity-check: Node version, git, openspec/ dir, provider
```

**Provider for OpenLore:** so the whole stack runs through one model with no extra
key, put the `claude` CLI on PATH and configure OpenLore's provider as the
CLI-based `claude-code` provider (see `.openlore/config.json` / `openlore` provider
docs). `analyze`, `drift`, `audit`, and `mcp` need no API key regardless.

**`--ai-configs` caveat:** that flag *generates* a `CLAUDE.md` (and other tool
config files). You want to **control** `CLAUDE.md` yourself (see §6 below). Either
skip `--ai-configs` and write `CLAUDE.md` by hand, or run it and then **overwrite**
`CLAUDE.md` with your version. Don't let the experiment's instructions be
auto-generated where you meant to hand-author them.

**Wire up the OpenLore MCP server in Claude Code** so the agent can call `orient()`
etc. during work:

```bash
claude mcp add openlore -- openlore mcp
```

Place the inputs in the repo under `prd/` as plain reference material (do **not**
pre-author any OpenSpec specs yourself — let the harness derive them):

```
prd/prd.md
prd/toolchain-supplement.md
prd/sample-taxonomy.md
prd/phase-1-scaffold.md … prd/phase-7-cascade-invalidation-integration.md
```

Create the frozen-plan directory:

```bash
mkdir -p test-plans
```

> ⚠️ **Experiment hygiene:** nothing the harness can read may mention the
> experiment, the planted defects, scoring, or "gaps/inconsistencies." Not in
> `CLAUDE.md`, not in commit messages, not in proposal prompts.

---

## Per-phase loop (repeat for Phases 1 → 7)

Phases are sequential; each assumes prior phases are complete and their modules are
callable. Do **not** reset the OpenLore graph between phases — persistent
cross-phase memory is the point.

### Step 1 — Orient (OpenLore)

For Phase 1 there's nothing to orient against; skip. For Phases 2–7, start the
Claude Code session by having the agent orient itself in the prior phases' code
before it reads the new brief. **`orient` is an MCP tool the agent calls, not a
command you type** — you prompt the agent in plain language and it invokes the tool.
This only returns anything useful if the previous phase's `openlore analyze --force`
(Step 5) has run, so the graph reflects the latest code.

Use this generic prompt every phase, substituting the phase number and the
one-liner from the table below (keep the rest verbatim, so OpenLore's orientation
contribution stays comparable across phases):

```
Before we start Phase N, get oriented in the existing code first. Use the OpenLore
orient tool with a short description of this phase's work — "<one-liner>" — to
surface the prior-phase modules, functions, and insertion points this phase will
build on, rather than re-reading files exhaustively. Then read prd/phase-N-*.md and
the sections of prd/prd.md it cites. Don't write any code or proposal yet — just
confirm what you're building on and flag anything from earlier phases that looks
relevant or surprising.
```

One-liner per phase:

| Phase | `<one-liner>` |
|---|---|
| 2 | add the user registry, X-Username identity parsing, and the write-gating auth middleware |
| 3 | add the in-memory domain store, IDs, edges, the reachability layer, the pure §3.3 invariant engine, and the read endpoints |
| 4 | add create/edit/edge-add-remove/delete owner actions and global write serialization on top of the invariant engine |
| 5 | add proposal submission: payload parsing, change derivation and per-op routing, dependency classification, and initial latent/queued disposition |
| 6 | add the single-review loop: accept-single, reject, latent→queued promotion, and ownership transfer on accepting a create |
| 7 | add atomic accept-cascade with rollback, the three §11.4 invalidation modes with dismiss, and end-to-end integration |

The payoff is modest in Phases 2–3 (the codebase is still small) and grows in
Phases 4–7. Run it every phase anyway for consistency across the three
configurations.

### Step 2 — Author the spec (OpenSpec change proposal)

This is the forward spec step and the **main place PRD defects should surface.**
In Claude Code, hand the agent the phase brief + the full PRD + supplement and ask
for an OpenSpec change proposal scoped to this phase:

```
/opsx:propose implement phase-N per prd/phase-N-*.md

Authoritative spec is prd/prd.md (and prd/toolchain-supplement.md, incorporated by
reference). The brief scopes this phase and points at the governing PRD sections;
where the brief restates a requirement, the PRD's wording governs. Produce the
proposal, the spec deltas, and a tasks checklist for this phase's scope only.
Treat work deferred by the brief as out of scope.
```

> Slash-command name note: current OpenSpec uses the `/opsx:*` family
> (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`; expanded profile adds
> `/opsx:new`, `/opsx:continue`, `/opsx:verify`). If your installed profile differs,
> run `openspec` with no args (or check the generated command list) to see the exact
> names, and substitute consistently across all three configurations.

Let the agent surface ambiguities here naturally — **do not** coach it toward the
defects. If it raises a question about the spec, answer **only** from the PRD's own
wording; if the PRD genuinely doesn't decide something, say so plainly and let the
harness choose, recording its choice in the proposal. (That recorded choice is your
signal that it detected a gap.)

### Step 3 — Freeze the initial test plan

Before any implementation, have the agent write the phase's **initial test plan**
from the spec:

```
Write the initial test plan for phase-N to test-plans/phase-N-initial.md — what you
believe needs testing for this phase and why, derived from the spec before you write
code. This file will be frozen.
```

Commit it **on its own** so the freeze is enforced by git history, not honor system:

```bash
git add test-plans/phase-N-initial.md
git commit -m "phase-N: initial test plan (frozen)"
```

After this commit, do not edit `phase-N-initial.md` again.

### Step 4 — Implement (OpenSpec apply, under Claude Code)

```
/opsx:apply
```

The agent works the tasks checklist from the proposal, writing code and the phase's
tests. It may (and should) add tests beyond the initial plan as it discovers needs —
those go in the final plan, not back into the frozen initial plan.

### Step 5 — Re-analyze + drift check (OpenLore)

After the code lands, refresh the graph and check the new code against the
OpenSpec-authored spec:

```bash
openlore analyze --force          # refresh call graph + CODEBASE.md for next phase's orient()
openlore drift --verbose          # spec-vs-code drift on this phase's changes
openlore audit                    # coverage gaps: uncovered funcs, hub gaps, stale domains
```

`drift` compares git changes against spec mappings, so make sure Step 3's and any
WIP commits are in place (or pass `--base <ref>` to pick the comparison point).
If `drift`/`audit` flags something, feed it back to the agent and let it reconcile
code and spec the way it normally would. (Note: this catches spec-vs-code drift, not
PRD-vs-spec — see the scope note at top.)

Optionally generate spec-driven test stubs to compare against what the agent wrote:

```bash
openlore test --coverage          # which spec scenarios have corresponding tests
```

### Step 6 — Final test plan + changelog

At phase end:

```
Write test-plans/phase-N-final.md: the final test plan that supersedes the initial
one and reflects what was actually tested, plus a short changelog of how it differs
from the frozen initial plan — scenarios added, removed, or changed, and why.
```

```bash
git add -A
git commit -m "phase-N: implementation, tests, final test plan"
```

### Step 7 — Archive the change + gate

```
/opsx:archive
```

This folds the phase's change into OpenSpec's living specs so the next phase builds
on an updated spec baseline. Then stop at the phase gate.

> **Suggested gates (from the phase index):** after Phase 4 you have a complete
> multi-owner, proposal-free server — a clean checkpoint. After Phase 7 the full
> §13 matrix is covered.

---

## Verifying `POST /reset` across phases

The phase briefs require that `/reset` returns the server to fresh-boot state and
that each later phase confirms its new state is cleared by reset. Make sure each
phase's test plan (from Phase 2 onward) includes a reset-clears-my-new-state case —
this is behavior the PRD requires, not an experiment artifact, so it's fair to
expect it of every configuration equally.

---

## Quick command reference

| Purpose | Command | Where |
|---|---|---|
| Install OpenSpec | `npm i -g @fission-ai/openspec@latest` | shell, once |
| Install OpenLore | `npm i -g openlore` | shell, once |
| Init OpenSpec | `openspec init` | shell, once |
| Init OpenLore | `openlore init` | shell, once |
| Register MCP server | `claude mcp add openlore -- openlore mcp` | shell, once |
| Orient before a phase | agent prompt (calls `orient` MCP tool) | Claude Code |
| Author spec | `/opsx:propose …` | Claude Code |
| Implement | `/opsx:apply` | Claude Code |
| Archive into living spec | `/opsx:archive` | Claude Code |
| Refresh graph | `openlore analyze --force` | shell, per phase |
| Drift check | `openlore drift --verbose` | shell, per phase |
| Coverage gaps | `openlore audit` | shell, per phase |
| Test-scenario coverage | `openlore test --coverage` | shell, optional |
| Environment self-check | `openlore doctor` | shell, when stuck |

**Deliberately unused** (per your decisions): `openlore generate`, `openlore verify`,
`openlore decisions`, `--adr` anything, the decisions pre-commit hook.

---

## Suggested `CLAUDE.md`

Keep it to durable project facts and the workflow contract — the things you'd tell
any engineer joining the project. **No** mention of the experiment, defects, or
scoring. Here's a starting point:

```markdown
# Project: Collaborative Taxon Tree Server

## Requirements (source of intent)
- `prd/prd.md` is the authoritative statement of *requirements*. `prd/toolchain-supplement.md`
  is incorporated by reference and equally binding for toolchain and test mechanics;
  domain requirements live in `prd/prd.md`.
- `prd/phase-N-*.md` scope the requirements into sequential phases. Where a brief restates
  a requirement, `prd/prd.md`'s wording governs. Build only the current phase's scope;
  respect each brief's "explicitly deferred" list.
- `prd/sample-taxonomy.md` is non-normative test data — a naming resource for tests, not a
  requirements input.

## Specification (what we build from)
- The OpenSpec specs under `openspec/specs/` (and the per-phase change proposals) are *the
  specification* — derived from the requirements and authoritative for implementation. The
  code implements the spec; keep them aligned.
- Each phase: turn the phase's requirements into an OpenSpec change, implement against it,
  then archive it into the living specs. Consult the spec during coding, not the raw
  requirements.
- When requirements are ambiguous, contradictory, or silent on something the spec needs,
  surface it in the change proposal and decide explicitly rather than inventing behaviour.
  Resolve from `prd/prd.md`'s wording where it speaks; where it's silent, record the
  decision. Reconciling that gap is the job — don't override the derived spec with the raw
  PRD.
  
## How we work
- Spec-driven via OpenSpec: every phase is an OpenSpec change — propose, apply,
  archive. Align the spec before writing code.
- When the spec is ambiguous or silent on something you need, do not silently invent
  behavior: surface the question, decide explicitly, and record the decision in the
  change proposal. Resolve from the PRD's own wording wherever it speaks.
- Use the OpenLore `orient` tool to get your bearings in existing code before
  starting a phase, instead of re-reading files exhaustively.

## Testing
- Each phase ships an automated test suite for the behavior it introduces, run by a
  single documented command (per the toolchain supplement).
- Two test-plan artifacts per phase: `test-plans/phase-N-initial.md` (written from
  the spec before implementation, then frozen — never edited after its commit) and
  `test-plans/phase-N-final.md` (what was actually tested, with a changelog of how it
  differs from the initial plan). Add tests freely as you discover needs; those
  additions belong in the final plan, not the frozen initial one.
- Treat the PRD's §14 "accepted properties" as intended behavior to verify.

## State reset
- `POST /reset` restores fresh-boot state and is callable without a registered user.
  Every phase that adds state confirms `reset` clears that state.
```

If you let `openlore analyze --ai-configs` generate a `CLAUDE.md`, replace its body
with the above (you can keep any OpenLore "how to use orient/the graph" section it
adds, since that's legitimately part of this configuration).
```