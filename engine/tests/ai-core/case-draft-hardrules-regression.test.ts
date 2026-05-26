import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

type CaseDraftSkillYaml = {
  body: {
    always_load: {
      hard_rules: string[];
    };
  };
};

const root = join(import.meta.dirname, "../../..");
const skillPath = ".ai/core/skills/case-draft/skill.yaml";

const hardRules = (() => {
  const source = readFileSync(join(root, skillPath), "utf8");
  const yaml = parse(source) as CaseDraftSkillYaml;

  return yaml.body.always_load.hard_rules;
})();

describe("case-draft hard_rules regression", () => {
  // Baseline updated 2026-05-22: P3-06 — negative constraints reframed as positive guidance; giant rule #5 split into 4 independent rules.
  // Updated 2026-05-25: +5 output-standard rules (file-set, no machine id in title, bracket semantics, no weak expected, evidence floor).
  // Updated 2026-05-25: +1 Lanhu/Axure silent-intake rule surfaced into always_load so the silence rule governs the first message (was buried in error-fallback reference).
  // Updated 2026-05-26: -3 rules collapsed into SSOT pointer (case-level format moved to output-standard.md#用例级节点格式; evidence-floor merged into the pointer line).
  const BASELINE_SHA256 = "328b29f6dd1b368591a33520da0cb0589f643e27038bca278fb098d507721d23";
  const BASELINE_COUNT = 17;

  it("hard_rules array length is unchanged", () => {
    expect(hardRules.length).toBe(BASELINE_COUNT);
  });

  it("hard_rules joined sha256 is unchanged", () => {
    const joined = hardRules.join("\n");
    const sha = createHash("sha256").update(joined).digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
});
