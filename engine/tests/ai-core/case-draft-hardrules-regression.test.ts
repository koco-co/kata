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
  const BASELINE_SHA256 = "4d00007464e5394a82d165f902f6f50cb401348aa444973190a3903c9871dcc9";
  const BASELINE_COUNT = 13;

  it("hard_rules array length is unchanged", () => {
    expect(hardRules.length).toBe(BASELINE_COUNT);
  });

  it("hard_rules joined sha256 is unchanged", () => {
    const joined = hardRules.join("\n");
    const sha = createHash("sha256").update(joined).digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
});
