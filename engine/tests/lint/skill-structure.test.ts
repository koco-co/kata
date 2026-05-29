import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import { lintSkillStructure } from "@shared/lint/skill-structure.ts";

describe("lintSkillStructure", () => {
  test("real .claude/skills conform to structure rules", () => {
    const r = lintSkillStructure(repoRoot());
    if (!r.passed) console.error(r.violations);
    expect(r.passed).toBe(true);
  });

  // root 透传校验：fixture 隔离时必须扫 fixture 自己的 skills + CLAUDE.md，
  // 不透传会扫真实仓库 skills 而读 fixture 的 CLAUDE.md，导致误报。
  test("honors the passed root and reports violations in a fixture tree", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kata-skill-structure-"));
    try {
      writeFileSync(
        join(tmp, "CLAUDE.md"),
        "## 命令索引\n\n| Command | Skill | Summary |\n| /demo | demo | x |\n",
      );
      const skillDir = join(tmp, ".claude/skills/demo");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: wrong-name\ndescription: demo skill\n---\n\n# demo\n",
      );

      const r = lintSkillStructure(tmp);

      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-NAME-DIR", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
