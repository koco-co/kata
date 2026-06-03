import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type HermesSkillRule, lintHermesSkillTree } from "@shared/lint/hermes-skill-shape.ts";

function write(p: string, body: string): void {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

// bootstrap 正文须含 external_dirs（新规则要求文档化发现机制）
function bootstrapMd(): string {
  return `---\nname: using-kata-hermes\ndescription: demo hermes bootstrap for shape lint.\n---\n\nbody — discovery via external_dirs in ~/.hermes/config.yaml\n`;
}

// 构建一棵合规树（无 symlink，仅真实 bootstrap + 工具映射）并返回 root
function buildCompliant(): string {
  const root = mkdtempSync(join(tmpdir(), "hermes-shape-"));
  mkdirSync(join(root, ".hermes/skills"), { recursive: true });
  write(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"), bootstrapMd());
  write(
    join(root, ".hermes/skills/using-kata-hermes/references/hermes-tools.md"),
    "# Hermes Tool Mapping\nTask -> delegate_task\n",
  );
  return root;
}

function rules(root: string): HermesSkillRule[] {
  return lintHermesSkillTree(root).violations.map((v) => v.rule);
}

describe("lintHermesSkillTree (hermes shape)", () => {
  let root = "";
  beforeEach(() => {
    root = buildCompliant();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("canonical non-symlink tree passes", () => {
    const report = lintHermesSkillTree(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("a stray skill symlink under .hermes/skills is flagged (#8293)", () => {
    mkdirSync(join(root, ".claude/skills/case-draft"), { recursive: true });
    symlinkSync("../../.claude/skills/case-draft", join(root, ".hermes/skills/case-draft"));
    expect(rules(root)).toContain("HERMES_STRAY_SYMLINK");
  });

  test("missing bootstrap SKILL.md is flagged", () => {
    rmSync(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"));
    expect(rules(root)).toContain("HERMES_BOOTSTRAP_MISSING");
  });

  test("bootstrap with wrong frontmatter name is flagged", () => {
    write(
      join(root, ".hermes/skills/using-kata-hermes/SKILL.md"),
      "---\nname: wrong-name\ndescription: x external_dirs\n---\nbody\n",
    );
    expect(rules(root)).toContain("HERMES_BOOTSTRAP_FRONTMATTER");
  });

  test("bootstrap not documenting external_dirs is flagged", () => {
    write(
      join(root, ".hermes/skills/using-kata-hermes/SKILL.md"),
      "---\nname: using-kata-hermes\ndescription: demo.\n---\n\nbody without the mechanism\n",
    );
    expect(rules(root)).toContain("HERMES_EXTERNAL_DIRS_UNDOCUMENTED");
  });

  test("missing tool mapping is flagged", () => {
    rmSync(join(root, ".hermes/skills/using-kata-hermes/references/hermes-tools.md"));
    expect(rules(root)).toContain("HERMES_MAPPING_MISSING");
  });
});
