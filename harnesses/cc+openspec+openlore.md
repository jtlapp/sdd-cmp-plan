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
>   detection. Expect PRD defects to surface in the OpenSpec explore/propose step and
>   in Claude Code reading the PRD — not from OpenLore.

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

**Record the toolchain versions.** Because the installs above are global (unpinned),
nothing in the repo records which version produced a run. Capture them once per run so
results stay reconstructable:

```bash
openspec --version && openlore --version   # paste into TOOLCHAIN.md or the run log
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

**Remove the decisions pre-commit hook if one was installed.** `openlore init` /
`analyze --ai-configs` may install a decisions/consolidation **pre-commit gate** that
runs an LLM extraction at commit time. That is the ADR mechanism you excluded, and a
commit-time LLM step injects nondeterminism into a controlled comparison. Check and
disable it:

```bash
cat .git/hooks/pre-commit           # look for an openlore decisions/consolidation gate
# remove or neutralize that hook, and check .openlore/ config for a decisions gate
```

Telling the agent (in `CLAUDE.md`) not to call `record_decision` does **not** disable
this hook — you must remove it here.

**Wire up the OpenLore MCP server in Claude Code** so the agent can call `orient`
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
> `CLAUDE.md`, not in commit messages, not in explore/propose prompts.

---

## Per-phase loop (repeat for Phases 1 → 7)

Phases are sequential; each assumes prior phases are complete and their modules are
callable. Do **not** reset the OpenLore graph between phases — persistent
cross-phase memory is the point.

Your installed OpenSpec profile is **core**: the available commands are
`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, and `/opsx:archive` (confirm with
`ls .claude/commands/opsx/`). The per-phase loop is built from exactly those four.

### Step 1 — Orient (OpenLore)

UPDATE: Section deleted because I opted not to include anything from OpenLore
but drift checks.

### Step 2 — Explore, then author the spec (OpenSpec)

UPDATE: The first time I opened Claude Code in this repo, it automatically picked
up phase one and entered explore mode for it. Each subsequent time (for each
subsequent session), I started explore mode with `/opsx:explore`, at which point
it immediately picked up the next available phase and began the exploration process.

After the LLM felt it had answes to its questions, it asked whether to write the
proposal, because this information was in `CLAUDE.md`. I don't believe I ever had
to type the following, just had to confirm it was okay to write the proposal:

```
/opsx:propose phase-N-<short-name>
```
e.g. `/opsx:propose phase-3-domain-invariants`. This scaffolds the proposal, the spec
deltas, and the tasks checklist for this phase's scope, using the explored context.

### Step 3 — Freeze the initial test plan

After the LLM completed the proposal, it would either ask whether it should write the
initial test plan, in which case I said "yes," or whether it should apply the proposal,
in which case I responded as follows:

```
Write the initial test plan.
```

Commit it **on its own** so the freeze is enforced by git history, not honor system:

```bash
git add test-plans/phase-N-initial.md
git commit -m "phase-N: initial test plan (frozen)"
```

After this commit, do not edit `phase-N-initial.md` again.

### Step 4 — Implement (OpenSpec apply, under Claude Code)

After it completed writing the test plan, it usually did not offer a next step,
so I had to type:

```
/opsx:apply
```

The agent works the tasks checklist from the proposal, writing code and the phase's
tests. It may (and should) add tests beyond the initial plan as it discovers needs —
those go in the final plan, not back into the frozen initial plan.

### Step 5 — Re-analyze + drift check (OpenLore)

The LLM would automatically test for drift with OpenLore, so I never had to run
the following:

```bash
openlore drift --verbose          # spec-vs-code drift on this phase's changes
```

`drift` compares git changes against spec mappings, so make sure Step 3's and any
WIP commits are in place (or pass `--base <ref>` to pick the comparison point).
If `drift`/`audit` flags something, feed it back to the agent and let it reconcile
code and spec the way it normally would. (Note: this catches spec-vs-code drift, not
PRD-vs-spec — see the scope note at top.)

### Step 6 — Final test plan + changelog

At phase end:

```
Write `test-plans/phase-N-final.md`: the final test plan that supersedes the initial
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
on an updated spec baseline. (On the core profile, archive also performs the
delta-into-main-spec merge; there is no separate `/opsx:sync` step.) Then stop at the
phase gate.

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
| Record tool versions | `openspec --version && openlore --version` | shell, per run |
| Init OpenSpec | `openspec init` | shell, once |
| Init OpenLore | `openlore init` | shell, once |
| Register MCP server | `claude mcp add openlore -- openlore mcp` | shell, once |
| Orient before a phase | agent prompt (calls `orient` MCP tool) | Claude Code |
| Explore a phase | `/opsx:explore` (+ framing discussion) | Claude Code |
| Author spec | `/opsx:propose phase-N-<name>` | Claude Code |
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

@.openlore/analysis/CODEBASE.md

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
- Each phase: explore the phase's requirements, turn them into an OpenSpec change,
  implement against it, then archive it into the living specs. Consult the spec during
  coding, not the raw requirements.
- If a requirement is unclear or underdetermined when you go to specify it, don't
  guess: raise it during explore or in the change proposal and resolve it explicitly
  before relying on it. Resolve from `prd/prd.md`'s wording; keep the derived spec
  aligned with it rather than overriding the spec with the raw PRD.
  
## How we work
- Spec-driven via OpenSpec: every phase is an OpenSpec change — explore, propose, apply,
  archive. Align the spec before writing code.

## OpenLore

After implementing a phase and getting its tests passing and before writing the final
test plan, check spec drift via the `check_spec_drift` tool. Report a brief summary
of the result either way: state that the check ran and, if clean, say so; if it
reports drift, list each item and its category (e.g. code changed but spec not updated,
a new file with no spec, or a spec referencing deleted code). Then reconcile any drift:
update the spec to match the intended behavior, or fix the code if the spec is right,
and re-run until clean. If the drift reflects a deliberate, spec-backed change you
can't resolve, note it in the summary rather than forcing it.

Do NOT use `record_decision` or any ADR/decision-recording mechanism in this project.

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
with the above. Keep the `@.openlore/analysis/CODEBASE.md` import at the top — that
inlines OpenLore's regenerated codebase map into context each session and is
legitimately part of this configuration.