# Task Persistence Completion Gate Design

## Problem

The existing global and kata instructions explain how to report unfinished work,
but they do not first require the agent to continue while a safe, in-scope,
immediately executable action remains. The phrase `beyond current scope/time`
also turns task size or turn duration into an accepted reason to hand work back
to the user. For long semantic case-edit jobs, the skill defines delivery checks
but not a continuation loop, so an agent can report a remaining count and ask
the user to say “continue”.

## Approved Approach

Apply one completion predicate at three durable layers:

1. Global Codex instructions define the default persistence behavior for every
   project on this machine.
2. The kata project instructions repeat the gate and make it enforceable by a
   repository test.
3. `case-edit` turns the gate into workflow-specific completion criteria for
   large semantic standardization jobs.

Explicitly enable the product-native `goals` feature. Goals provide automatic
continuation for work launched as a goal; the instruction layers still govern
ordinary non-goal tasks.

## Completion Predicate

A task is unfinished while at least one safe, in-scope, immediately executable
next action remains. While that predicate is true, the agent continues instead
of ending the turn, asking whether to continue, or replacing execution with a
status report.

Stopping is allowed only when:

- every requested deliverable and verification gate is complete;
- the user explicitly asks to stop, pause, or only report status; or
- progress requires new user authority, unavailable essential input, or an
  external-state change that cannot be produced from the authorized scope.

Task size, elapsed time, context length, token use, remaining item count, and a
convenient batch boundary are not blockers.

## Case-edit Gate

For bulk semantic standardization, `archive.md` remains the editing source.
Cases are processed by functional family and each case is semantically reviewed;
conversion or mechanical rewriting is not completion. The loop continues until:

- every declared case has been reviewed;
- `kata cases lint --scope <feature-dir> --exit-code` reports zero violations;
- Archive validation passes;
- XMind is regenerated from the final Archive; and
- Archive/XMind counts and case fields agree.

If a genuine blocker applies only to some cases, the agent records those exact
cases and continues every independent unblocked case before stopping.

## Enforcement and Verification

A Bun test reads the kata `AGENTS.md` and `case-edit/SKILL.md` and asserts the
required completion language remains present while the old
`beyond current scope/time` loophole remains absent. Global instructions and
`config.toml` are verified directly because they are machine-local and must not
be referenced by repository CI.

A generic Stop hook is intentionally excluded. Its transcript input is not a
stable task-state interface and cannot reliably distinguish completion from a
legitimate stop. A future hook is appropriate only when it reads a deterministic
workflow state artifact rather than inferring status from conversation text.
