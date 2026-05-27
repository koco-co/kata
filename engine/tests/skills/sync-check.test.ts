import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkRuntimeSkillSync,
  formatRuntimeSkillSyncReport,
  validateExceptionEntry,
} from "../../src/skills/runtime-sync.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-runtime-sync-"));
  tempRoots.push(root);
  return root;
}

function writeSkill(
  root: string,
  runtimeDir: ".claude" | ".agents",
  name: string,
  body: string,
): void {
  const dir = join(root, runtimeDir, "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), body);
}

describe("runtime skill sync check", () => {
  test("passes when Claude and Codex skill names match and both allow allowed-tools", () => {
    const root = makeRoot();
    const skill = `---
name: demo
description: Demo skill
allowed-tools: Read, Bash
---

# Demo
`;

    writeSkill(root, ".claude", "demo", skill);
    writeSkill(root, ".agents", "demo", skill);

    const report = checkRuntimeSkillSync(root);

    expect(report).toEqual({ passed: true, violations: [] });
    expect(formatRuntimeSkillSyncReport(report, root)).toBe("runtime skill sync passed");
  });

  test("reports RUNTIME_SKILL_MISSING when counterpart skill is missing", () => {
    const root = makeRoot();

    writeSkill(
      root,
      ".claude",
      "claude-only",
      `---
name: claude-only
description: Claude only
---

# Claude only
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SKILL_MISSING",
        path: ".agents/skills/claude-only",
      }),
    );
  });

  test("reports UNSUPPORTED_FRONTMATTER for Codex model frontmatter", () => {
    const root = makeRoot();

    writeSkill(
      root,
      ".claude",
      "demo",
      `---
name: demo
description: Demo skill
---

# Demo
`,
    );
    writeSkill(
      root,
      ".agents",
      "demo",
      `---
name: demo
description: Demo skill
model: gpt-5
---

# Demo
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "UNSUPPORTED_FRONTMATTER",
        path: ".agents/skills/demo/SKILL.md",
        message: "unsupported frontmatter fields: model",
      }),
    );
  });

  test("reports SKILL_NAME_MISMATCH when frontmatter name differs from directory name", () => {
    const root = makeRoot();

    writeSkill(
      root,
      ".claude",
      "demo",
      `---
name: other-demo
description: Demo skill
---

# Demo
`,
    );
    writeSkill(
      root,
      ".agents",
      "demo",
      `---
name: demo
description: Demo skill
---

# Demo
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_NAME_MISMATCH",
        path: ".claude/skills/demo/SKILL.md",
        message: "frontmatter name other-demo does not match skill directory demo",
      }),
    );
  });

  test("validateExceptionEntry checks required fields, side values, and reviewer values", () => {
    expect(validateExceptionEntry({})).toEqual([
      "skill is required",
      "side is required",
      "file is required",
      "reason is required",
      "reviewer is required",
    ]);

    expect(
      validateExceptionEntry({
        skill: "demo",
        side: "other",
        file: ".agents/skills/demo/SKILL.md",
        reason: "temporary migration gap",
        reviewer: "optional",
      }),
    ).toEqual(["side must be claude or codex", "reviewer must be required-before-merge"]);
  });

  test("validateExceptionEntry rejects reasons that describe user semantics or output differences", () => {
    expect(
      validateExceptionEntry({
        skill: "demo",
        side: "codex",
        file: ".agents/skills/demo/SKILL.md",
        reason: "different output spec",
        reviewer: "required-before-merge",
      }),
    ).toContain("reason cannot waive user semantics, output artifacts, or verification scope");
  });
});
