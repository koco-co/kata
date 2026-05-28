import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkWorkflows, formatWorkflowCheckReport } from "../../src/skills/workflow-check.ts";

const tempRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-workflow-check-"));
  tempRoots.push(root);
  return root;
}

function writeFile(root: string, rel: string, body: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
}

const VALID_YAML = `name: case-draft
version: 1
entry: /case-draft
description: 根据需求源生成 QA 用例的完整流程。
steps:
  - id: source-intake
    next: [output]
    blackboard_inputs: []
    blackboard_outputs: [sources, source_refs]
    references: []
    failure_modes: []
    human_gates: []
    verification: []
  - id: output
    blackboard_inputs: [sources, source_refs]
    blackboard_outputs: [artifacts, handoff]
    references: []
    failure_modes: []
    human_gates: []
    verification: []
`;

describe("workflow check", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("passes valid runtime workflow yaml", () => {
    const root = makeRoot();
    writeFile(root, ".claude/contracts/workflows/case-draft.yaml", VALID_YAML);

    const report = checkWorkflows(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
    expect(formatWorkflowCheckReport(report, root)).toBe("workflow check passed");
  });

  test("flags missing workflow contract directory", () => {
    const root = makeRoot();

    const report = checkWorkflows(root);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "WORKFLOW_CONTRACT_MISSING",
        message: "workflow contract directory is required",
      }),
    );
  });

  test("flags yaml schema errors", () => {
    const root = makeRoot();
    writeFile(
      root,
      ".claude/contracts/workflows/bad.yaml",
      "name: bad\nversion: 1\nentry: /bad\ndescription: x\nsteps:\n  - id: a\n    next: [missing]\n    blackboard_inputs: []\n    blackboard_outputs: []\n    references: []\n    failure_modes: []\n    human_gates: []\n    verification: []\n",
    );

    const report = checkWorkflows(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "WORKFLOW_SCHEMA_ERROR")).toBe(true);
  });

  test("formats failures with relative paths", () => {
    const root = makeRoot();

    const text = formatWorkflowCheckReport(checkWorkflows(root), root);
    expect(text).toContain("workflow check failed");
    expect(text).toContain(".claude/contracts/workflows");
  });
});
