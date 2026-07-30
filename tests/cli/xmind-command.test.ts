import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

describe("public CLI surface", () => {
  it("does not expose the legacy xmind command", () => {
    const result = spawnSync("bun", ["cli/bin/kata.ts", "xmind", "--help"], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("未知命令: xmind");
  });

  it("does not retain an unregistered legacy xmind implementation", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    expect(existsSync(join(repoRoot, "cli", "commands", "xmind.ts"))).toBe(false);
  });
});
