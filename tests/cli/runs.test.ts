import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runRunsPath, runRunsPrune, runRunsVerify } from "../../cli/commands/runs.ts";
import {
  resolvePlaywrightOutputDir,
  resolvePlaywrightRunPath,
} from "../../cli/lib/automation/playwright-run-path.ts";
import {
  buildDataAssetsChildEnv,
  type ResolvedDataAssetsEnv,
} from "../../cli/lib/dataassets-env.ts";
import { RUN_ID_RE, runIdType } from "../../cli/lib/run-id.ts";
import { executeWithRunPath } from "../../cli/lib/runs-exec.ts";

const FEATURE_PATH = "v1.0/【模块】需求";

function createProjectRoot(): { root: string; feature: string } {
  const root = mkdtempSync(join(tmpdir(), "kata-runs-"));
  const feature = join(root, "workspace", "dataAssets", "features", "v1.0", "【模块】需求");
  mkdirSync(feature, { recursive: true });
  return { root, feature };
}

/** Expected run-id prefix YYYYMMDD-HHmm rendered in the local timezone. */
function localPrefix(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}

function createRun(feature: string, runId: string): string {
  const runPath = join(feature, "runs", runId);
  mkdirSync(runPath, { recursive: true });
  return runPath;
}

function writeStatus(runPath: string, status: unknown): void {
  writeFileSync(join(runPath, "status.json"), JSON.stringify(status));
}

describe("runs execution contract", () => {
  it("allocates canonical runs/<run-id> paths", () => {
    const { root, feature } = createProjectRoot();
    const now = new Date("2026-07-26T12:00:00Z");
    const allocation = runRunsPath({
      root,
      project: "dataAssets",
      featurePath: FEATURE_PATH,
      newRun: true,
      runType: "preflight",
      now,
    });

    expect(allocation.path).toBe(join(feature, "runs", allocation.runId));
    expect(allocation.runId).toBe(`${localPrefix(now)}-preflight-01`);
    expect(existsSync(allocation.path)).toBe(true);
  });

  it("allocates increasing sequence numbers exclusively", () => {
    const { root } = createProjectRoot();
    const now = new Date("2026-07-26T12:00:00Z");
    const opts = {
      root,
      project: "dataAssets",
      featurePath: FEATURE_PATH,
      newRun: true,
      runType: "run" as const,
      now,
    };
    const first = runRunsPath(opts);
    const second = runRunsPath(opts);
    expect(first.runId).toBe(`${localPrefix(now)}-run-01`);
    expect(second.runId).toBe(`${localPrefix(now)}-run-02`);
    expect(existsSync(first.path)).toBe(true);
    expect(existsSync(second.path)).toBe(true);
  });

  it("accepts sequence numbers beyond two digits in RUN_ID_RE", () => {
    expect(RUN_ID_RE.test("20260726-1200-run-205")).toBe(true);
    expect(runIdType("20260726-1200-run-205")).toBe("run");
    expect(RUN_ID_RE.test("20260726-1200-run-1")).toBe(false);
    expect(RUN_ID_RE.test("20260726-1200-run-01.tmp")).toBe(false);
  });

  it("ignores forged or non-canonical dirs when resolving the latest run", () => {
    const { root, feature } = createProjectRoot();
    createRun(feature, "20260726-1200-run-01");
    createRun(feature, "zzzzz-forged-latest");
    const latest = runRunsPath({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(latest.runId).toBe("20260726-1200-run-01");
  });

  it("prunes only canonical run directories and preserves unrelated evidence", () => {
    const { root, feature } = createProjectRoot();
    createRun(feature, "20260726-1200-run-01");
    createRun(feature, "20260726-1200-run-02");
    mkdirSync(join(feature, "runs", "notes"), { recursive: true });
    writeFileSync(join(feature, "runs", "notes", "keep.txt"), "evidence\n");

    const result = runRunsPrune({
      root,
      project: "dataAssets",
      featurePath: FEATURE_PATH,
      keep: 0,
      apply: true,
    });

    expect(result.removed).toEqual([
      "【模块】需求/20260726-1200-run-01",
      "【模块】需求/20260726-1200-run-02",
    ]);
    expect(existsSync(join(feature, "runs", "notes", "keep.txt"))).toBe(true);
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

  it("accepts an allocated run in KATA_WORKSPACE_ROOT", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runs-external-"));
    const workspaceRoot = join(root, "private-workspace");
    const runPath = join(
      workspaceRoot,
      "dataAssets",
      "features",
      "v1.0",
      "【模块】需求",
      "runs",
      "20260726-1200-run-01",
    );
    mkdirSync(runPath, { recursive: true });
    const env = {
      KATA_ACTIVE_PROJECT: "dataAssets",
      KATA_RUN_PATH: runPath,
      KATA_WORKSPACE_ROOT: workspaceRoot,
    };

    expect(resolvePlaywrightRunPath(env, root)).toBe(runPath);
    expect(resolvePlaywrightOutputDir(env, root)).toBe(join(runPath, "test-results"));
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
        "process.exit(process.env.KATA_RUN_PATH && !process.env.SHOULD_NOT_BE_INHERITED ? 0 : 9)",
      ],
    });

    const status = JSON.parse(readFileSync(join(runPath, "status.json"), "utf8"));
    expect(exitCode).toBe(0);
    expect(status.status).toBe("command_passed");
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
        KATA_WORKSPACE_ROOT: "/private/workspace",
        SHOULD_NOT_BE_INHERITED: "secret-like-value",
      },
    );

    expect(childEnv.KATA_RUN_PATH).toBe("/tmp/kata-run");
    expect(childEnv.KATA_WORKSPACE_ROOT).toBe("/private/workspace");
    expect(childEnv.KATA_DATAASSETS_ENV).toBeUndefined();
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

describe("runs verify", () => {
  function passingRun(feature: string): string {
    const runPath = createRun(feature, "20260726-1200-run-01");
    writeStatus(runPath, { schemaVersion: 1, status: "command_passed", exitCode: 0 });
    mkdirSync(join(runPath, "allure-results"));
    writeFileSync(join(runPath, "allure-results", "abc-result.json"), "{}");
    return runPath;
  }

  it("passes a run that satisfies the delivery contract", () => {
    const { root, feature } = createProjectRoot();
    const runPath = passingRun(feature);
    writeFileSync(join(runPath, "handoff.md"), "# handoff\n");
    const result = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(result.ok).toBe(true);
    expect(result.runId).toBe("20260726-1200-run-01");
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails when status.json is missing", () => {
    const { root, feature } = createProjectRoot();
    const runPath = createRun(feature, "20260726-1200-run-01");
    mkdirSync(join(runPath, "allure-results"));
    writeFileSync(join(runPath, "allure-results", "abc-result.json"), "{}");
    const result = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(result.ok).toBe(false);
    const status = result.checks.find((c) => c.name === "status");
    expect(status?.passed).toBe(false);
    expect(status?.message).toContain("status.json 缺失");
  });

  it("fails for a forged passed status with a non-zero exit code", () => {
    const { root, feature } = createProjectRoot();
    const runPath = passingRun(feature);
    writeStatus(runPath, { schemaVersion: 1, status: "command_passed", exitCode: 7 });
    const result = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.name === "status")?.passed).toBe(false);
  });

  it("fails for status values outside the schema", () => {
    const { root, feature } = createProjectRoot();
    const runPath = passingRun(feature);
    writeStatus(runPath, { schemaVersion: 1, status: "passed", exitCode: 0 });
    const result = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(result.ok).toBe(false);
    writeStatus(runPath, { schemaVersion: 1, status: "failed", exitCode: 3 });
    expect(runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH }).ok).toBe(
      false,
    );
  });

  it("fails when allure-results is missing or empty even with a passing status", () => {
    const { root, feature } = createProjectRoot();
    const runPath = passingRun(feature);
    writeFileSync(join(runPath, "handoff.md"), "# handoff\n");
    // 清空 allure-results
    rmSync(join(runPath, "allure-results"), { recursive: true });
    const missing = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(missing.ok).toBe(false);
    expect(missing.checks.find((c) => c.name === "allure-results")?.message).toContain("缺失");

    mkdirSync(join(runPath, "allure-results"));
    const empty = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(empty.ok).toBe(false);
    expect(empty.checks.find((c) => c.name === "allure-results")?.message).toContain(
      "无 *-result.json",
    );
  });

  it("warns but does not fail when handoff.md is missing", () => {
    const { root, feature } = createProjectRoot();
    passingRun(feature);
    const result = runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH });
    expect(result.ok).toBe(true);
    const handoff = result.checks.find((c) => c.name === "handoff");
    expect(handoff?.level).toBe("warning");
    expect(handoff?.passed).toBe(false);
  });

  it("rejects a forged --run value instead of silently falling back", () => {
    const { root } = createProjectRoot();
    expect(() =>
      runRunsVerify({ root, project: "dataAssets", featurePath: FEATURE_PATH, runId: "forged" }),
    ).toThrow(/非法 run-id/);
  });

  it("exits non-zero via the CLI when verification fails", () => {
    const { root, feature } = createProjectRoot();
    createRun(feature, "20260726-1200-run-01"); // 无任何契约产物
    const kata = resolve(import.meta.dir, "../../cli/bin/kata.ts");
    const env = { ...process.env, KATA_WORKSPACE_ROOT: join(root, "workspace") };
    const cwd = resolve(import.meta.dir, "../..");
    const failing = spawnSync(
      "bun",
      [kata, "runs", "verify", "--project", "dataAssets", "--feature", FEATURE_PATH],
      { cwd, encoding: "utf8", env },
    );
    expect(failing.status).toBe(1);
    expect(failing.stdout).toContain("status.json 缺失");

    passingRun(feature);
    const passing = spawnSync(
      "bun",
      [
        kata,
        "runs",
        "verify",
        "--project",
        "dataAssets",
        "--feature",
        FEATURE_PATH,
        "--run",
        "20260726-1200-run-01",
      ],
      { cwd, encoding: "utf8", env },
    );
    expect(passing.status).toBe(0);
    expect(passing.stdout).toContain("通过");
  });
});
