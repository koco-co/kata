import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintCodexSkillTree } from "@shared/lint/codex-skill-shape.ts";

const roots: string[] = [];

function write(path: string, text: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text, "utf8");
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-codex-skills-"));
  roots.push(root);
  for (const name of ["case-draft", "playwright-automation", "case-edit"]) {
    mkdirSync(join(root, ".claude", "skills", name), { recursive: true });
  }
  for (const name of ["case-draft", "playwright-automation"]) {
    write(
      join(root, ".agents", "skills", name, "SKILL.md"),
      `---\nname: ${name}\ndescription: native skill\n---\n\n# ${name}\n`,
    );
  }
  mkdirSync(join(root, ".agents", "skills"), { recursive: true });
  symlinkSync(
    join(root, ".claude", "skills", "case-edit"),
    join(root, ".agents", "skills", "case-edit"),
  );
  write(
    join(root, ".agents", "skills", "using-kata-codex", "SKILL.md"),
    "---\nname: using-kata-codex\ndescription: bootstrap\n---\n\n# Bootstrap\n",
  );
  write(
    join(
      root,
      ".agents",
      "skills",
      "using-kata-codex",
      "references",
      "codex-tools.md",
    ),
    "# Tool mapping\n",
  );
  write(
    join(root, ".codex-plugin", "plugin.json"),
    JSON.stringify({
      skills: ".agents/skills",
      interface: { displayName: "Kata", defaultPrompt: ["Review tests"] },
    }),
  );
  return root;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("native Codex Skill shape", () => {
  test("accepts native core Skills and transitional compatibility symlinks", () => {
    const report = lintCodexSkillTree(fixture());
    expect(report.violations).toEqual([]);
    expect(report.passed).toBe(true);
  });

  test("rejects Claude-only prompt controls in native Skills", () => {
    const root = fixture();
    write(
      join(root, ".agents", "skills", "case-draft", "references", "legacy.md"),
      "model: sonnet\nUse AskUserQuestion before TodoWrite.\n",
    );
    const report = lintCodexSkillTree(root);
    expect(report.passed).toBe(false);
    expect(
      report.violations.filter(
        (violation) => violation.rule === "CODEX_NATIVE_SKILL_FORBIDDEN_TEXT",
      ).length,
    ).toBeGreaterThanOrEqual(3);
  });

  test("rejects a copied compatibility Skill", () => {
    const root = fixture();
    rmSync(join(root, ".agents", "skills", "case-edit"));
    mkdirSync(join(root, ".agents", "skills", "case-edit"));
    const report = lintCodexSkillTree(root);
    expect(report.violations.some((violation) => violation.rule === "CODEX_NOT_SYMLINK"))
      .toBe(true);
  });
});
