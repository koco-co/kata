import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

describe("CLI documentation", () => {
  it("keeps cli/README.md synchronized with recursive Commander help", () => {
    const result = spawnSync("bun", ["cli/scripts/generate-readme.ts", "--check"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  }, 60_000);

  it("does not persist checkout-specific absolute paths", () => {
    const readme = readFileSync("cli/README.md", "utf8");
    expect(readme).not.toContain(process.cwd());
  });
});
