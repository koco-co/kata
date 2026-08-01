import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("project workspace routing", () => {
  it("creates the skeleton under KATA_WORKSPACE_ROOT", () => {
    const workspace = mkdtempSync(join(tmpdir(), "kata-project-private-"));
    const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
    try {
      const result = spawnSync(
        "bun",
        [kata, "project", "create", "--project", "demo", "--confirmed"],
        {
          cwd: resolve(import.meta.dir, "../.."),
          env: { ...process.env, KATA_WORKSPACE_ROOT: workspace },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      expect(existsSync(join(workspace, "demo", "knowledge", "overview.md"))).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked project directory", () => {
    const workspace = mkdtempSync(join(tmpdir(), "kata-project-private-"));
    const outside = mkdtempSync(join(tmpdir(), "kata-project-outside-"));
    symlinkSync(outside, join(workspace, "demo"));
    const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
    try {
      const result = spawnSync("bun", [kata, "project", "scan", "--project", "demo"], {
        cwd: resolve(import.meta.dir, "../.."),
        env: { ...process.env, KATA_WORKSPACE_ROOT: workspace },
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("符号链接");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
