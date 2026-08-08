import { afterEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  ExecutorLifecycleError,
  isLifecycleExecutorId,
  runExecutorLifecycle,
  selectLifecycleExecutor,
} from "../../cli/lib/automation/executor-lifecycle.ts";
import type { ExecutorDescriptor } from "../../cli/lib/automation/executor-registry.ts";

const KATA = resolve(import.meta.dir, "../../cli/bin/kata.ts");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "executor-lifecycle-"));
  roots.push(root);
  mkdirSync(join(root, "workspace"), { recursive: true });
  mkdirSync(join(root, "automation"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  return root;
}

function descriptor(id: string): ExecutorDescriptor {
  const [engine, ...surfaceParts] = id.split("-");
  const surface = surfaceParts.join("-") as ExecutorDescriptor["surface"];
  const rootDir = `/repo/automation/${id}`;
  return {
    schemaVersion: 1,
    id,
    engine: engine ?? "missing",
    surface,
    rootDir,
    descriptorPath: `${rootDir}/executor.toml`,
    runtime: { kind: "fixture" },
    commands: {
      setup: { argv: ["fixture", "setup"] },
      doctor: { argv: ["fixture", "doctor"] },
      collect: {
        argv: ["fixture", "collect", "--execution-manifest", "{execution_manifest}"],
      },
      run: { argv: ["fixture", "run", "--execution-manifest", "{execution_manifest}"] },
    },
    capabilities: { requires: [], provides: [] },
    agent: { guide: "agent/guide.md", guidePath: `${rootDir}/agent/guide.md` },
  };
}

function tomlStringArray(values: readonly string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}

function installExecutor(root: string, id: string): string {
  const executorRoot = join(root, "automation", id);
  const outputPath = join(root, `${id}.json`);
  const scriptPath = join(executorRoot, "lifecycle.js");
  mkdirSync(join(executorRoot, "agent"), { recursive: true });
  writeFileSync(join(executorRoot, "agent", "guide.md"), "# Fixture executor\n");
  writeFileSync(
    scriptPath,
    [
      'import { writeFileSync } from "node:fs";',
      "writeFileSync(process.argv[2], JSON.stringify({",
      "  lifecycle: process.argv[3],",
      "  secret: process.env.KATA_PRIVATE_TOKEN,",
      "  arbitrary: process.env.ARBITRARY_SECRET,",
      "  path: process.env.PATH,",
      "}));",
      'if (process.argv[3] === "doctor") process.exitCode = 7;',
    ].join("\n"),
  );
  const argvPrefix = [process.execPath, scriptPath, outputPath];
  writeFileSync(
    join(executorRoot, "executor.toml"),
    [
      "schema_version = 1",
      `id = ${JSON.stringify(id)}`,
      `engine = ${JSON.stringify(id.split("-")[0])}`,
      `surface = ${JSON.stringify(id.split("-").slice(1).join("-"))}`,
      "",
      "[runtime]",
      'kind = "fixture"',
      'cwd = "../.."',
      "",
      "[commands.setup]",
      `argv = ${tomlStringArray([...argvPrefix, "setup"])}`,
      "",
      "[commands.doctor]",
      `argv = ${tomlStringArray([...argvPrefix, "doctor"])}`,
      "",
      "[commands.collect]",
      `argv = ${tomlStringArray([
        ...argvPrefix,
        "collect",
        "--execution-manifest",
        "{execution_manifest}",
      ])}`,
      "",
      "[commands.run]",
      `argv = ${tomlStringArray([
        ...argvPrefix,
        "run",
        "--execution-manifest",
        "{execution_manifest}",
      ])}`,
      "",
      "[capabilities]",
      "requires = []",
      "provides = []",
      "",
      "[agent]",
      'guide = "agent/guide.md"',
      "",
    ].join("\n"),
  );
  return outputPath;
}

function captureLifecycleError(run: () => unknown): ExecutorLifecycleError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutorLifecycleError);
    return error as ExecutorLifecycleError;
  }
  throw new Error("expected ExecutorLifecycleError");
}

describe("executor lifecycle selection", () => {
  it("selects the only discovered executor when no id is explicit", () => {
    const only = descriptor("request-api");
    expect(selectLifecycleExecutor([only])).toBe(only);
  });

  it("never treats an omitted setup executor as a bulk-install request", () => {
    const error = captureLifecycleError(() =>
      selectLifecycleExecutor([descriptor("request-api"), descriptor("playwright-web-ui")]),
    );
    expect(error.code).toBe("EXECUTOR_LIFECYCLE_AMBIGUOUS");
    expect(error.message).toContain("available=playwright-web-ui,request-api");
  });

  it("reports a stable empty list when no executor exists", () => {
    const error = captureLifecycleError(() => selectLifecycleExecutor([]));
    expect(error.code).toBe("EXECUTOR_LIFECYCLE_NONE_AVAILABLE");
    expect(error.message).toContain("available=(none)");
  });

  it("rejects an explicit unknown id and lists all available ids", () => {
    const known = descriptor("request-api");
    const error = captureLifecycleError(() =>
      selectLifecycleExecutor([known], "playwright-web-ui"),
    );
    expect(error.code).toBe("EXECUTOR_LIFECYCLE_UNKNOWN");
    expect(error.message).toContain("available=request-api");
  });

  it("rejects unsafe ids without reflecting their contents", () => {
    const known = descriptor("request-api");
    for (const unsafeId of [" request-api ", "Request-API", "bad\nexecutor", "bad\u001b[31m"]) {
      expect(isLifecycleExecutorId(unsafeId)).toBe(false);
      const error = captureLifecycleError(() => selectLifecycleExecutor([known], unsafeId));
      expect(error.code).toBe("EXECUTOR_LIFECYCLE_ID_INVALID");
      expect(error.message).toContain("available=request-api");
      expect(error.message).not.toContain(unsafeId);
    }
  });
});

describe("executor lifecycle execution", () => {
  it("discovers, materializes, and executes setup without a manifest or caller secrets", async () => {
    const root = repo();
    const outputPath = installExecutor(root, "request-api");

    const result = await runExecutorLifecycle("setup", {
      repoRoot: root,
      baseEnv: {
        PATH: process.env.PATH,
        KATA_PRIVATE_TOKEN: "must-not-leak",
        ARBITRARY_SECRET: "must-not-leak",
      },
    });

    expect(result).toEqual({ executorId: "request-api", lifecycle: "setup", exitCode: 0 });
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual({
      lifecycle: "setup",
      path: process.env.PATH,
    });
  });

  it("returns a doctor child failure without exiting or running setup", async () => {
    const root = repo();
    const outputPath = installExecutor(root, "request-api");

    await expect(
      runExecutorLifecycle("doctor", {
        repoRoot: root,
        executorId: "request-api",
        baseEnv: { PATH: process.env.PATH },
      }),
    ).resolves.toEqual({ executorId: "request-api", lifecycle: "doctor", exitCode: 7 });
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual({
      lifecycle: "doctor",
      path: process.env.PATH,
    });
  });
});

describe("kata automation lifecycle CLI", () => {
  it("documents the executor option for setup and doctor", () => {
    const root = repo();
    for (const lifecycle of ["setup", "doctor"]) {
      const result = spawnSync(process.execPath, [KATA, "automation", lifecycle, "--help"], {
        cwd: root,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("--executor <id>");
    }
  });

  it("prints only the selected id, lifecycle, and exit code after execution", () => {
    const root = repo();
    installExecutor(root, "request-api");
    const secret = "cli-secret-must-not-leak";

    const result = spawnSync(process.execPath, [KATA, "automation", "setup"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, KATA_PRIVATE_TOKEN: secret },
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe(
      "[automation lifecycle] executor=request-api lifecycle=setup exitCode=0",
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
    expect(result.stdout).not.toContain("lifecycle.js");
  });

  it("maps the selected doctor child status to process.exitCode without running setup", () => {
    const root = repo();
    const outputPath = installExecutor(root, "request-api");

    const result = spawnSync(
      process.execPath,
      [KATA, "automation", "doctor", "--executor", "request-api"],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status).toBe(7);
    expect(result.stdout.trim()).toBe(
      "[automation lifecycle] executor=request-api lifecycle=doctor exitCode=7",
    );
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toMatchObject({ lifecycle: "doctor" });
  });

  it("fails with a stable empty available list when no descriptor exists", () => {
    const root = repo();

    const result = spawnSync(process.execPath, [KATA, "automation", "setup"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("available=(none)");
    expect(result.stdout).toContain("executor=unresolved lifecycle=setup exitCode=1");
  });

  it("fails ambiguous setup without executing any descriptor", () => {
    const root = repo();
    const requestOutput = installExecutor(root, "request-api");
    const playwrightOutput = installExecutor(root, "playwright-web-ui");

    const result = spawnSync(process.execPath, [KATA, "automation", "setup"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("available=playwright-web-ui,request-api");
    expect(result.stdout).toContain("executor=unresolved lifecycle=setup exitCode=1");
    expect(() => readFileSync(requestOutput, "utf8")).toThrow();
    expect(() => readFileSync(playwrightOutput, "utf8")).toThrow();
  });

  it("fails an explicit unknown executor without executing the available descriptor", () => {
    const root = repo();
    const outputPath = installExecutor(root, "request-api");

    const result = spawnSync(
      process.execPath,
      [KATA, "automation", "doctor", "--executor", "playwright-web-ui"],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("available=request-api");
    expect(result.stdout).toContain("executor=playwright-web-ui lifecycle=doctor exitCode=1");
    expect(() => readFileSync(outputPath, "utf8")).toThrow();
  });

  it("does not reflect whitespace or terminal control characters from an invalid id", () => {
    const root = repo();
    const outputPath = installExecutor(root, "request-api");
    for (const unsafeId of [" request-api ", "bad\nexecutor\u001b[31m"]) {
      const result = spawnSync(
        process.execPath,
        [KATA, "automation", "setup", "--executor", unsafeId],
        { cwd: root, encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stdout.trim()).toBe(
        "[automation lifecycle] executor=unresolved lifecycle=setup exitCode=1",
      );
      expect(`${result.stdout}${result.stderr}`).not.toContain(unsafeId);
      expect(`${result.stdout}${result.stderr}`).not.toContain("\u001b");
      expect(result.stderr).toContain("available=request-api");
    }
    expect(() => readFileSync(outputPath, "utf8")).toThrow();
  });
});
