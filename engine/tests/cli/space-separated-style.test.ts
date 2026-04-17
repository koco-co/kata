import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "../../..");
const kata = (args: string) =>
  execSync(`bun ${join(repoRoot, "engine/bin/kata")} ${args}`, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

describe("kata CLI uses <noun> <verb> style", () => {
  it("exposes `kata cases lint` (not `cases:lint`)", () => {
    const out = kata("--help");
    expect(out).toContain("cases");
    expect(out).not.toMatch(/cases:lint/);
  });

  it("does not expose legacy one-off or colon commands in root help", () => {
    const out = kata("--help");
    expect(out).not.toContain("test:bucket-audit");
    expect(out).not.toContain("archive-gen");
    expect(out).not.toContain("knowledge-keeper");
  });

  it("exposes `kata agents audit`", () => {
    const out = kata("agents --help");
    expect(out).toContain("audit");
  });

  it("exposes `kata paths audit`", () => {
    const out = kata("paths --help");
    expect(out).toContain("audit");
  });

  it("rejects old colon syntax", () => {
    let threw = false;
    try {
      kata("cases:lint");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
