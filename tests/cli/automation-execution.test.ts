import { describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  AutomationExecutionError,
  collectAutomationExecution,
  runAutomationExecution,
} from "../../cli/lib/automation/automation-execution.ts";
import type { MaterializedExecutorCommand } from "../../cli/lib/automation/executor-command.ts";
import type { ExecutorDescriptor } from "../../cli/lib/automation/executor-registry.ts";
import {
  AUTOMATION_AUTH_COOKIE_ENV,
  AUTOMATION_PLATFORM_CONTEXT_ENV,
  type AutomationExecutorEnvOverlay,
} from "../../cli/lib/platform-env.ts";

interface Fixture {
  root: string;
  featureDir: string;
  descriptor: ExecutorDescriptor;
}

function fixture(options: { state?: "active" | "planned"; write?: boolean } = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "automation-execution-"));
  const featureDir = join(root, "workspace", "dataAssets", "features", "v1.0.0", "需求");
  const executorRoot = join(root, "automation", "playwright-web-ui");
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  mkdirSync(executorRoot, { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  writeFileSync(
    join(featureDir, "cases", "需求.yaml"),
    `meta:
  title: 自动化执行契约
  feature_id: automation-execution-contract
  project_id: data-assets
  case_module_id: ""
  automation_env: ci63
cases:
  - case_id: C0001
    automation:
      effects:
        platform_write: ${options.write === true}
      business_record:
        policy: ${options.write === true ? "required" : "not_applicable"}
${options.write === true ? "" : "        reason: 只读核对，不产生业务数据记录\n"}      implementations:
        - executor: playwright-web-ui
          state: ${options.state ?? "active"}
    title: 执行受控用例
    priority: P0
    steps:
      - action: 执行业务动作
        expected: 结果正确
`,
  );
  const commands = {
    setup: { argv: ["executor", "setup"] },
    doctor: { argv: ["executor", "doctor"] },
    collect: {
      argv: ["executor", "collect", "--execution-manifest", "{execution_manifest}"],
    },
    run: { argv: ["executor", "run", "--execution-manifest", "{execution_manifest}"] },
  } as const;
  return {
    root,
    featureDir,
    descriptor: {
      schemaVersion: 1,
      id: "playwright-web-ui",
      engine: "playwright",
      surface: "web-ui",
      rootDir: executorRoot,
      descriptorPath: join(executorRoot, "executor.toml"),
      runtime: { kind: "python", cwd: root },
      commands,
      capabilities: { requires: [], provides: [] },
      agent: { guide: "agent/guide.md", guidePath: join(executorRoot, "agent", "guide.md") },
    },
  };
}

function overlay(allowWrite: boolean): AutomationExecutorEnvOverlay {
  return {
    [AUTOMATION_PLATFORM_CONTEXT_ENV]: JSON.stringify({
      schemaVersion: 2,
      safety: { allowWrite },
    }),
    [AUTOMATION_AUTH_COOKIE_ENV]: "sid=synthetic-never-print",
  };
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("descriptor-driven automation execution", () => {
  it("collects an immutable manifest without resolving platform credentials", async () => {
    const item = fixture();
    const commands: MaterializedExecutorCommand[] = [];
    try {
      const result = await collectAutomationExecution({
        repoRoot: item.root,
        featureDir: item.featureDir,
        now: new Date("2026-08-09T01:02:00Z"),
        dependencies: {
          discoverExecutors: () => [item.descriptor],
          executeCommand: async (command) => {
            commands.push(command);
            return 0;
          },
          resolveEnvironment: async () => {
            throw new Error("collect must not resolve an environment");
          },
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.attempt).toBeUndefined();
      expect(commands).toHaveLength(1);
      expect(commands[0]?.argv[1]).toBe("collect");
      expect(commands[0]?.env).toEqual({});
      const manifest = readJson(result.manifestPath);
      expect(manifest.schema_version).toBe(2);
      expect(manifest.project_id).toBe("data-assets");
      expect(manifest.executor_id).toBe("playwright-web-ui");
      expect(manifest.cases).toEqual([
        {
          feature_id: "automation-execution-contract",
          case_id: "C0001",
          title: "执行受控用例",
          effects: { platform_write: false },
          business_record: {
            policy: "not_applicable",
            reason: "只读核对，不产生业务数据记录",
          },
        },
      ]);
      expect(readJson(join(result.executionPath, "collection-status.json"))).toMatchObject({
        schema_version: 1,
        phase: "collect",
        status: "command_passed",
        exit_code: 0,
      });
      expect(existsSync(join(result.executionPath, "attempts"))).toBe(false);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("collects planned candidates only for an explicit read-only preflight", async () => {
    const item = fixture({ state: "planned" });
    try {
      const result = await collectAutomationExecution({
        repoRoot: item.root,
        featureDir: item.featureDir,
        executorId: "playwright-web-ui",
        includePlanned: true,
        dependencies: {
          discoverExecutors: () => [item.descriptor],
          executeCommand: async () => 0,
        },
      });

      const manifest = readJson(result.manifestPath);
      expect(manifest.cases).toEqual([
        {
          feature_id: "automation-execution-contract",
          case_id: "C0001",
          title: "执行受控用例",
          effects: { platform_write: false },
          business_record: {
            policy: "not_applicable",
            reason: "只读核对，不产生业务数据记录",
          },
        },
      ]);
      expect(result.attempt).toBeUndefined();
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("runs exact collection then one isolated attempt with only controlled runtime env", async () => {
    const item = fixture();
    const commands: MaterializedExecutorCommand[] = [];
    const resolvedNames: string[] = [];
    try {
      const result = await runAutomationExecution({
        repoRoot: item.root,
        featureDir: item.featureDir,
        workers: 2,
        now: new Date("2026-08-09T01:03:00Z"),
        dependencies: {
          discoverExecutors: () => [item.descriptor],
          executeCommand: async (command) => {
            commands.push(command);
            return 0;
          },
          resolveEnvironment: async (name) => {
            resolvedNames.push(name);
            return overlay(false);
          },
        },
      });

      expect(result.exitCode).toBe(0);
      expect(resolvedNames).toEqual(["ci63"]);
      expect(commands.map((command) => command.argv[1])).toEqual(["collect", "run"]);
      expect(commands[0]?.argv.at(-1)).toBe(result.manifestPath);
      expect(commands[1]?.argv.at(-1)).toBe(result.manifestPath);
      expect(commands[0]?.env).toEqual({});
      const attempt = result.attempt;
      if (attempt === undefined) throw new Error("expected run attempt");
      expect(commands[1]?.env).toEqual({
        ...overlay(false),
        AUTOMATION_ATTEMPT_PATH: attempt.path,
        AUTOMATION_ATTEMPT_NUMBER: "1",
        AUTOMATION_WORKERS: "2",
      });
      expect(attempt.number).toBe(1);
      expect(readJson(join(attempt.path, "status.json"))).toMatchObject({
        schema_version: 1,
        phase: "run",
        status: "command_passed",
        exit_code: 0,
        attempt: 1,
      });
      expect(readJson(join(result.executionPath, "preparation-status.json"))).toMatchObject({
        schema_version: 1,
        phase: "prepare",
        status: "passed",
      });
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("stops before environment and attempt allocation when collection fails", async () => {
    const item = fixture();
    let environmentCalls = 0;
    try {
      const result = await runAutomationExecution({
        repoRoot: item.root,
        featureDir: item.featureDir,
        dependencies: {
          discoverExecutors: () => [item.descriptor],
          executeCommand: async () => 7,
          resolveEnvironment: async () => {
            environmentCalls += 1;
            return overlay(false);
          },
        },
      });

      expect(result.exitCode).toBe(7);
      expect(result.attempt).toBeUndefined();
      expect(environmentCalls).toBe(0);
      expect(readJson(join(result.executionPath, "collection-status.json"))).toMatchObject({
        status: "failed",
        exit_code: 7,
      });
      expect(existsSync(join(result.executionPath, "attempts"))).toBe(false);
      expect(result.handoffPath).toBe(join(result.logicalRunPath, "handoff.md"));
      const handoff = readFileSync(result.handoffPath as string, "utf8");
      expect(handoff).toContain("Result: **NOT VERIFIED**");
      expect(handoff).toContain("Attempt: `unavailable`");
      expect(handoff).toContain("- FAIL `collection`: `AUTOMATION_COLLECTION_FAILED`");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects writes disabled by platform safety before allocating an attempt", async () => {
    const item = fixture({ write: true });
    const phases: string[] = [];
    try {
      let raised: unknown;
      try {
        await runAutomationExecution({
          repoRoot: item.root,
          featureDir: item.featureDir,
          dependencies: {
            discoverExecutors: () => [item.descriptor],
            executeCommand: async (command) => {
              phases.push(String(command.argv[1]));
              return 0;
            },
            resolveEnvironment: async () => overlay(false),
          },
        });
      } catch (error) {
        raised = error;
      }

      expect(raised).toBeInstanceOf(AutomationExecutionError);
      expect((raised as AutomationExecutionError).code).toBe("PLATFORM_WRITE_FORBIDDEN");
      expect(String(raised)).not.toContain("synthetic-never-print");
      expect(phases).toEqual(["collect"]);
      const runs = join(item.root, "artifacts", "runs", "data-assets");
      const logicalRun = join(runs, readdirSync(runs)[0] as string);
      const execution = join(logicalRun, "executions", "playwright-web-ui", "execution-01");
      expect(existsSync(join(execution, "attempts"))).toBe(false);
      expect(readJson(join(execution, "preparation-status.json"))).toMatchObject({
        schema_version: 1,
        phase: "prepare",
        status: "failed",
        error_code: "PLATFORM_WRITE_FORBIDDEN",
      });
      const handoff = readFileSync(join(logicalRun, "handoff.md"), "utf8");
      expect(handoff).toContain("Result: **NOT VERIFIED**");
      expect(handoff).toContain("- FAIL `preparation`: `PLATFORM_WRITE_FORBIDDEN`");
      expect(handoff).not.toContain("synthetic-never-print");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("records a stable preparation failure without persisting resolver error text", async () => {
    const item = fixture();
    const secret = "resolver-secret-must-not-persist";
    try {
      let raised: unknown;
      try {
        await runAutomationExecution({
          repoRoot: item.root,
          featureDir: item.featureDir,
          dependencies: {
            discoverExecutors: () => [item.descriptor],
            executeCommand: async () => 0,
            resolveEnvironment: async () => {
              throw new Error(secret);
            },
          },
        });
      } catch (error) {
        raised = error;
      }

      expect(raised).toBeInstanceOf(AutomationExecutionError);
      expect((raised as AutomationExecutionError).code).toBe("AUTOMATION_ENV_RESOLUTION_FAILED");
      expect(String(raised)).not.toContain(secret);
      const runs = join(item.root, "artifacts", "runs", "data-assets");
      const logicalRun = join(runs, readdirSync(runs)[0] as string);
      const execution = join(logicalRun, "executions", "playwright-web-ui", "execution-01");
      expect(existsSync(join(execution, "attempts"))).toBe(false);
      const preparation = readFileSync(join(execution, "preparation-status.json"), "utf8");
      const handoff = readFileSync(join(logicalRun, "handoff.md"), "utf8");
      expect(preparation).toContain("AUTOMATION_ENV_RESOLUTION_FAILED");
      expect(handoff).toContain("AUTOMATION_ENV_RESOLUTION_FAILED");
      expect(preparation).not.toContain(secret);
      expect(handoff).not.toContain(secret);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("fails closed when the attempt directory is replaced by a symlink", async () => {
    const item = fixture();
    const outside = mkdtempSync(join(tmpdir(), "automation-attempt-outside-"));
    try {
      let raised: unknown;
      try {
        await runAutomationExecution({
          repoRoot: item.root,
          featureDir: item.featureDir,
          dependencies: {
            discoverExecutors: () => [item.descriptor],
            executeCommand: async (command) => {
              if (command.argv[1] === "collect") {
                const manifestPath = command.argv.at(-1) as string;
                symlinkSync(outside, join(dirname(manifestPath), "attempts"));
              }
              return 0;
            },
            resolveEnvironment: async () => overlay(false),
          },
        });
      } catch (error) {
        raised = error;
      }

      expect(raised).toBeInstanceOf(AutomationExecutionError);
      expect((raised as AutomationExecutionError).code).toBe(
        "AUTOMATION_ATTEMPT_ALLOCATION_FAILED",
      );
      const runs = join(item.root, "artifacts", "runs", "data-assets");
      const logicalRun = join(runs, readdirSync(runs)[0] as string);
      const execution = join(logicalRun, "executions", "playwright-web-ui", "execution-01");
      expect(readJson(join(execution, "preparation-status.json"))).toMatchObject({
        status: "failed",
        error_code: "AUTOMATION_ATTEMPT_ALLOCATION_FAILED",
      });
      expect(readFileSync(join(logicalRun, "handoff.md"), "utf8")).toContain(
        "AUTOMATION_ATTEMPT_ALLOCATION_FAILED",
      );
      expect(readdirSync(outside)).toEqual([]);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
