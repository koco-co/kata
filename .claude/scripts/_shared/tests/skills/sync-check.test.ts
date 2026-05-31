import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkRuntimeSkillSync,
  formatRuntimeSkillSyncReport,
} from "@shared/lib/skills/runtime-sync.ts";

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

function writeSkill(root: string, name: string, body: string): void {
  const dir = join(root, ".claude", "skills", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), body);
}

describe("runtime skill sync check", () => {
  test("checkRuntimeSkillSync passes even without runtime-sync-exceptions.yaml", () => {
    // makeRoot 不写 runtime-sync-exceptions.yaml；这里也不补写，验证 sync-check
    // 不再依赖该 yaml。
    const root = makeRoot();
    const skill = `---\nname: case-draft\ndescription: gen\n---\n`;
    writeSkill(root, "case-draft", skill);

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("passes when skill has allowed-tools frontmatter field", () => {
    const root = makeRoot();
    const skill = `---
name: demo
description: Demo skill
allowed-tools: Read, Bash
---

# Demo
`;

    writeSkill(root, "demo", skill);

    const report = checkRuntimeSkillSync(root);

    expect(report).toEqual({ passed: true, violations: [] });
    expect(formatRuntimeSkillSyncReport(report, root)).toBe("runtime skill sync passed");
  });

  // WHY: frontmatter allowlist permits `when_to_use` per
  // .claude/scripts/_shared/lib/skills/frontmatter-policy.ts
  test("allows when_to_use in Claude SKILL.md", () => {
    const root = makeRoot();

    writeSkill(
      root,
      "case-edit",
      `---
name: case-edit
description: d
when_to_use: use when editing existing test artifacts
---

# case-edit
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).not.toContainEqual(
      expect.objectContaining({
        rule: "UNSUPPORTED_FRONTMATTER",
      }),
    );
  });

  test("reports decorative runtime contract sections in SKILL.md", () => {
    const root = makeRoot();

    writeSkill(
      root,
      "demo",
      `---
name: demo
description: Demo skill
---

# Demo

## 上下文预算

\`\`\`yaml
core_tokens: 900
overflow_policy:
  on_overflow: summarize_then_drop_lowest_priority
\`\`\`

## 调用图

- 下游 agents: demo-worker@1
- 下游 prompts: demo-prompt@1
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "DECORATIVE_CONTRACT_SECTION",
        side: "claude",
        path: ".claude/skills/demo/SKILL.md",
      }),
    );
  });

  test("reports legacy agent prompt call graph sections in SKILL.md", () => {
    const root = makeRoot();

    writeSkill(
      root,
      "demo",
      `---
name: demo
description: Demo skill
---

# Demo

## 调用图

- 上游命令: /demo
- 下游 agents: demo-worker@1
- 下游 prompts: demo-prompt@1
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "DECORATIVE_CONTRACT_SECTION",
        side: "claude",
        path: ".claude/skills/demo/SKILL.md",
      }),
    );
  });

  test("reports UNSUPPORTED_FRONTMATTER for unrecognized frontmatter fields", () => {
    const root = makeRoot();

    writeSkill(
      root,
      "demo",
      `---
name: demo
description: Demo skill
hooks: {}
---

# Demo
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "UNSUPPORTED_FRONTMATTER",
        path: ".claude/skills/demo/SKILL.md",
        message: "unsupported frontmatter fields: hooks",
      }),
    );
  });

  test("reports SKILL_NAME_MISMATCH when frontmatter name differs from directory name", () => {
    const root = makeRoot();

    writeSkill(
      root,
      "demo",
      `---
name: other-demo
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

  test("_shared directory in .claude/skills is not treated as a skill", () => {
    const root = makeRoot();
    // 写一个 `_shared/case-qa.md`，模拟跨 skill 共享资源目录
    const sharedDir = join(root, ".claude/skills/_shared");
    mkdirSync(sharedDir, { recursive: true });
    writeFileSync(join(sharedDir, "case-qa.md"), "shared rules");

    // 写一个真实 skill，确保 sync-check 不会因 `_shared` 缺 SKILL.md 报错
    const skill = `---\nname: case-draft\ndescription: gen\n---\n`;
    writeSkill(root, "case-draft", skill);

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(true);
    expect(report.violations.find((v) => v.skill === "_shared")).toBeUndefined();
  });

  test("reports SKILL_DESCRIPTION_MISSING when description is absent", () => {
    const root = makeRoot();
    const skill = `---
name: demo
---

# Demo
`;

    writeSkill(root, "demo", skill);

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_DESCRIPTION_MISSING",
        path: ".claude/skills/demo/SKILL.md",
        message: "frontmatter description is required",
      }),
    );
  });
});
