import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listSkillDirNames } from "@shared/cli/skill-audit.ts";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function makeSkillsRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-skills-audit-"));
  tempRoots.push(root);
  return root;
}

describe("skills audit directory enumeration", () => {
  test("listSkillDirNames returns [] when root is missing", () => {
    const root = makeSkillsRoot();
    expect(listSkillDirNames(join(root, "does-not-exist"))).toEqual([]);
  });

  test("listSkillDirNames skips `_`-prefixed aggregate directories", () => {
    const root = makeSkillsRoot();
    // 真 skill 目录
    mkdirSync(join(root, "case-draft"));
    writeFileSync(join(root, "case-draft/SKILL.md"), "---\nname: case-draft\n---\n");
    mkdirSync(join(root, "playwright-automation"));
    writeFileSync(
      join(root, "playwright-automation/SKILL.md"),
      "---\nname: playwright-automation\n---\n",
    );
    // 共享聚合目录（不应被当作 skill）
    mkdirSync(join(root, "_shared"));
    writeFileSync(join(root, "_shared/case-qa.md"), "shared rules");
    // 也覆盖任意 `_` 前缀名
    mkdirSync(join(root, "_internal"));

    const names = listSkillDirNames(root).sort();

    expect(names).toEqual(["case-draft", "playwright-automation"]);
    expect(names).not.toContain("_shared");
    expect(names).not.toContain("_internal");
  });

  test("listSkillDirNames excludes top-level files", () => {
    const root = makeSkillsRoot();
    mkdirSync(join(root, "case-draft"));
    writeFileSync(join(root, "case-draft/SKILL.md"), "---\nname: case-draft\n---\n");
    writeFileSync(join(root, "README.md"), "stray file");

    expect(listSkillDirNames(root)).toEqual(["case-draft"]);
  });
});
