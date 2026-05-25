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
  // Baseline updated 2026-05-22: P3-04 — thinned env-preflight rules (delegated to references/env-preflight.md).
  // Baseline updated 2026-05-22: P3-06 — negative constraints reframed as positive guidance; pipeline order made explicit.
  // Baseline updated 2026-05-24: 覆盖忠实度 hard_rule 新增（surface 降级逃生舱收口）。
  const BASELINE_SHA256 = "eb6dfe9516c9be03a5605fe4eca5fd1a8467e0058512431e015af8e0b3d6306d";
  const BASELINE_COUNT = 15;

  it("hard_rules array length is unchanged", () => {
    expect(hardRules.length).toBe(BASELINE_COUNT);
  });

  it("hard_rules joined sha256 is unchanged", () => {
    const joined = hardRules.join("\n");
    const sha = createHash("sha256").update(joined).digest("hex");
    expect(sha).toBe(BASELINE_SHA256);
  });
});
