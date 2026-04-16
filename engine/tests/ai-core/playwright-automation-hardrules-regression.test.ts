import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseProductSkillContract } from "../../src/ai-core/product-skill-contract.ts";

const root = join(import.meta.dirname, "../../..");
const skillPath = ".ai/core/skills/playwright-automation/skill.yaml";

const hardRules = (() => {
  const source = readFileSync(join(root, skillPath), "utf8");
  const result = parseProductSkillContract(source, skillPath);

  if (!result.ok) {
    throw new Error(
      `Failed to parse ${skillPath}: ${result.issues.map((issue) => issue.code).join(", ")}`,
    );
  }

  return result.value.hardRules;
})();

describe("playwright-automation hard_rules regression", () => {
  // Baseline captured BEFORE this PR. If hard_rules need to change in this PR,
  // update this baseline in a SEPARATE commit with explicit justification.
  const BASELINE_SHA256 = "f81814f3f2e4b33b96212fa24e2b218a2a917e17946a46f5ddaea7e25ba51599";
  const BASELINE_COUNT = 60;

  it("hard_rules array length is unchanged", () => {
    expect(hardRules.length).toBe(BASELINE_COUNT);
  });

  it("hard_rules joined sha256 is unchanged", () => {
    const joined = hardRules.join("\n");
    const sha = createHash("sha256").update(joined).digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
});
