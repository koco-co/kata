import { afterEach, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  parseWorkflow,
  resetSlotCache,
  V2_WARN_PREFIX,
  validateWorkflow,
} from "../../src/skills/workflow-schema.ts";

// engine/tests/skills/ → 上溯 3 层定位 worktree root；避免依赖 process.cwd
const PROJECT_ROOT = resolve(import.meta.dir, "../../..");

const V2 = `
name: case-draft
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high
metadata:
  event_kinds_emitted: [phase_entered, phase_exited, artifact_written]
  artifact_kinds_produced: [archive, xmind]
steps:
  - id: source-intake
    dispatch: inline
    blackboard_inputs: [user_input]
    blackboard_outputs: [source_refs]
    failure_modes: [missing_source]
  - id: case-draft
    dispatch: subagent
    model: sonnet
    effort: high
    workers: [case-worker]
    blackboard_inputs: [source_refs]
    blackboard_outputs: [draft_archive]
    failure_modes: [worker_timeout]
  - id: output
    dispatch: inline
    blackboard_inputs: [draft_archive]
    blackboard_outputs: [archive_path]
    validators: [archive-format]
    failure_modes: [io_error]
`;

describe("workflow schema v2", () => {
  afterEach(() => {
    resetSlotCache();
  });

  test("parses top-level v2 fields", () => {
    const wf = parseWorkflow(V2);
    expect(wf.version).toBe(2);
    expect(wf.default_dispatch).toBe("inline");
    expect(wf.default_model).toBe("sonnet");
    expect(wf.default_effort).toBe("high");
    expect(wf.metadata?.event_kinds_emitted).toContain("artifact_written");
    expect(wf.metadata?.artifact_kinds_produced).toEqual(["archive", "xmind"]);
  });

  test("parses per-step v2 fields", () => {
    const wf = parseWorkflow(V2);
    const draftStep = wf.steps.find((s) => s.id === "case-draft");
    expect(draftStep?.dispatch).toBe("subagent");
    expect(draftStep?.model).toBe("sonnet");
    expect(draftStep?.effort).toBe("high");
    expect(draftStep?.workers).toEqual(["case-worker"]);
  });

  test("validate v2 passes when slots are in registry", () => {
    const errors = validateWorkflow(parseWorkflow(V2), PROJECT_ROOT);
    expect(errors).toEqual([]);
  });

  test("validate v2 warns on unknown dispatch enum (soft)", () => {
    const bad = V2.replace("dispatch: subagent", "dispatch: magical");
    const errors = validateWorkflow(parseWorkflow(bad), PROJECT_ROOT);
    expect(errors.some((e) => e.startsWith(`${V2_WARN_PREFIX} step 'case-draft' dispatch`))).toBe(
      true,
    );
  });

  test("v2 with blackboard_outputs_by_mode parses mode-specific outputs", () => {
    const modeWf = `
name: defect-analyze
version: 2
default_dispatch: inline
default_model: sonnet
default_effort: high
steps:
  - id: analyze
    dispatch: subagent
    model: sonnet
    effort: high
    blackboard_inputs: [mode, severity]
    blackboard_outputs_by_mode:
      bug:      [root_cause, evidence_refs]
      conflict: [side_a_intent, side_b_intent, resolution_plan]
    validators_by_mode:
      bug:      [analysis-schema]
      conflict: [conflict-analysis-schema]
    failure_modes: [worker_timeout]
`;
    const wf = parseWorkflow(modeWf);
    const step = wf.steps[0];
    expect(step?.blackboard_outputs_by_mode?.bug).toEqual(["root_cause", "evidence_refs"]);
    expect(step?.blackboard_outputs_by_mode?.conflict).toEqual([
      "side_a_intent",
      "side_b_intent",
      "resolution_plan",
    ]);
  });
});
