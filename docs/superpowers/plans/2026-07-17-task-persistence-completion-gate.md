# Task Persistence Completion Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent voluntary handoff while safe, authorized work remains and make the kata case-edit workflow enforce that rule.

**Architecture:** A global instruction contract supplies the machine-wide default, the kata contract supplies repository-local precedence, and `case-edit` supplies workflow completion criteria. A repository test protects the project and skill layers, while direct checks protect machine-local configuration.

**Tech Stack:** Markdown instruction files, TOML configuration, Bun test.

## Global Constraints

- Do not stop merely because a task is large, lengthy, context-heavy, or at a batch boundary.
- Do not ask the user whether to continue when the next action is safe, in scope, and immediately executable.
- Do not claim the original 989-case standardization is complete until every declared case and every delivery gate is complete.
- Preserve unrelated tracked, untracked, ignored, authentication, and runtime files.
- Do not add a transcript-parsing Stop hook.

---

### Task 1: Repository completion contract test

**Files:**
- Create: `.claude/scripts/_shared/tests/skills/completion-contract.test.ts`

**Interfaces:**
- Consumes: `AGENTS.md` and `.claude/skills/case-edit/SKILL.md`
- Produces: a failing test before the contract exists and a passing regression test afterward

- [x] **Step 1: Write the failing test**
- [x] **Step 2: Run it and confirm both assertions fail for the missing gates**
- [x] **Step 3: Re-run after Tasks 3 and 4 and confirm both assertions pass**

### Task 2: Machine-wide Codex contract

**Files:**
- Modify: `/Users/poco/.codex/AGENTS.md`
- Modify: `/Users/poco/.codex/config.toml`

**Interfaces:**
- Consumes: Codex global instruction and feature configuration
- Produces: global persistence rules and explicit `goals = true`

- [x] **Step 1: Replace the incomplete-task loophole with the completion predicate**
- [x] **Step 2: Add explicit blockers, non-blockers, and pre-final continuation audit**
- [x] **Step 3: Add `goals = true` without changing unrelated configuration**

### Task 3: Kata repository contract

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: repository instruction precedence
- Produces: the same completion predicate plus project-specific partial-blocker behavior

- [x] **Step 1: Replace `Incomplete Task Handling` with `Task Persistence & Completion Gate`**
- [x] **Step 2: Preserve evidence requirements for genuine blockers**

### Task 4: Case-edit workflow gate

**Files:**
- Modify: `.claude/skills/case-edit/SKILL.md`

**Interfaces:**
- Consumes: existing Archive/XMind workflow and delivery checks
- Produces: a functional-family semantic review loop with exact exit criteria

- [x] **Step 1: Add the continuation loop and forbid voluntary handoff**
- [x] **Step 2: Define semantic review, lint, Archive, and XMind exit criteria**
- [x] **Step 3: Define how to continue around case-specific genuine blockers**

### Task 5: Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-17-task-persistence-completion-gate.md`

**Interfaces:**
- Consumes: all changed contracts
- Produces: fresh commands, exit codes, and pass/fail counts

- [x] **Step 1: Run the focused Bun regression test**
- [x] **Step 2: Run kata skill structure and runtime synchronization checks**
- [x] **Step 3: Verify the global instruction has no old loophole and TOML enables goals**
- [x] **Step 4: Inspect the final diff for unrelated changes and mark this plan complete**

## Verification Record

- RED: `bun test ./.claude/scripts/_shared/tests/skills/completion-contract.test.ts`
  exited 1 with 0 pass and 2 fail before the rules were changed.
- GREEN: the focused completion and runtime workflow tests exited 0 with
  10 pass and 0 fail.
- `kata skills sync-check`, Codex skill audit, TypeScript type-check, and the
  scoped Biome check all exited 0.
- Codex CLI reported `goals stable true`; the global and project instruction
  files contain the new gate and no longer contain `beyond current scope/time`.
- Plugin tests exited 0 with 153 pass and 0 fail. Tool-package tests exited 0
  with 71 pass and 0 fail.
- Full repository CI is not green due to existing unrelated checks: Biome
  reports 2 errors and 33 warnings outside this diff, and the full Bun suite
  reports 1280 pass, 1 fail, and 1 skip because the public-command help test
  exceeds its fixed 30-second per-test timeout.
