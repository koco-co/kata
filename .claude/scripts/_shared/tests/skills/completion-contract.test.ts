import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../../../..");

describe("task persistence completion contract", () => {
  test("project instructions forbid voluntary handoff while executable work remains", () => {
    const agents = readFileSync(resolve(repoRoot, "AGENTS.md"), "utf8");

    expect(agents).toContain("## 判断与验证");
    expect(agents).toContain("没有执行完整范围时，不得写“全部通过”");
    expect(agents).toContain("## 安全边界");
  });

  test("case-edit keeps processing large semantic standardization jobs until its gates pass", () => {
    const skill = readFileSync(resolve(repoRoot, ".claude/skills/case-edit/SKILL.md"), "utf8");

    expect(skill).toContain("## 持续执行门禁");
    expect(skill).toContain("按功能族逐条处理");
    expect(skill).toContain("不得询问用户是否继续");
    expect(skill).toContain("lint violation 为 0");
    expect(skill).toContain("Archive 与 XMind");
  });
});
