import { describe, expect, it } from "bun:test";
import { buildClaudeArgs, buildCodexArgs } from "../../src/e2e/runtime-invoke.ts";

describe("runtime arg builders", () => {
  it("builds claude headless args", () => {
    const a = buildClaudeArgs({ prompt: "do it", cwd: "/w" });
    expect(a).toContain("-p");
    expect(a).toContain("do it");
  });
  it("builds codex exec args", () => {
    const a = buildCodexArgs({ prompt: "do it", cwd: "/w" });
    expect(a[0]).toBe("exec");
    expect(a).toContain("do it");
  });
});
