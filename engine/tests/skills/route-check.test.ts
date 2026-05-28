import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkRoutes, formatRouteCheckReport } from "../../src/skills/route-check.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-route-check-"));
  tempRoots.push(root);
  return root;
}

function writeRuntimeSkill(root: string, name: string): void {
  mkdirSync(join(root, ".claude", "skills", name), { recursive: true });
  mkdirSync(join(root, ".agents", "skills", name), { recursive: true });
}

function writeRoute(root: string, name: string, body?: string): void {
  const dir = join(root, ".claude", "contracts", "routes");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${name}.yaml`),
    body ??
      `skill: ${name}
entry: /${name}
should_trigger:
  - "trigger ${name}"
should_not_trigger:
  - "not ${name}"
clarify:
  - "clarify ${name}"
`,
  );
}

describe("route check", () => {
  test("passes when every runtime skill has a matching route YAML", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-edit");
    writeRoute(root, "case-edit");

    const report = checkRoutes(root);

    expect(report).toEqual({ passed: true, violations: [] });
    expect(formatRouteCheckReport(report, root)).toBe("route check passed");
  });

  test("fails when a runtime skill lacks a route file", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-edit");

    const report = checkRoutes(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "ROUTE_CONTRACT_MISSING",
        path: ".claude/contracts/routes/case-edit.yaml",
      }),
    );
  });

  test("fails when any route sample list is empty", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-edit");
    writeRoute(
      root,
      "case-edit",
      `skill: case-edit
entry: /case-edit
should_trigger: []
should_not_trigger:
  - "not case-edit"
clarify:
  - "clarify case-edit"
`,
    );

    const report = checkRoutes(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "ROUTE_SAMPLE_MISSING",
        path: ".claude/contracts/routes/case-edit.yaml",
        message: "should_trigger must contain at least one sample",
      }),
    );
  });

  test("fails when route entry does not match the skill slash command", () => {
    const root = makeRoot();
    writeRuntimeSkill(root, "case-edit");
    writeRoute(
      root,
      "case-edit",
      `skill: case-edit
entry: /wrong
should_trigger:
  - "trigger case-edit"
should_not_trigger:
  - "not case-edit"
clarify:
  - "clarify case-edit"
`,
    );

    const report = checkRoutes(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "ROUTE_ENTRY_MISMATCH",
        path: ".claude/contracts/routes/case-edit.yaml",
        message: "entry must be /case-edit",
      }),
    );
  });
});
