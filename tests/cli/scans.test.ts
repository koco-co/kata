import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function setup(): { root: string; patch: string } {
  const root = mkdtempSync(join(tmpdir(), "kata-scan-"));
  mkdirSync(join(root, "workspace", "dataAssets"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  const patch = join(root, "input.patch");
  writeFileSync(patch, "diff --git a/src/a.ts b/src/a.ts\n+new\n-old\n");
  return { root, patch };
}

function create(root: string, extra: string[]) {
  const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
  return spawnSync("bun", [kata, "scans", "create", "--project", "dataAssets", ...extra], {
    cwd: root,
    encoding: "utf8",
  });
}

describe("scans Markdown-only contract", () => {
  it("accepts a patch input and writes only the formal Markdown report", () => {
    const { root, patch } = setup();
    const result = create(root, ["--patch", patch, "--yyyymm", "202607", "--slug", "demo"]);
    expect(result.status).toBe(0);
    const reportDir = join(root, "workspace", "dataAssets", "analyses", "scan-report", "202607");
    expect(readdirSync(reportDir)).toEqual(["demo.md"]);
    expect(result.stdout).toContain("demo.md");
  });

  it("refuses to overwrite an existing report unless --force is given", () => {
    const { root, patch } = setup();
    const args = ["--patch", patch, "--yyyymm", "202607", "--slug", "demo"];
    expect(create(root, args).status).toBe(0);
    const duplicate = create(root, args);
    expect(duplicate.status).not.toBe(0);
    expect(duplicate.stderr).toContain("--force");
    const forced = create(root, [...args, "--force"]);
    expect(forced.status).toBe(0);
  });

  it("rejects an invalid slug and an invalid yyyymm before writing", () => {
    const { root, patch } = setup();
    const badSlug = create(root, ["--patch", patch, "--yyyymm", "202607", "--slug", "../evil"]);
    expect(badSlug.status).not.toBe(0);
    const badYm = create(root, ["--patch", patch, "--yyyymm", "20261", "--slug", "demo"]);
    expect(badYm.status).not.toBe(0);
    expect(
      readdirSync(join(root, "workspace", "dataAssets")).filter((d) => d === "analyses"),
    ).toHaveLength(0);
  });

  it("rejects --patch combined with branch-pair arguments", () => {
    const { root, patch } = setup();
    const result = create(root, [
      "--patch",
      patch,
      "--repo",
      "group/repo",
      "--base-branch",
      "main",
      "--head-branch",
      "dev",
      "--yyyymm",
      "202607",
      "--slug",
      "demo",
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("必须二选一");
  });
});
