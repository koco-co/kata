import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

describe("kata features resolve (CLI)", () => {
  it("is registered as a subcommand", () => {
    const out = execSync(`bun ${join(repoRoot(), "engine/bin/kata")} features --help`, {
      encoding: "utf-8",
    });
    expect(out).toContain("resolve");
  });
});
