import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("scans Markdown-only contract", () => {
  it("accepts a patch input and writes only the formal Markdown report", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-scan-"));
    mkdirSync(join(root, "workspace", "dataAssets"), { recursive: true });
    writeFileSync(join(root, "package.json"), "{}\n");
    const patch = join(root, "input.patch");
    writeFileSync(patch, "diff --git a/src/a.ts b/src/a.ts\n+new\n-old\n");
    const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
    const result = spawnSync(
      "bun",
      [
        kata,
        "scans",
        "create",
        "--project",
        "dataAssets",
        "--patch",
        patch,
        "--yyyymm",
        "202607",
        "--slug",
        "demo",
      ],
      {
        cwd: root,
        encoding: "utf8",
      },
    );
    expect(result.status).toBe(0);
    const reportDir = join(root, "workspace", "dataAssets", "analyses", "scan-report", "202607");
    expect(readdirSync(reportDir)).toEqual(["demo.md"]);
    expect(result.stdout).toContain("demo.md");
  });
});
