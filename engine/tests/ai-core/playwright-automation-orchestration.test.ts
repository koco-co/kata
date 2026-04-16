import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));

describe("playwright-automation subagent orchestration surface", () => {
  it("declares the four new reference files in ai-core source", () => {
    expect(exists(".ai/core/skills/playwright-automation/references/execution-protocol.md")).toBe(
      true,
    );
    expect(exists(".ai/core/skills/playwright-automation/references/worker-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md")).toBe(
      true,
    );
    expect(
      exists(".ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md"),
    ).toBe(true);
  });

  it("skill.yaml references list includes the four new files", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toContain("path: references/execution-protocol.md");
    expect(yaml).toContain("path: references/worker-prompt.md");
    expect(yaml).toContain("path: references/spec-reviewer-prompt.md");
    expect(yaml).toContain("path: references/quality-reviewer-prompt.md");
  });

  it("skill.yaml routing_summary declares the orchestration mode entry", () => {
    const yaml = read(".ai/core/skills/playwright-automation/skill.yaml");
    expect(yaml).toContain("阶段内任务编排");
  });

  it("rendered .claude/skills SKILL.md exposes the same four references", () => {
    const md = read(".claude/skills/playwright-automation/SKILL.md");
    expect(md).toContain("execution-protocol.md");
    expect(md).toContain("worker-prompt.md");
    expect(md).toContain("spec-reviewer-prompt.md");
    expect(md).toContain("quality-reviewer-prompt.md");
  });

  describe("reviewer prompts encode the three injected-error patterns", () => {
    const quality = read(
      ".ai/core/skills/playwright-automation/references/quality-reviewer-prompt.md",
    );
    const spec = read(".ai/core/skills/playwright-automation/references/spec-reviewer-prompt.md");

    it("quality-reviewer forbids .nth() weak selectors", () => {
      expect(quality).toContain(".nth(");
      expect(quality).toMatch(
        /(标记|禁止|forbid|flag)[^\n]*(未解释|无 UI 证据|weak|unexplained|主策略|main strategy)[^\n]*\.nth\(\)[^\n]*(未解释|无 UI 证据|weak|unexplained|主策略|main strategy)/i,
      );
    });

    it("spec-reviewer requires both smoke and full runners", () => {
      expect(spec).toMatch(
        /`?tests\/runners\/smoke\.spec\.ts`?[^\n]*(存在|required|must exist|requires)/i,
      );
      expect(spec).toMatch(
        /`?tests\/runners\/full\.spec\.ts`?[^\n]*(存在|required|must exist|requires)/i,
      );
    });

    it("quality-reviewer forbids waitForTimeout and try/catch fail-swallow", () => {
      expect(quality).toContain("waitForTimeout");
      expect(quality).toMatch(
        /(try\/catch[^\n]*(吞失败|吞掉失败|fail[- ]?swallow|swallow[^\n]*fail))|((吞失败|吞掉失败|fail[- ]?swallow|swallow[^\n]*fail)[^\n]*try\/catch)/i,
      );
    });
  });
});
