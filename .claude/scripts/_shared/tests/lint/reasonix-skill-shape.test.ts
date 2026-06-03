import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  lintReasonixSkillTree,
  type ReasonixSkillRule,
} from "@shared/lint/reasonix-skill-shape.ts";

const BUSINESS = ["case-draft", "case-edit"];

function write(p: string, body: string): void {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

function skillMd(name: string): string {
  return `---\nname: ${name}\ndescription: demo skill ${name} for reasonix shape lint.\n---\n\nbody\n`;
}

function pluginJson(): string {
  return JSON.stringify({
    name: "kata",
    version: "0.0.0",
    skills: "./.reasonix/skills/",
    interface: {
      displayName: "kata QA Skills",
      shortDescription: "demo",
      defaultPrompt: ["one", "two"],
    },
  });
}

// 构建一棵 canonical 合规树并返回 root
function buildCompliant(): string {
  const root = mkdtempSync(join(tmpdir(), "reasonix-shape-"));
  mkdirSync(join(root, ".reasonix/skills"), { recursive: true });
  for (const name of BUSINESS) {
    write(join(root, ".claude/skills", name, "SKILL.md"), skillMd(name));
    symlinkSync(`../../.claude/skills/${name}`, join(root, ".reasonix/skills", name));
  }
  write(join(root, ".claude/skills/_shared/case-qa.md"), "shared");
  write(
    join(root, ".reasonix/skills/using-kata-reasonix/SKILL.md"),
    skillMd("using-kata-reasonix"),
  );
  write(
    join(root, ".reasonix/skills/using-kata-reasonix/references/reasonix-tools.md"),
    "# Reasonix Tool Mapping\nTask -> sequential execution\n",
  );
  write(join(root, ".reasonix-plugin/plugin.json"), pluginJson());
  return root;
}

function rules(root: string): ReasonixSkillRule[] {
  return lintReasonixSkillTree(root).violations.map((v) => v.rule);
}

describe("lintReasonixSkillTree (reasonix shape)", () => {
  let root = "";
  beforeEach(() => {
    root = buildCompliant();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("canonical symlinked tree passes", () => {
    const report = lintReasonixSkillTree(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("missing .reasonix symlink is flagged", () => {
    rmSync(join(root, ".reasonix/skills/case-draft"));
    expect(rules(root)).toContain("REASONIX_SYMLINK_MISSING");
  });

  test("a copied dir instead of a symlink is flagged", () => {
    rmSync(join(root, ".reasonix/skills/case-draft"));
    cpSync(join(root, ".claude/skills/case-draft"), join(root, ".reasonix/skills/case-draft"), {
      recursive: true,
    });
    expect(rules(root)).toContain("REASONIX_NOT_SYMLINK");
  });

  test("a symlink to the wrong target is flagged", () => {
    rmSync(join(root, ".reasonix/skills/case-draft"));
    symlinkSync("../../.claude/skills/_shared", join(root, ".reasonix/skills/case-draft"));
    expect(rules(root)).toContain("REASONIX_SYMLINK_TARGET");
  });

  test("missing bootstrap SKILL.md is flagged", () => {
    rmSync(join(root, ".reasonix/skills/using-kata-reasonix/SKILL.md"));
    expect(rules(root)).toContain("REASONIX_BOOTSTRAP_MISSING");
  });

  test("bootstrap with wrong frontmatter name is flagged", () => {
    write(join(root, ".reasonix/skills/using-kata-reasonix/SKILL.md"), skillMd("wrong-name"));
    expect(rules(root)).toContain("REASONIX_BOOTSTRAP_FRONTMATTER");
  });

  test("missing tool mapping is flagged", () => {
    rmSync(join(root, ".reasonix/skills/using-kata-reasonix/references/reasonix-tools.md"));
    expect(rules(root)).toContain("REASONIX_MAPPING_MISSING");
  });

  test("missing plugin manifest is flagged", () => {
    rmSync(join(root, ".reasonix-plugin/plugin.json"));
    expect(rules(root)).toContain("REASONIX_PLUGIN_MANIFEST_MISSING");
  });

  test("invalid plugin JSON is flagged", () => {
    write(join(root, ".reasonix-plugin/plugin.json"), "not json");
    expect(rules(root)).toContain("REASONIX_PLUGIN_MANIFEST_INVALID");
  });

  test("defaultPrompt as a string (not array) is rejected", () => {
    write(
      join(root, ".reasonix-plugin/plugin.json"),
      JSON.stringify({
        skills: "./.reasonix/skills/",
        interface: { displayName: "x", defaultPrompt: "single string" },
      }),
    );
    expect(rules(root)).toContain("REASONIX_PLUGIN_MANIFEST_INVALID");
  });
});
