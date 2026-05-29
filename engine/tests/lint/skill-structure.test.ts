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

  // 构造一个除指定缺陷外全合规的 fixture skill（name==dir 且在命令索引内）
  function makeFixtureSkill(extra: (skillDir: string) => void): string {
    const tmp = mkdtempSync(join(tmpdir(), "kata-skill-structure-"));
    writeFileSync(
      join(tmp, "CLAUDE.md"),
      "## 命令索引\n\n| Command | Skill | Summary |\n| --- | --- | --- |\n| /demo | demo | x |\n",
    );
    const skillDir = join(tmp, ".claude/skills/demo");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: demo\ndescription: demo skill\n---\n\n# demo\n",
    );
    extra(skillDir);
    return tmp;
  }

  test("flags SK-PHASE-MISSING when SKILL.md references a missing phase", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: demo\ndescription: demo skill\n---\n\n# demo\n\n见 phases/§9-missing.md。\n",
      );
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-PHASE-MISSING", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-PHASE-NAME for a phases file not matching §N-<step>.md", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      mkdirSync(join(skillDir, "phases"), { recursive: true });
      writeFileSync(join(skillDir, "phases", "bad-name.md"), "# x\n");
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-PHASE-NAME", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-PROMPT-NAME for a prompts file not matching agent-*.md", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      mkdirSync(join(skillDir, "prompts"), { recursive: true });
      writeFileSync(join(skillDir, "prompts", "helper.md"), "# x\n");
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-PROMPT-NAME", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-LEN-DIR for an over-cap rules file", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      mkdirSync(join(skillDir, "rules"), { recursive: true });
      writeFileSync(join(skillDir, "rules", "huge.md"), `${"x\n".repeat(130)}`);
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-LEN-DIR", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("flags SK-FM-WHITELIST for an unknown frontmatter key", () => {
    const tmp = makeFixtureSkill((skillDir) => {
      writeFileSync(
        join(skillDir, "SKILL.md"),
        "---\nname: demo\ndescription: demo skill\nbogus: 1\n---\n\n# demo\n",
      );
    });
    try {
      const r = lintSkillStructure(tmp);
      expect(r.passed).toBe(false);
      expect(r.violations).toContainEqual(
        expect.objectContaining({ rule: "SK-FM-WHITELIST", skill: "demo" }),
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
