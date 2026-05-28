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
  const contractsDir = join(root, ".claude", "contracts");
  mkdirSync(contractsDir, { recursive: true });
  writeFileSync(join(contractsDir, "runtime-sync-exceptions.yaml"), "exceptions: []\n");
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

function writeCodexOpenAi(root: string, name: string, body?: string): void {
  const dir = join(root, ".agents", "skills", name, "agents");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "openai.yaml"), body ?? "policy:\n  allow_implicit_invocation: true\n");
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
    writeCodexOpenAi(root, "demo");

    const report = checkRuntimeSkillSync(root);

    expect(report).toEqual({ passed: true, violations: [] });
    expect(formatRuntimeSkillSyncReport(report, root)).toBe("runtime skill sync passed");
  });

  test("requires Codex openai.yaml for runtime skills", () => {
    const root = makeRoot();

    writeSkill(
      root,
      ".claude",
      "case-draft",
      `---
name: case-draft
description: d
when_to_use: use for QA case drafting
---

# case-draft
`,
    );
    writeSkill(
      root,
      ".agents",
      "case-draft",
      `---
name: case-draft
description: d
---

# case-draft
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "CODEX_OPENAI_CONFIG_MISSING",
        path: ".agents/skills/case-draft/agents/openai.yaml",
      }),
    );
  });

  test("allows Claude when_to_use but rejects it on Codex SKILL.md", () => {
    const root = makeRoot();

    writeSkill(
      root,
      ".claude",
      "case-edit",
      `---
name: case-edit
description: d
when_to_use: use when editing existing test artifacts
---

# case-edit
`,
    );
    writeSkill(
      root,
      ".agents",
      "case-edit",
      `---
name: case-edit
description: d
when_to_use: invalid on Codex
---

# case-edit
`,
    );
    writeCodexOpenAi(root, "case-edit");

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "UNSUPPORTED_FRONTMATTER",
        side: "codex",
        path: ".agents/skills/case-edit/SKILL.md",
        message: "unsupported frontmatter fields: when_to_use",
      }),
    );
    expect(report.violations).not.toContainEqual(
      expect.objectContaining({
        rule: "UNSUPPORTED_FRONTMATTER",
        side: "claude",
      }),
    );
  });

  test("reports decorative runtime contract sections in SKILL.md", () => {
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
    writeCodexOpenAi(root, "demo");

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
      ".claude",
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
    writeCodexOpenAi(root, "demo");

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "DECORATIVE_CONTRACT_SECTION",
        side: "claude",
        path: ".claude/skills/demo/SKILL.md",
      }),
    );
  });

  test("requires Codex openai.yaml implicit invocation policy boolean", () => {
    const root = makeRoot();
    const skill = `---
name: demo
description: Demo skill
---

# Demo
`;

    writeSkill(root, ".claude", "demo", skill);
    writeSkill(root, ".agents", "demo", skill);
    writeCodexOpenAi(root, "demo", "policy:\n  allow_implicit_invocation: yes\n");

    const report = checkRuntimeSkillSync(root);

    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "CODEX_OPENAI_CONFIG_INVALID",
        path: ".agents/skills/demo/agents/openai.yaml",
        message: "policy.allow_implicit_invocation must be a boolean",
      }),
    );
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
    writeCodexOpenAi(root, "demo");

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

  test("reports SKILL_DESCRIPTION_MISSING when description is absent", () => {
    const root = makeRoot();
    const skill = `---
name: demo
---

# Demo
`;

    writeSkill(root, ".claude", "demo", skill);
    writeSkill(root, ".agents", "demo", skill);
    writeCodexOpenAi(root, "demo");

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_DESCRIPTION_MISSING",
        path: ".claude/skills/demo/SKILL.md",
        message: "frontmatter description is required",
      }),
    );
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "SKILL_DESCRIPTION_MISSING",
        path: ".agents/skills/demo/SKILL.md",
        message: "frontmatter description is required",
      }),
    );
  });

  test("validates runtime-sync-exceptions.yaml when present", () => {
    const root = makeRoot();
    const contractsDir = join(root, ".claude", "contracts");
    mkdirSync(contractsDir, { recursive: true });
    writeFileSync(
      join(contractsDir, "runtime-sync-exceptions.yaml"),
      `exceptions:
  - skill: demo
    side: codex
    file: .agents/skills/demo/SKILL.md
    reason: different output spec
    reviewer: required-before-merge
`,
    );

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SYNC_EXCEPTION_INVALID",
        path: ".claude/contracts/runtime-sync-exceptions.yaml",
        message:
          "exceptions[0] reason cannot waive user semantics, output artifacts, or verification scope",
      }),
    );
  });

  test("reports RUNTIME_SYNC_EXCEPTION_MISSING when exceptions file is absent", () => {
    const root = makeRoot();
    rmSync(join(root, ".claude", "contracts", "runtime-sync-exceptions.yaml"));

    const report = checkRuntimeSkillSync(root);

    expect(report.passed).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "RUNTIME_SYNC_EXCEPTION_MISSING",
        path: ".claude/contracts/runtime-sync-exceptions.yaml",
        message: "runtime sync exceptions file is required",
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

  test("validateExceptionEntry rejects English reasons mentioning behaviour", () => {
    expect(
      validateExceptionEntry({
        skill: "demo",
        side: "codex",
        file: ".agents/skills/demo/SKILL.md",
        reason: "behaviour differs slightly",
        reviewer: "required-before-merge",
      }),
    ).toContain("reason cannot waive user semantics, output artifacts, or verification scope");
  });

  test("validateExceptionEntry rejects Chinese reasons about artifacts or verification", () => {
    expect(
      validateExceptionEntry({
        skill: "demo",
        side: "codex",
        file: ".agents/skills/demo/SKILL.md",
        reason: "产物不同",
        reviewer: "required-before-merge",
      }),
    ).toContain("reason cannot waive user semantics, output artifacts, or verification scope");

    expect(
      validateExceptionEntry({
        skill: "demo",
        side: "codex",
        file: ".agents/skills/demo/SKILL.md",
        reason: "验证口径差异",
        reviewer: "required-before-merge",
      }),
    ).toContain("reason cannot waive user semantics, output artifacts, or verification scope");

    expect(
      validateExceptionEntry({
        skill: "demo",
        side: "codex",
        file: ".agents/skills/demo/SKILL.md",
        reason: "语义不对齐",
        reviewer: "required-before-merge",
      }),
    ).toContain("reason cannot waive user semantics, output artifacts, or verification scope");
  });
});
