import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runEnvCheck } from "../../src/cli/env-check.ts";

describe("kata env check", () => {
  it("returns ok object with required keys", async () => {
    const r = await runEnvCheck({ project: "dataAssets", env: "ci63" });
    expect(r).toHaveProperty("baseUrl");
    expect(r).toHaveProperty("tenant");
    expect(r).toHaveProperty("dtstackReachable");
  });

  it("does not assume dtstack is reachable only because an env file exists", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "kata-env-check-"));
    try {
      const envDir = join(scratch, "workspace/dataAssets/_shared/env");
      mkdirSync(envDir, { recursive: true });
      writeFileSync(
        join(envDir, "ci63.yaml"),
        "base_url: http://example.test\ntenant_name: demo\n",
      );
      const r = await runEnvCheck({
        project: "dataAssets",
        env: "ci63",
        repoRoot: scratch,
        probe: async () => ({ ok: false, reason: "dtstack-cli unavailable" }),
      });
      expect(r.dtstackReachable).toBe(false);
      expect(r.reason).toContain("unavailable");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
