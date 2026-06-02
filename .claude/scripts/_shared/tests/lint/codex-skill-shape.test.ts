import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CodexSkillRule, lintCodexSkillTree } from "@shared/lint/codex-skill-shape.ts";

const BUSINESS = ["case-draft", "case-edit"];

function write(p: string, body: string): void {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

function skillMd(name: string): string {
  return `---\nname: ${name}\ndescription: demo skill ${name} for codex shape lint.\n---\n\nbody\n`;
}

function pluginJson(): string {
  return JSON.stringify({
    name: "kata",
    version: "0.0.0",
    skills: "./.agents/skills/",
    interface: {
      displayName: "kata QA Skills",
      shortDescription: "demo",
      defaultPrompt: ["one", "two"],
    },
  });
}

// 构建一棵 canonical 合规树并返回 root
function buildCompliant(): string {
  const root = mkdtempSync(join(tmpdir(), "codex-shape-"));
  mkdirSync(join(root, ".agents/skills"), { recursive: true });
  for (const name of BUSINESS) {
    write(join(root, ".claude/skills", name, "SKILL.md"), skillMd(name));
    symlinkSync(`../../.claude/skills/${name}`, join(root, ".agents/skills", name));
  }
  write(join(root, ".claude/skills/_shared/case-qa.md"), "shared");
  write(join(root, ".agents/skills/using-kata-codex/SKILL.md"), skillMd("using-kata-codex"));
  write(
    join(root, ".agents/skills/using-kata-codex/references/codex-tools.md"),
    "# Codex Tool Mapping\nTask -> spawn_agent\n",
  );
  write(join(root, ".codex-plugin/plugin.json"), pluginJson());
  return root;
}

function rules(root: string): CodexSkillRule[] {
  return lintCodexSkillTree(root).violations.map((v) => v.rule);
}

describe("lintCodexSkillTree (canonical codex shape)", () => {
  let root = "";
  beforeEach(() => {
    root = buildCompliant();
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("canonical symlinked tree passes", () => {
    const report = lintCodexSkillTree(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("missing .agents symlink is flagged", () => {
    rmSync(join(root, ".agents/skills/case-draft"));
    expect(rules(root)).toContain("CODEX_SYMLINK_MISSING");
  });

  test("a copied dir instead of a symlink is flagged", () => {
    rmSync(join(root, ".agents/skills/case-draft"));
    cpSync(join(root, ".claude/skills/case-draft"), join(root, ".agents/skills/case-draft"), {
      recursive: true,
    });
    expect(rules(root)).toContain("CODEX_NOT_SYMLINK");
  });

  test("a symlink to the wrong target is flagged", () => {
    rmSync(join(root, ".agents/skills/case-draft"));
    symlinkSync("../../.claude/skills/_shared", join(root, ".agents/skills/case-draft"));
    expect(rules(root)).toContain("CODEX_SYMLINK_TARGET");
  });

  test("regressed per-skill openai.yaml / source-map.json is flagged", () => {
    write(join(root, ".agents/skills/regressed/agents/openai.yaml"), "interface: {}\n");
    write(join(root, ".agents/skills/regressed/agents/source-map.json"), "{}\n");
    const r = rules(root);
    expect(r.filter((x) => x === "CODEX_INVENTED_ARTIFACT").length).toBe(2);
  });

  test("missing bootstrap SKILL.md is flagged", () => {
    rmSync(join(root, ".agents/skills/using-kata-codex/SKILL.md"));
    expect(rules(root)).toContain("CODEX_BOOTSTRAP_MISSING");
  });

  test("bootstrap with wrong frontmatter name is flagged", () => {
    write(join(root, ".agents/skills/using-kata-codex/SKILL.md"), skillMd("wrong-name"));
    expect(rules(root)).toContain("CODEX_BOOTSTRAP_FRONTMATTER");
  });

  test("missing tool mapping is flagged", () => {
    rmSync(join(root, ".agents/skills/using-kata-codex/references/codex-tools.md"));
    expect(rules(root)).toContain("CODEX_MAPPING_MISSING");
  });

  test("missing plugin manifest is flagged", () => {
    rmSync(join(root, ".codex-plugin/plugin.json"));
    expect(rules(root)).toContain("CODEX_PLUGIN_MANIFEST_MISSING");
  });

  test("snake_case interface keys are rejected", () => {
    write(
      join(root, ".codex-plugin/plugin.json"),
      JSON.stringify({
        skills: "./.agents/skills/",
        interface: { displayName: "x", default_prompt: ["a"], defaultPrompt: ["a"] },
      }),
    );
    expect(rules(root)).toContain("CODEX_PLUGIN_MANIFEST_INVALID");
  });

  test("invented policy.allow_implicit_invocation is rejected", () => {
    write(
      join(root, ".codex-plugin/plugin.json"),
      JSON.stringify({
        skills: "./.agents/skills/",
        interface: { displayName: "x", defaultPrompt: ["a"] },
        policy: { allow_implicit_invocation: true },
      }),
    );
    expect(rules(root)).toContain("CODEX_PLUGIN_MANIFEST_INVALID");
  });

  test("defaultPrompt as a string (not array) is rejected", () => {
    write(
      join(root, ".codex-plugin/plugin.json"),
      JSON.stringify({
        skills: "./.agents/skills/",
        interface: { displayName: "x", defaultPrompt: "single string" },
      }),
    );
    expect(rules(root)).toContain("CODEX_PLUGIN_MANIFEST_INVALID");
  });
});
