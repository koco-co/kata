import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRunsPath } from "../../cli/commands/runs.ts";
import {
  buildDataAssetsChildEnv,
  type ResolvedDataAssetsEnv,
} from "../../cli/lib/dataassets-env.ts";
import {
  resolvePlaywrightOutputDir,
  resolvePlaywrightRunPath,
} from "../../cli/lib/playwright-run-path.ts";
import { executeWithRunPath } from "../../cli/lib/runs-exec.ts";

function createProjectRoot(): { root: string; feature: string } {
  const root = mkdtempSync(join(tmpdir(), "kata-runs-"));
  const feature = join(root, "workspace", "dataAssets", "features", "v1.0", "feature-a");
  mkdirSync(feature, { recursive: true });
  return { root, feature };
}

describe("runs execution contract", () => {
  it("allocates canonical runs/<run-id> paths", () => {
    const { root, feature } = createProjectRoot();
    const allocation = runRunsPath({
      root,
      project: "dataAssets",
      featureId: "feature-a",
      newRun: true,
      runType: "preflight",
      now: new Date("2026-07-26T12:00:00Z"),
    });

    expect(allocation.path).toBe(join(feature, "runs", allocation.runId));
    expect(allocation.runId).toBe("20260726-1200-preflight-01");
    expect(existsSync(allocation.path)).toBe(true);
  });

  it("requires an allocated canonical run path for Playwright output", () => {
    const { root, feature } = createProjectRoot();
    const runPath = join(feature, "runs", "20260726-1200-run-01");
    const env = { KATA_ACTIVE_PROJECT: "dataAssets", KATA_RUN_PATH: runPath };

    expect(resolvePlaywrightRunPath(env, root)).toBe(runPath);
    expect(resolvePlaywrightOutputDir(env, root)).toBe(join(runPath, "test-results"));
    expect(() => resolvePlaywrightRunPath({ KATA_ACTIVE_PROJECT: "dataAssets" }, root)).toThrow(
      /KATA_RUN_PATH is required/,
    );
    expect(() =>
      resolvePlaywrightRunPath(
        {
          KATA_ACTIVE_PROJECT: "dataAssets",
          KATA_RUN_PATH: join(root, "workspace", "dataAssets", ".runs", "test-results"),
        },
        root,
      ),
    ).toThrow(/workspace\/<project>\/features/);
  });

  it("passes the run environment and persists a successful status", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runs-exec-"));
    const runPath = join(root, "runs", "20260726-1200-run-01");
    mkdirSync(runPath, { recursive: true });
    const exitCode = await executeWithRunPath({
      runId: "20260726-1200-run-01",
      runPath,
      project: "dataAssets",
      cwd: root,
      command: [
        process.execPath,
        "-e",
        "process.exit(process.env.KATA_RUN_PATH && process.env.KATA_ALLURE_RESULTS_DIR === process.env.KATA_RUN_PATH + '/allure-results' ? 0 : 9)",
      ],
    });

    const status = JSON.parse(readFileSync(join(runPath, "status.json"), "utf8"));
    expect(exitCode).toBe(0);
    expect(status.status).toBe("passed");
    expect(status.exitCode).toBe(0);
    expect(status.command.argCount).toBe(2);
  });

  it("preserves run variables through kata env run child filtering", () => {
    const { root } = createProjectRoot();
    const childEnv = buildDataAssetsChildEnv(
      "ci63",
      { env: "ci63" } as ResolvedDataAssetsEnv,
      { repoRoot: root },
      {
        PATH: process.env.PATH,
        KATA_RUN_PATH: "/tmp/kata-run",
        KATA_ALLURE_RESULTS_DIR: "/tmp/kata-run/allure-results",
        SHOULD_NOT_BE_INHERITED: "secret-like-value",
      },
    );

    expect(childEnv.KATA_RUN_PATH).toBe("/tmp/kata-run");
    expect(childEnv.KATA_ALLURE_RESULTS_DIR).toBe("/tmp/kata-run/allure-results");
    expect(childEnv.SHOULD_NOT_BE_INHERITED).toBeUndefined();
  });

  it("keeps failed run evidence and returns the child exit code", async () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runs-exec-"));
    const runPath = join(root, "runs", "20260726-1200-run-01");
    mkdirSync(runPath, { recursive: true });
    const exitCode = await executeWithRunPath({
      runId: "20260726-1200-run-01",
      runPath,
      project: "dataAssets",
      cwd: root,
      command: [process.execPath, "-e", "process.exit(7)"],
    });

    const status = JSON.parse(readFileSync(join(runPath, "status.json"), "utf8"));
    expect(exitCode).toBe(7);
    expect(status.status).toBe("failed");
    expect(status.exitCode).toBe(7);
    expect(existsSync(runPath)).toBe(true);
  });
});
