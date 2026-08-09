import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseKeepCount, runRunsPath, runRunsPrune } from "../../cli/commands/runs.ts";
import { buildPlatformEnvChildEnv, type ResolvedPlatformEnv } from "../../cli/lib/platform-env.ts";
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

describe("runs execution contract", () => {
  it("accepts only safe non-negative integer prune counts", () => {
    expect(parseKeepCount("0")).toBe(0);
    expect(parseKeepCount("05")).toBe(5);
    expect(() => parseKeepCount("5junk")).toThrow(/非负整数/);
    expect(() => parseKeepCount("1.5")).toThrow(/非负整数/);
    expect(() => parseKeepCount("9007199254740992")).toThrow(/非负整数/);
  });

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

  it("rejects an explicit archived feature instead of pruning its runs", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-runs-archived-"));
    const feature = join(
      root,
      "workspace",
      "dataAssets",
      "features",
      "_archived",
      "v1.0",
      "【模块】需求",
    );
    createRun(feature, "20260726-1200-run-01");

    expect(() =>
      runRunsPrune({
        root,
        project: "dataAssets",
        featurePath: "_archived/v1.0/【模块】需求",
        keep: 0,
        apply: true,
      }),
    ).toThrow(/归档 feature 不参与 runs prune/);
    expect(existsSync(join(feature, "runs", "20260726-1200-run-01"))).toBe(true);
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
    const childEnv = buildPlatformEnvChildEnv(
      "ci63",
      {
        schemaVersion: 2,
        env: "ci63",
        urls: {
          baseUrl: "https://platform.example.test/",
          assetsBaseUrl: "https://platform.example.test/",
          offlineBaseUrl: "https://platform.example.test/",
          portalBaseUrl: "https://platform.example.test/",
        },
        tenant: { name: "tenant-a" },
        projects: { quality: { id: 1, name: "quality-a" } },
        datasources: {},
        defaults: { datasource: "none" },
        safety: { allowWrite: false },
      } satisfies ResolvedPlatformEnv,
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
    expect(childEnv.KATA_ACTIVE_ENV).toBeUndefined();
    expect(childEnv.KATA_ACTIVE_PROJECT).toBeUndefined();
    expect(childEnv.SHOULD_NOT_BE_INHERITED).toBeUndefined();
    const resolved = JSON.parse(childEnv.KATA_ACTIVE_ENV_RESOLVED as string) as Record<
      string,
      unknown
    >;
    expect(resolved.automation).toBeUndefined();
    expect(resolved.schemaVersion).toBe(2);
  });

  it("passes an explicit project without inventing a default", () => {
    const { root } = createProjectRoot();
    const childEnv = buildPlatformEnvChildEnv(
      "ci63",
      { env: "ci63" } as ResolvedPlatformEnv,
      { repoRoot: root, project: "customerProject" },
      {},
    );
    expect(childEnv.KATA_ACTIVE_PROJECT).toBe("customerProject");
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
