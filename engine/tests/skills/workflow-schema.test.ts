import { describe, expect, test } from "bun:test";
import { parseWorkflow, validateWorkflow } from "../../src/skills/workflow-schema.ts";

const VALID_WORKFLOW = `
name: case-draft
version: 1
entry: /case-draft
description: 根据需求源生成 QA 用例的完整流程。
steps:
  - id: source-intake
    next: [module-identify]
    blackboard_outputs: [sources, source_refs]
    references: [.claude/skills/case-draft/SKILL.md]
    failure_modes: [SOURCE_FETCH_BLOCKED]
    human_gates: []
    verification: []
  - id: module-identify
    next: [output]
    blackboard_inputs: [sources]
    blackboard_outputs: [decisions]
  - id: output
    blackboard_inputs: [sources, decisions]
    blackboard_outputs: [artifacts, handoff]
`;

describe("workflow schema", () => {
  test("parses a well-formed workflow YAML", () => {
    const workflow = parseWorkflow(VALID_WORKFLOW);
    expect(workflow.name).toBe("case-draft");
    expect(workflow.version).toBe(1);
    expect(workflow.steps).toHaveLength(3);
  });

  test("validate passes on a well-formed workflow", () => {
    const errors = validateWorkflow(parseWorkflow(VALID_WORKFLOW));
    expect(errors).toEqual([]);
  });

  test("flags duplicate step ids", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    next: [a]
  - id: a
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("duplicate step id"))).toBe(true);
  });

  test("flags step.next that references unknown id", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    next: [missing]
  - id: b
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("unknown step id 'missing'"))).toBe(true);
  });

  test("flags workflow without a terminal step", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    next: [b]
  - id: b
    next: [a]
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("no terminal step"))).toBe(true);
  });

  test("flags blackboard slot outside the first-version schema", () => {
    const workflow = parseWorkflow(`
name: x
version: 1
entry: /x
description: x
steps:
  - id: a
    blackboard_outputs: [made_up_slot]
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("unknown blackboard slot 'made_up_slot'"))).toBe(true);
  });

  test("flags missing required top-level fields", () => {
    const workflow = parseWorkflow(`
name: x
steps:
  - id: a
`);
    const errors = validateWorkflow(workflow);
    expect(errors.some((e) => e.includes("version"))).toBe(true);
    expect(errors.some((e) => e.includes("entry"))).toBe(true);
    expect(errors.some((e) => e.includes("description"))).toBe(true);
  });
});
