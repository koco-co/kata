import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type HermesSkillRule, lintHermesSkillTree } from "@shared/lint/hermes-skill-shape.ts";

const BUSINESS = ["case-draft", "case-edit"];

function write(p: string, body: string): void {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

function skillMd(name: string): string {
  return `---\nname: ${name}\ndescription: demo skill ${name} for hermes shape lint.\n---\n\nbody\n`;
}

// 构建一棵 canonical 合规树并返回 root
function buildCompliant(): string {
  const root = mkdtempSync(join(tmpdir(), "hermes-shape-"));
  mkdirSync(join(root, ".hermes/skills"), { recursive: true });
  for (const name of BUSINESS) {
    write(join(root, ".claude/skills", name, "SKILL.md"), skillMd(name));
    symlinkSync(`../../.claude/skills/${name}`, join(root, ".hermes/skills", name));
  }
  write(join(root, ".claude/skills/_shared/case-qa.md"), "shared");
  write(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"), skillMd("using-kata-hermes"));
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

  test("canonical symlinked tree passes", () => {
    const report = lintHermesSkillTree(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("missing .hermes symlink is flagged", () => {
    rmSync(join(root, ".hermes/skills/case-draft"));
    expect(rules(root)).toContain("HERMES_SYMLINK_MISSING");
  });

  test("a copied dir instead of a symlink is flagged", () => {
    rmSync(join(root, ".hermes/skills/case-draft"));
    cpSync(join(root, ".claude/skills/case-draft"), join(root, ".hermes/skills/case-draft"), {
      recursive: true,
    });
    expect(rules(root)).toContain("HERMES_NOT_SYMLINK");
  });

  test("a symlink to the wrong target is flagged", () => {
    rmSync(join(root, ".hermes/skills/case-draft"));
    symlinkSync("../../.claude/skills/_shared", join(root, ".hermes/skills/case-draft"));
    expect(rules(root)).toContain("HERMES_SYMLINK_TARGET");
  });

  test("missing bootstrap SKILL.md is flagged", () => {
    rmSync(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"));
    expect(rules(root)).toContain("HERMES_BOOTSTRAP_MISSING");
  });

  test("bootstrap with wrong frontmatter name is flagged", () => {
    write(join(root, ".hermes/skills/using-kata-hermes/SKILL.md"), skillMd("wrong-name"));
    expect(rules(root)).toContain("HERMES_BOOTSTRAP_FRONTMATTER");
  });

  test("missing tool mapping is flagged", () => {
    rmSync(join(root, ".hermes/skills/using-kata-hermes/references/hermes-tools.md"));
    expect(rules(root)).toContain("HERMES_MAPPING_MISSING");
  });
});
