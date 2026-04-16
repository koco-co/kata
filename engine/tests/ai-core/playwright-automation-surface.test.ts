import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function exists(path: string): boolean {
  return existsSync(join(root, path));
}

const oldRuntimeSkillPaths = [
  ".agents/skills/ui-plan/SKILL.md",
  ".agents/skills/playwright-gen/SKILL.md",
  ".agents/skills/run-triage/SKILL.md",
  ".claude/skills/ui-plan/SKILL.md",
  ".claude/skills/playwright-gen/SKILL.md",
  ".claude/skills/run-triage/SKILL.md",
];

describe("playwright automation active surface", () => {
  it("exposes only playwright-automation as the kata-owned UI automation command", () => {
    expect(exists(".ai/core/commands/playwright-automation.command.yaml")).toBe(true);
    expect(exists(".ai/core/commands/ui-plan.command.yaml")).toBe(false);
    expect(exists(".ai/core/commands/playwright-gen.command.yaml")).toBe(false);
    expect(exists(".ai/core/commands/run-triage.command.yaml")).toBe(false);

    const command = read(".ai/core/commands/playwright-automation.command.yaml");
    expect(command).toContain("id: playwright-automation");
    expect(command).toContain("skill: playwright-automation@1");
    expect(command).toContain("user_invocable: true");
  });

  it("does not project old UI automation skills into runtime skill directories", () => {
    expect(exists(".agents/skills/playwright-automation/SKILL.md")).toBe(true);
    expect(exists(".claude/skills/playwright-automation/SKILL.md")).toBe(true);
    for (const oldPath of oldRuntimeSkillPaths) {
      expect(exists(oldPath)).toBe(false);
    }
  });

  it("keeps playwright-cli as an unchanged vendor skill surface", () => {
    expect(exists(".agents/skills/playwright-cli/SKILL.md")).toBe(true);
    expect(exists(".claude/skills/playwright-cli/SKILL.md")).toBe(true);
    expect(read(".ai/core/external-skills/playwright-cli.yaml")).toContain(
      "canonical_name: playwright-cli",
    );
  });

  it("does not list old UI automation commands in active root runtime docs", () => {
    const docs = [read("AGENTS.md"), read("CLAUDE.md"), read("README.md"), read("README-EN.md")];
    for (const doc of docs) {
      expect(doc).toContain("/playwright-automation");
      expect(doc).not.toContain("/ui-plan");
      expect(doc).not.toContain("/playwright-gen");
      expect(doc).not.toContain("/run-triage");
    }
  });
});
