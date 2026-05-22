import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const root = join(import.meta.dirname, "../../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const exists = (p: string) => existsSync(join(root, p));

describe("case-draft subagent orchestration surface", () => {
  it("declares the four new reference files in ai-core source", () => {
    expect(exists(".ai/core/skills/case-draft/references/execution-protocol.md")).toBe(true);
    expect(exists(".ai/core/skills/case-draft/references/worker-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/case-draft/references/spec-reviewer-prompt.md")).toBe(true);
    expect(exists(".ai/core/skills/case-draft/references/quality-reviewer-prompt.md")).toBe(true);
  });

  it("skill.yaml references list includes the four new files", () => {
    const yaml = read(".ai/core/skills/case-draft/skill.yaml");
    expect(yaml).toContain("path: references/execution-protocol.md");
    expect(yaml).toContain("path: references/worker-prompt.md");
    expect(yaml).toContain("path: references/spec-reviewer-prompt.md");
    expect(yaml).toContain("path: references/quality-reviewer-prompt.md");
  });

  it("skill.yaml routing_summary declares the orchestration mode entry", () => {
    const yaml = parse(read(".ai/core/skills/case-draft/skill.yaml")) as any;
    const joined = yaml.body.always_load.routing_summary.join("\n");
    expect(joined).toContain("阶段内任务编排");
  });

  it("hard_rules contain the new SourceRef layering rule", () => {
    const yaml = parse(read(".ai/core/skills/case-draft/skill.yaml")) as any;
    const joined = yaml.body.always_load.hard_rules.join("\n");
    expect(joined).toContain("requirement_atoms 中的 SourceRef ID 引用");
    expect(joined).toContain("SourceRef 标识");
    expect(joined).toContain("case_id");
    expect(joined).toContain("requirement_atom_ids");
  });

  it("spec-reviewer prompt contains SourceRef layering lint patterns", () => {
    const prompt = read(".ai/core/skills/case-draft/references/spec-reviewer-prompt.md");
    expect(prompt).toContain("SourceRef");
    expect(prompt).toContain("SR-");
    expect(prompt).toContain("csv::");
    expect(prompt).toContain("requirement_atoms");
  });
});
