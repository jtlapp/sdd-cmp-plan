# Development process — Claude Code alone (control)

**Note:** Once I got the workflow started, the LLM proceeded with the plan without my
having to dictate each step, because `CLAUDE.md` provided most of the steps. 

This is the per-phase procedure for the **Claude Code only** configuration — the
experiment's **control**. No spec framework, no architectural-memory tool, no
behavioural-spec language. The whole point is to capture what Claude Code does on its
own when handed the PRD and the phase briefs.

> **Control discipline (the one rule that matters most).** Add *nothing* to this
> config beyond your two required impositions — implementing in phases, and recording
> a frozen initial + final test plan per phase. In particular, **do not** introduce
> spec files, analysis passes, drift/reconciliation steps, dependency graphs, or
> structured proposal artifacts. Those are the very things the other two
> configurations add; if you sneak them in here, the control stops being a control and
> you can no longer attribute differences to the tooling. When in doubt, leave it out
> and let Claude Code work the way it normally would.

---

## What's deliberately absent

To keep the comparison clean, this config does **not** use any of:

- OpenSpec (`/opsx:*`, `openspec/` specs, change proposals)
- OpenLore (`analyze`, `orient`, `drift`, `audit`, the graph)
- Allium (`.allium` specs, `elicit`/`propagate`/`weed`, `allium` CLI)
- Any other SDD/spec/memory layer

The PRD and phase briefs are read directly; the agent reasons about them in-context
the way it would for any task. Standard Claude Code affordances that are *part of base
Claude Code* are fine and should be left at their defaults: reading files, its own
to-do/checklist behaviour, sub-agents, running the test command, etc. The line to hold
is: nothing that imposes an external spec/analysis methodology.

---

## 0. One-time setup (before Phase 1)

```bash
git init
mkdir -p test-plans
```

Put the inputs under `prd/` as plain reference material:

```
prd/prd.md
prd/toolchain-supplement.md
prd/sample-taxonomy.md
prd/phase-1-scaffold.md … prd/phase-7-cascade-invalidation-integration.md
```

A minimal `CLAUDE.md` (see end) is allowed — it's a base Claude Code feature and every
config gets an equivalent one, so it doesn't break control status. Keep it to the same
durable project facts the other configs' files state; do not add methodology the other
files don't.

> ⚠️ **Experiment hygiene.** Nothing the agent can read may mention the experiment, the
> planted defects, scoring, or "gaps/inconsistencies" — not in `CLAUDE.md`, commits, or
> prompts. If the agent raises a question about the spec, answer **only** from the PRD's
> own wording; where the PRD genuinely doesn't decide something, say exactly that and
> let the agent choose and record its choice. Don't steer it toward any particular
> resolution. Whatever it surfaces unprompted is the detection signal.

---

## Per-phase loop (repeat for Phases 1 → 7)

Phases are sequential; each builds on the prior phases' code in the same repo.

### Step 1 — Hand off the phase

Start the phase by pointing the agent at the brief and the PRD. This is deliberately a
plain prompt — no orientation tool, no spec step:

```
We're building the system described in `prd/prd.md` (with `prd/toolchain-supplement.md`, incorporated
by reference and equally binding for toolchain/test mechanics). We work in sequential
phases. This phase is Phase N — implement only what `prd/phase-N-*.md` puts in scope, and
respect its "explicitly deferred" list. `prd/prd.md` is authoritative; where the brief
restates a requirement, the PRD's wording governs. `prd/sample-taxonomy.md` is
non-normative naming data for tests only.

Read `prd/phase-N-*.md` and the PRD sections it cites, then tell me your plan for this
phase before you start coding. Raise anything in the spec that's unclear or that you'd
have to decide yourself.
```

That last sentence is the control's only defect-surfacing affordance: a plain prompt to
flag unclear/under-specified things. It mirrors what a competent engineer does with a
PRD and nothing more. Don't elaborate it into a spec-analysis checklist.

### Step 2 — Freeze the initial test plan

I never had to ask the LLM to write the initial test plan before implementation, because
this was in `CLAUDE.md`, and it always did so on its own.

Commit it on its own so the freeze is enforced by git history:

```bash
git add test-plans/phase-N-initial.md
git commit -m "phase-N: initial test plan (frozen)"
```

After this commit, do not edit `phase-N-initial.md` again. (This freeze + the final
plan are impositions shared by all three configs, so they don't compromise control
status — they're applied identically everywhere.)

### Step 3 — Implement

After writing the test plan, Claude Code would usually ask whether to implement the
plan, and I'd say "yes," but I think sometimes I had to ask it to do so directly.

Let the agent work however it normally does. Run the suite via the supplement's single
documented command and get it green before closing the phase.

### Step 4 — Final test plan + changelog

```
Write `test-plans/phase-N-final.md`: the final plan superseding the initial one,
reflecting what was actually tested (including anything added while building), plus a
short changelog of how it differs from the frozen initial plan — scenarios added,
removed, or changed, and why.
```

```bash
git add -A
git commit -m "phase-N: implementation, tests, final test plan"
```

### Step 5 — Phase gate

Stop. The next phase builds on this phase's committed code.

> **Suggested gates (from the phase index):** after Phase 4 the system is a complete
> multi-owner, proposal-free server. After Phase 7 the full §13 matrix is covered.

---

## Verifying `POST /reset` across phases

From Phase 2 on, each phase's test plan should include a reset-clears-my-new-state case
(`POST /reset` returns the server to fresh-boot state and is callable without a
registered user). PRD-required behaviour, expected of every configuration equally.

---

## Quick command reference

| Purpose | Command | Where |
|---|---|---|
| Init repo | `git init` | shell, once |
| Hand off a phase | plain prompt pointing at `prd/phase-N-*.md` | Claude Code, per phase |
| Implement | plain prompt | Claude Code, per phase |
| Run tests | the single command from `prd/toolchain-supplement.md` | shell, per phase |
| Freeze initial plan | `git commit` of `test-plans/phase-N-initial.md` | shell, per phase |

There are intentionally **no tool-specific commands** here — that absence is the
control.

---

## Suggested `CLAUDE.md`

Keep it to the same durable facts the other configs state, minus any methodology those
files add. **No** mention of the experiment, defects, or scoring.

```markdown
# Project: Collaborative Taxon Tree Server

## Source of truth
- `prd/prd.md` is the authoritative specification. `prd/toolchain-supplement.md` is
  incorporated by reference and equally binding: it governs toolchain and test mechanics
  (runtime, module system, build, test framework); `prd/prd.md` governs domain behavior.
- `prd/phase-N-*.md` scope the work into sequential phases. Where a brief restates a
  requirement, the PRD's wording governs. Build only the current phase's scope; respect
  each brief's "explicitly deferred" list.
- `prd/sample-taxonomy.md` is non-normative test data (fiction-genre names) — a naming
  resource for tests, not a requirements input.

## How we work
- Work one phase at a time. Before coding a phase, read its brief and the PRD sections
  it cites, and state a brief plan.
- If a requirement is unclear or underdetermined when you go to build against it,
  don't guess: note it and resolve it explicitly before relying on it, resolving from
  `prd/prd.md`'s wording where it speaks.

## Testing
- Each phase ships an automated test suite for the behavior it introduces, run by the
  single documented command from the toolchain supplement.
- Two test-plan artifacts per phase: `test-plans/phase-N-initial.md` (written from the
  spec before implementation, then frozen — never edited after its commit) and
  `test-plans/phase-N-final.md` (what was actually tested, with a changelog of how it
  differs). Add tests freely as you discover needs; those additions belong in the final
  plan, not the frozen initial one.
- Treat the PRD's §14 "accepted properties" as intended behavior to verify.

## State reset
- `POST /reset` restores fresh-boot state and is callable without a registered user.
  Every phase that adds state confirms `reset` clears that state.
```

---

## Reading the control's results

- The control's **only** defect-surfacing channels are (a) the agent spontaneously
  flagging something while reading the PRD/brief, and (b) a planted defect manifesting
  as a contradiction or gap the agent trips over while implementing or writing tests.
  There is no structural pass forcing the issue, so expect detection to be more
  incidental and more variable run-to-run than in the spec-tooled configs. That
  variability is a finding, not a flaw in the setup.
- Because there's no external spec artifact, the agent's **initial test plan** and any
  plan/questions it states in Step 1 are your richest written evidence of what it
  anticipated. Capture them carefully — they're the control's analogue to the other
  configs' specs/proposals.
- Hold the phase boundaries, the frozen/final discipline, the model, and the
  experiment-hygiene rules identical to the other two configs. Tooling is the only
  variable.