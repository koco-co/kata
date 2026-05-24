import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");
const refDir = ".ai/core/skills/playwright-automation/references";
const read = (f: string) => readFileSync(join(root, refDir, f), "utf8");

describe("playwright-automation fidelity contract regression", () => {
  it("ui-plan.md removed the surface downgrade escape hatch", () => {
    expect(read("ui-plan.md")).not.toContain("最小 full runner");
  });

  it("case-normalize.md removed the simplify-to-contract-test option", () => {
    expect(read("case-normalize.md")).not.toContain("简化为「进入页面验证 UI 元素存在」的契约测试");
  });

  it("case-normalize.md points excluded cases at handoff.excluded_cases not remaining_risks", () => {
    const md = read("case-normalize.md");
    expect(md).toContain("excluded_cases");
    expect(md).not.toContain("remaining_risks");
  });

  it("playwright-generate.md mandates coverage fidelity", () => {
    expect(read("playwright-generate.md")).toContain("覆盖忠实度");
  });

  it("quality-reviewer-prompt.md adds the fidelity check category", () => {
    const md = read("quality-reviewer-prompt.md");
    expect(md).toContain("fidelity");
    expect(md).toContain("selector | assertion | repair | reuse | fidelity");
  });
});
