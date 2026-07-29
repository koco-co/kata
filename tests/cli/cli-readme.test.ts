import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";

describe("CLI documentation", () => {
  it("keeps cli/README.md synchronized with recursive Commander help", () => {
    const result = spawnSync("bun", ["cli/scripts/generate-readme.ts", "--check"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  }, 30_000);
});
