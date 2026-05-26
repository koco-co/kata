import { describe, expect, it } from "bun:test";
import { validatePromptSourceQuality } from "../../src/ai-core/prompt-source-quality.ts";

describe("AI Core prompt source quality", () => {
  it("detects overlong prompt-source lines", () => {
    const result = validatePromptSourceQuality({
      virtualFiles: {
        ".ai/core/skills/demo/references/demo.md": `# demo\n${"x".repeat(501)}\n`,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("prompt_source.overlong_line");
  });

  it("committed prompt sources pass the quality gate", () => {
    const result = validatePromptSourceQuality();

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.value?.checkedFiles.length).toBeGreaterThan(20);
  });
});
