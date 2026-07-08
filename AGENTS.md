# AGENTS.md

## Root Cause Discipline

When the user reports a bug, a structure violation, a workflow failure, or any repeatable defect, do not fix only the surface symptom. Follow this sequence:

1. **Diagnose the root cause** — Trace through every layer from the final symptom back to the originating gap. At minimum, check: where the rule or invariant was defined, how it was communicated to executing agents, whether reviewers checked it, and whether automated enforcement existed along the path.
2. **Fix the root cause, not just the instance** — If the gap is a missing rule in a prompt, add it to the prompt. If a reviewer checks existence but not exclusivity, add the exclusivity check. If lint runs too late in the pipeline, pull it forward. The goal is that the same class of failure can never happen again.
3. **Add enforcement at the lowest durable layer** — Tool-level enforcement > lint > reviewer > prompt. If a constraint can be checked by code, write the code. If it can only be a prompt instruction, make sure the instruction is in the agent's required reading, not in a reference file it never loads.
4. **Verify the gap is closed** — After the fix, reproduce the original triggering scenario and confirm the new enforcement layer catches it.

When in doubt, ask: *if a fresh agent or a different runtime replays the exact same task tomorrow, will it hit the same failure?* If the answer is yes, the root cause is not yet fixed.

## Verification Scope & Feedback

- After a user challenges a result, status, or test claim, first answer with evidence: exact command or workflow target, exit code, passed/failed/skipped counts, and artifact paths when available.
- Scope words must be literal. Do not say or imply "full E2E", "all cases", "main flow passed", or equivalent unless every declared case in that scope was actually executed and passed.
- A generated runner passing is only evidence for that generated runner. If a broader Archive, PRD, product flow, or customer flow exists, state the executed subset and the unverified remainder.
- When feedback exposes a reusable failure mode, decide whether the durable fix belongs in global agent rules, the project `AGENTS.md`, the responsible skill, or multiple layers. Add the rule to every applicable layer within the current write scope.
- If a prior claim was broader than the evidence, correct it plainly before continuing.

## Incomplete Task Handling

- When a task is not fully done (blocked, partial, or beyond current scope/time), deliver a detailed, actionable solution. Never mask an incomplete result with vague summary language.
- State concrete progress: what is done, the exact step it stalled at, and the failure or blocker with evidence.
- Give the real fix path: concrete next steps and the files, commands, or parameters involved.
- Spell out the unfinished remainder and risks: what is left, known pitfalls or prerequisites, and who or what must decide or supply missing info.
- Never present a partial result as complete.

## Playwright Automation Hard Gate

- When generating or repairing Playwright UI automation, completion requires all three artifacts:
  1. The target `full.spec.ts` runner has been executed and passed.
  2. The run produced Allure result artifacts under the feature run directory.
  3. The platform under test produced the required business record data for the case's core workflow.
- A read-only contract script is not a completed Playwright automation deliverable unless the user explicitly requested read-only coverage.
- When the user requests UI automation, business mutations must go through UI actions. Do not use backend API calls to create, edit, save, import, execute, delete, or status-check business records unless the user explicitly authorizes that shortcut for that specific action.
- If a case requires creating, importing, running, publishing, mapping, or checking data, the script must perform that state-changing action through product UI and assert the resulting record by record name, ID, status, screenshot, DOM text, Allure artifact, or equivalent durable UI evidence.
- Before running bulk-generated UI cases, audit each case's UI-constrained fields and rule payload against the authoritative source: field length limits, expected rule count, package count, data source type, duplicate-rule constraints, sampling, partitions, filters, and strong/weak rule settings.
- For UI fields with hard character limits, generate the exact value that will be submitted through the UI before running the case. Do not rely on API-only names that the UI cannot save. When Chinese punctuation causes a length failure, normalize the submitted UI value to the product-accepted form and preserve the full title only in evidence or mapping data.
- Bulk Playwright scripts must not be treated as correct just because a generator produced them. For each declared case, compare the generated rule list to the original case source before execution: expected monitor-rule count, no duplicate field/function/type combinations, rule package stitch count, and data source split must match the source case.
- Before rebuilding shared-environment business records, clean or isolate historical automation data in the target project and verify through the product UI that stale rule sets and rule tasks no longer affect the run, unless the user explicitly asks to reuse existing records.
- Old record ID maps are evidence only. After a user reports that UI edit/save fails or generated records are wrong, do not use prior interface-created ruleSetId/monitorId mappings as source of truth for completion or reruns.
- A bulk UI runner must fail fast for any selected case that lacks an explicit, source-audited rule specification. A generic JS generator is not enough evidence for data-quality rule cases unless an audit test proves the submitted UI name, data source, monitor-rule count, duplicate-rule fingerprint check, rule package stitch count, sampling, partition, filter, and strong/weak settings for each selected case.
- Generated data must use a unique automation prefix and the handoff must report the record name or ID, UI route evidence, screenshot/result paths, command, exit code, and pass/fail/skip counts.
- If the platform cannot produce the record because of data, permission, environment, or product blockers, stop claiming completion. Classify the blocker, list the unfinished case in handoff `excluded_cases` or `unresolved_blockers`, and provide the next runnable fix path.
