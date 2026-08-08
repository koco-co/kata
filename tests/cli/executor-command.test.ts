import { afterEach, describe, expect, it } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ExecutorCommandError,
  type ExecutorCommandErrorCode,
  executeExecutorCommand,
  type MaterializedExecutorCommand,
  materializeExecutorCommand,
} from "../../cli/lib/automation/executor-command.ts";
import type {
  ExecutorCommandName,
  ExecutorDescriptor,
} from "../../cli/lib/automation/executor-registry.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "executor-command-"));
  roots.push(root);
  mkdirSync(join(root, "automation", "generic-api"), { recursive: true });
  return root;
}

function descriptor(
  root: string,
  overrides: {
    runtimeCwd?: string;
    commandCwd?: string;
    commandName?: ExecutorCommandName;
    argv?: readonly string[];
    runtimeEnv?: Readonly<Record<string, string>>;
    commandEnv?: Readonly<Record<string, string>>;
  } = {},
): ExecutorDescriptor {
  const executorRoot = join(root, "automation", "generic-api");
  const commandName = overrides.commandName ?? "collect";
  const baseCommands: ExecutorDescriptor["commands"] = {
    setup: { argv: ["tool", "setup"] },
    doctor: { argv: ["tool", "doctor"] },
    collect: {
      argv: ["tool", "collect", "--execution-manifest", "{execution_manifest}"],
    },
    run: { argv: ["tool", "run", "--execution-manifest", "{execution_manifest}"] },
  };
  const command = {
    ...baseCommands[commandName],
    ...(overrides.argv === undefined ? {} : { argv: overrides.argv }),
    ...(overrides.commandCwd === undefined ? {} : { cwd: overrides.commandCwd }),
    ...(overrides.commandEnv === undefined ? {} : { env: overrides.commandEnv }),
  };

  return {
    schemaVersion: 1,
    id: "generic-api",
    engine: "generic",
    surface: "api",
    rootDir: executorRoot,
    descriptorPath: join(executorRoot, "executor.toml"),
    runtime: {
      kind: "some-runtime",
      ...(overrides.runtimeCwd === undefined ? {} : { cwd: overrides.runtimeCwd }),
      ...(overrides.runtimeEnv === undefined ? {} : { env: overrides.runtimeEnv }),
    },
    commands: { ...baseCommands, [commandName]: command },
    capabilities: { requires: [], provides: [] },
    agent: { guide: "agent/guide.md", guidePath: join(executorRoot, "agent", "guide.md") },
  };
}

function manifest(root: string, name = "execution-manifest.json"): string {
  const path = join(root, "artifacts", name);
  mkdirSync(join(root, "artifacts"), { recursive: true });
  writeFileSync(path, "{}\n");
  return path;
}

function captureError(run: () => unknown): ExecutorCommandError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutorCommandError);
    return error as ExecutorCommandError;
  }
  throw new Error("expected ExecutorCommandError");
}

function expectError(code: ExecutorCommandErrorCode, run: () => unknown): ExecutorCommandError {
  const error = captureError(run);
  expect(error.code).toBe(code);
  expect(error.exitCode).toBe(1);
  return error;
}

describe("executor command materialization", () => {
  it("replaces the manifest once and merges env by declared precedence", () => {
    const root = fixtureRoot();
    const runtimeCwd = join(root, "runtime-cwd");
    const commandCwd = join(root, "command-cwd");
    mkdirSync(runtimeCwd);
    mkdirSync(commandCwd);
    const executionManifest = manifest(root);
    const input = descriptor(root, {
      runtimeCwd,
      commandCwd,
      runtimeEnv: { RUNTIME_ONLY: "runtime", SHARED: "runtime" },
      commandEnv: { COMMAND_ONLY: "command", SHARED: "command" },
    });

    const result = materializeExecutorCommand({
      repoRoot: root,
      descriptor: input,
      commandName: "collect",
      executionManifest,
      ephemeralEnv: { CALLER_ONLY: "caller", SHARED: "caller" },
    });

    expect(result).toEqual({
      argv: ["tool", "collect", "--execution-manifest", realpathSync(executionManifest)],
      cwd: realpathSync(commandCwd),
      env: {
        RUNTIME_ONLY: "runtime",
        COMMAND_ONLY: "command",
        CALLER_ONLY: "caller",
        SHARED: "caller",
      },
    });
    expect(input.commands.collect.argv.at(-1)).toBe("{execution_manifest}");
  });

  it("uses command cwd before runtime cwd before the repository root", () => {
    const root = fixtureRoot();
    const runtimeCwd = join(root, "runtime");
    const commandCwd = join(root, "command");
    mkdirSync(runtimeCwd);
    mkdirSync(commandCwd);

    expect(
      materializeExecutorCommand({
        repoRoot: root,
        descriptor: descriptor(root, { commandName: "setup", runtimeCwd, commandCwd }),
        commandName: "setup",
      }).cwd,
    ).toBe(realpathSync(commandCwd));
    expect(
      materializeExecutorCommand({
        repoRoot: root,
        descriptor: descriptor(root, { commandName: "setup", runtimeCwd }),
        commandName: "setup",
      }).cwd,
    ).toBe(realpathSync(runtimeCwd));
    expect(
      materializeExecutorCommand({
        repoRoot: root,
        descriptor: descriptor(root, { commandName: "setup" }),
        commandName: "setup",
      }).cwd,
    ).toBe(realpathSync(root));
  });

  it("requires one exact manifest placeholder for collect and run", () => {
    const root = fixtureRoot();
    const executionManifest = manifest(root);

    expectError("EXECUTOR_COMMAND_EXECUTION_MANIFEST_REQUIRED", () =>
      materializeExecutorCommand({
        repoRoot: root,
        descriptor: descriptor(root),
        commandName: "collect",
      }),
    );
    expectError("EXECUTOR_COMMAND_PLACEHOLDER_INVALID", () =>
      materializeExecutorCommand({
        repoRoot: root,
        descriptor: descriptor(root, {
          argv: ["tool", "collect", "--execution-manifest", "missing-placeholder"],
        }),
        commandName: "collect",
        executionManifest,
      }),
    );
    expectError("EXECUTOR_COMMAND_PLACEHOLDER_INVALID", () =>
      materializeExecutorCommand({
        repoRoot: root,
        descriptor: descriptor(root, {
          argv: ["tool", "{execution_manifest}", "{execution_manifest}"],
        }),
        commandName: "collect",
        executionManifest,
      }),
    );
  });

  it("forbids manifests and manifest placeholders for setup and doctor", () => {
    const root = fixtureRoot();
    const executionManifest = manifest(root);

    for (const commandName of ["setup", "doctor"] as const) {
      expectError("EXECUTOR_COMMAND_EXECUTION_MANIFEST_FORBIDDEN", () =>
        materializeExecutorCommand({
          repoRoot: root,
          descriptor: descriptor(root, { commandName }),
          commandName,
          executionManifest,
        }),
      );
      expectError("EXECUTOR_COMMAND_PLACEHOLDER_INVALID", () =>
        materializeExecutorCommand({
          repoRoot: root,
          descriptor: descriptor(root, { commandName, argv: ["tool", "{execution_manifest}"] }),
          commandName,
        }),
      );
    }
  });

  it("accepts only absolute existing regular non-symlink manifests inside the real repo", () => {
    const root = fixtureRoot();
    const outside = fixtureRoot();
    const outsideManifest = manifest(outside, "outside.json");
    const validManifest = manifest(root, "valid.json");
    const manifestLink = join(root, "artifacts", "manifest-link.json");
    const manifestDirectory = join(root, "artifacts", "manifest-directory");
    symlinkSync(validManifest, manifestLink);
    mkdirSync(manifestDirectory);

    const cases: Array<{
      path: string;
      code: ExecutorCommandErrorCode;
    }> = [
      { path: "relative.json", code: "EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID" },
      {
        path: join(root, "artifacts", "missing.json"),
        code: "EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID",
      },
      { path: manifestDirectory, code: "EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID" },
      { path: manifestLink, code: "EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID" },
      { path: outsideManifest, code: "EXECUTOR_COMMAND_PATH_OUTSIDE_ROOT" },
    ];

    for (const item of cases) {
      expectError(item.code, () =>
        materializeExecutorCommand({
          repoRoot: root,
          descriptor: descriptor(root),
          commandName: "collect",
          executionManifest: item.path,
        }),
      );
    }
  });

  it("rejects cwd files, missing paths, and symlink escapes", () => {
    const root = fixtureRoot();
    const outside = fixtureRoot();
    const fileCwd = join(root, "not-a-directory");
    const escapedCwd = join(root, "escaped-cwd");
    writeFileSync(fileCwd, "not a directory\n");
    symlinkSync(outside, escapedCwd, "dir");

    for (const cwd of [fileCwd, join(root, "missing"), escapedCwd, outside]) {
      expectError(
        cwd === escapedCwd || cwd === outside
          ? "EXECUTOR_COMMAND_PATH_OUTSIDE_ROOT"
          : "EXECUTOR_COMMAND_CWD_INVALID",
        () =>
          materializeExecutorCommand({
            repoRoot: root,
            descriptor: descriptor(root, { commandName: "setup", commandCwd: cwd }),
            commandName: "setup",
          }),
      );
    }
  });

  it("rejects non-string env values in every layer without echoing them", () => {
    const root = fixtureRoot();
    const secretValue = "should-never-appear-in-errors";
    const badEnv = { SAFE_NAME: 42, SECRET_NAME: secretValue } as unknown as Record<string, string>;

    const cases = [
      {
        input: descriptor(root, { commandName: "setup", runtimeEnv: badEnv }),
        ephemeralEnv: undefined,
      },
      {
        input: descriptor(root, { commandName: "setup", commandEnv: badEnv }),
        ephemeralEnv: undefined,
      },
      {
        input: descriptor(root, { commandName: "setup" }),
        ephemeralEnv: badEnv,
      },
    ];
    for (const item of cases) {
      const error = expectError("EXECUTOR_COMMAND_ENV_INVALID", () =>
        materializeExecutorCommand({
          repoRoot: root,
          descriptor: item.input,
          commandName: "setup",
          ...(item.ephemeralEnv === undefined ? {} : { ephemeralEnv: item.ephemeralEnv }),
        }),
      );
      expect(error.message).not.toContain(secretValue);
    }
  });
});

describe("executor command execution", () => {
  function command(
    root: string,
    argv: readonly string[],
    env: Readonly<Record<string, string>> = {},
  ): MaterializedExecutorCommand {
    return { argv, cwd: realpathSync(root), env };
  }

  async function waitForFile(path: string): Promise<void> {
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      if (existsSync(path)) return;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
    }
    throw new Error(`timed out waiting for fixture file: ${path}`);
  }

  it("passes argv literally without invoking a shell and drops arbitrary caller env", async () => {
    const root = fixtureRoot();
    const scriptPath = join(root, "record-argv.js");
    const outputPath = join(root, "argv.json");
    const shellSideEffect = join(root, "shell-side-effect");
    writeFileSync(
      scriptPath,
      [
        'import { writeFileSync } from "node:fs";',
        "writeFileSync(process.env.OUTPUT_PATH, JSON.stringify({",
        "  argv: process.argv.slice(2),",
        "  base: process.env.BASE_ONLY,",
        "  shared: process.env.SHARED,",
        "}));",
      ].join("\n"),
    );
    const literalArguments = [
      "two words",
      `$(touch ${shellSideEffect})`,
      ";",
      "*.json",
      "value>redirected",
    ];

    const exitCode = await executeExecutorCommand(
      command(root, [process.execPath, scriptPath, ...literalArguments], {
        OUTPUT_PATH: outputPath,
        SHARED: "materialized",
      }),
      { baseEnv: { BASE_ONLY: "base", SHARED: "base" } },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(readFileSync(outputPath, "utf8"))).toEqual({
      argv: literalArguments,
      shared: "materialized",
    });
    expect(existsSync(shellSideEffect)).toBe(false);
  });

  it("inherits only the controlled cross-platform base env allowlist", async () => {
    const root = fixtureRoot();
    const scriptPath = join(root, "record-env.js");
    const outputPath = join(root, "env.json");
    writeFileSync(
      scriptPath,
      [
        'import { writeFileSync } from "node:fs";',
        "writeFileSync(process.env.OUTPUT_PATH, JSON.stringify(process.env));",
      ].join("\n"),
    );

    const exitCode = await executeExecutorCommand(
      command(root, [process.execPath, scriptPath], { OUTPUT_PATH: outputPath }),
      {
        baseEnv: {
          PATH: "/controlled/bin",
          HOME: "/controlled/home",
          USER: "runner",
          LOGNAME: "runner",
          SHELL: "/bin/zsh",
          TMPDIR: "/controlled/tmp/",
          TMP_CUSTOM: "tmp-value",
          LANG: "zh_CN.UTF-8",
          LC_ALL: "zh_CN.UTF-8",
          TERM: "xterm-256color",
          CI: "true",
          SystemRoot: "C:\\Windows",
          WINDIR: "C:\\Windows",
          COMSPEC: "C:\\Windows\\System32\\cmd.exe",
          PATHEXT: ".COM;.EXE",
          USERPROFILE: "C:\\Users\\runner",
          HOMEDRIVE: "C:",
          HOMEPATH: "\\Users\\runner",
          TEMP: "C:\\Temp",
          APPDATA: "C:\\Users\\runner\\AppData\\Roaming",
          LOCALAPPDATA: "C:\\Users\\runner\\AppData\\Local",
          KATA_PRIVATE_TOKEN: "must-not-leak",
          DATABASE_PASSWORD: "must-not-leak",
          AWS_SECRET_ACCESS_KEY: "must-not-leak",
          ARBITRARY_VALUE: "must-not-leak",
        },
      },
    );

    expect(exitCode).toBe(0);
    const childEnv = JSON.parse(readFileSync(outputPath, "utf8")) as Record<string, string>;
    expect(childEnv).toMatchObject({
      PATH: "/controlled/bin",
      HOME: "/controlled/home",
      USER: "runner",
      LOGNAME: "runner",
      SHELL: "/bin/zsh",
      TMPDIR: "/controlled/tmp/",
      TMP_CUSTOM: "tmp-value",
      LANG: "zh_CN.UTF-8",
      LC_ALL: "zh_CN.UTF-8",
      TERM: "xterm-256color",
      CI: "true",
      SystemRoot: "C:\\Windows",
      WINDIR: "C:\\Windows",
      COMSPEC: "C:\\Windows\\System32\\cmd.exe",
      PATHEXT: ".COM;.EXE",
      USERPROFILE: "C:\\Users\\runner",
      HOMEDRIVE: "C:",
      HOMEPATH: "\\Users\\runner",
      TEMP: "C:\\Temp",
      APPDATA: "C:\\Users\\runner\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\runner\\AppData\\Local",
    });
    expect(childEnv).not.toHaveProperty("KATA_PRIVATE_TOKEN");
    expect(childEnv).not.toHaveProperty("DATABASE_PASSWORD");
    expect(childEnv).not.toHaveProperty("AWS_SECRET_ACCESS_KEY");
    expect(childEnv).not.toHaveProperty("ARBITRARY_VALUE");
  });

  it("returns the child exit code without exiting the caller", async () => {
    const root = fixtureRoot();
    const scriptPath = join(root, "fail.js");
    writeFileSync(scriptPath, "process.exit(23);\n");

    await expect(
      executeExecutorCommand(command(root, [process.execPath, scriptPath])),
    ).resolves.toBe(23);
  });

  it("forwards terminal signals and removes its caller listeners", async () => {
    const root = fixtureRoot();
    const scriptPath = join(root, "wait-for-signal.js");
    const readyPath = join(root, "ready");
    const signalPath = join(root, "signal");
    writeFileSync(
      scriptPath,
      [
        'import { writeFileSync } from "node:fs";',
        'process.on("SIGTERM", () => {',
        '  writeFileSync(process.env.SIGNAL_PATH, "SIGTERM");',
        "  process.exit(0);",
        "});",
        'writeFileSync(process.env.READY_PATH, "ready");',
        "setInterval(() => undefined, 1_000);",
      ].join("\n"),
    );
    const listenerCountBefore = process.listenerCount("SIGTERM");

    const result = executeExecutorCommand(
      command(root, [process.execPath, scriptPath], {
        READY_PATH: readyPath,
        SIGNAL_PATH: signalPath,
      }),
    );
    await waitForFile(readyPath);
    expect(process.listenerCount("SIGTERM")).toBe(listenerCountBefore + 1);
    process.emit("SIGTERM");

    await expect(result).resolves.toBe(0);
    expect(readFileSync(signalPath, "utf8")).toBe("SIGTERM");
    expect(process.listenerCount("SIGTERM")).toBe(listenerCountBefore);
  });

  it("throws a stable redacted error when spawn fails", async () => {
    const root = fixtureRoot();
    const secretValue = "spawn-secret-must-stay-redacted";

    try {
      await executeExecutorCommand(
        command(root, [join(root, "missing-executable")], { SECRET_VALUE: secretValue }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutorCommandError);
      expect((error as ExecutorCommandError).code).toBe("EXECUTOR_COMMAND_SPAWN_FAILED");
      expect((error as Error).message).not.toContain(secretValue);
      return;
    }
    throw new Error("expected executeExecutorCommand to reject");
  });
});
