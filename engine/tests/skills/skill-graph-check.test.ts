import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkSkillGraph,
  formatSkillGraphCheckReport,
} from "../../src/skills/skill-graph-check.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-skill-graph-"));
  tempRoots.push(root);
  return root;
}

function writeRuntimeSkill(root: string, name: string): void {
  mkdirSync(join(root, ".claude", "skills", name), { recursive: true });
  mkdirSync(join(root, ".agents", "skills", name), { recursive: true });
}

function writeGraph(root: string, body: string): void {
  const dir = join(root, ".claude", "contracts");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "skill-graph.yaml"), body);
}

describe("skill graph check", () => {
  test("passes when graph covers every runtime skill", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-draft");
    writeGraph(
      root,
      `skills:
  case-draft:
    user_entry: /case-draft
    consumes: [prd-source]
    produces: [archive-md]
    related: []
`,
    );

    const report = checkSkillGraph(root);

    expect(report).toEqual({ passed: true, violations: [] });
    expect(formatSkillGraphCheckReport(report, root)).toBe("skill graph check passed");
  });

  test("fails when graph file is absent", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-draft");

    const report = checkSkillGraph(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_GRAPH_MISSING",
        path: ".claude/contracts/skill-graph.yaml",
      }),
    );
  });

  test("fails when a runtime skill is not listed", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-draft");
    writeRuntimeSkill(root, "case-edit");
    writeGraph(
      root,
      `skills:
  case-draft:
    user_entry: /case-draft
    consumes: [prd-source]
    produces: [archive-md]
    related: []
`,
    );

    const report = checkSkillGraph(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_GRAPH_ENTRY_MISSING",
        message: "skill graph must include case-edit",
      }),
    );
  });

  test("fails when consumes or produces is empty", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-draft");
    writeGraph(
      root,
      `skills:
  case-draft:
    user_entry: /case-draft
    consumes: []
    produces: []
    related: []
`,
    );

    const report = checkSkillGraph(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_GRAPH_FIELD_MISSING",
        message: "case-draft consumes must contain at least one value",
      }),
    );
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_GRAPH_FIELD_MISSING",
        message: "case-draft produces must contain at least one value",
      }),
    );
  });

  test("fails when related points to an unknown skill", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-draft");
    writeGraph(
      root,
      `skills:
  case-draft:
    user_entry: /case-draft
    consumes: [prd-source]
    produces: [archive-md]
    related: [missing-skill]
`,
    );

    const report = checkSkillGraph(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_GRAPH_RELATED_UNKNOWN",
        message: "case-draft related skill missing-skill is not a runtime skill",
      }),
    );
  });
});
