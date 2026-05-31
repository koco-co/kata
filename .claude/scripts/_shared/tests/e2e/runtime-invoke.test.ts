import { describe, expect, it } from "bun:test";
import { buildClaudeArgs } from "@shared/lib/e2e/runtime-invoke.ts";

describe("runtime arg builders", () => {
  it("builds claude headless args", () => {
    const a = buildClaudeArgs({ prompt: "do it", cwd: "/w" });
    expect(a).toContain("-p");
    expect(a).toContain("do it");
  });
});
