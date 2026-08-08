import { type SpawnOptions, spawn } from "node:child_process";
import { lstatSync, realpathSync, statSync } from "node:fs";
import { constants as osConstants } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ExecutorCommandName, ExecutorDescriptor } from "./executor-registry.ts";

const EXECUTION_MANIFEST_PLACEHOLDER = "{execution_manifest}";
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FORWARDED_SIGNALS: readonly NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP"];

/** Stable failure codes for executor command materialization and execution. */
export type ExecutorCommandErrorCode =
  | "EXECUTOR_COMMAND_INVALID"
  | "EXECUTOR_COMMAND_REPO_ROOT_INVALID"
  | "EXECUTOR_COMMAND_CWD_INVALID"
  | "EXECUTOR_COMMAND_PATH_OUTSIDE_ROOT"
  | "EXECUTOR_COMMAND_ENV_INVALID"
  | "EXECUTOR_COMMAND_EXECUTION_MANIFEST_REQUIRED"
  | "EXECUTOR_COMMAND_EXECUTION_MANIFEST_FORBIDDEN"
  | "EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID"
  | "EXECUTOR_COMMAND_PLACEHOLDER_INVALID"
  | "EXECUTOR_COMMAND_SPAWN_FAILED";

/** A redacted, stable executor command failure suitable for CLI error handling. */
export class ExecutorCommandError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: ExecutorCommandErrorCode,
    message: string,
  ) {
    super(`executor command: ${message}`);
    this.name = "ExecutorCommandError";
  }
}

/** Inputs used to materialize one lifecycle command from an executor descriptor. */
export interface MaterializeExecutorCommandOptions {
  readonly repoRoot: string;
  readonly descriptor: ExecutorDescriptor;
  readonly commandName: ExecutorCommandName;
  readonly executionManifest?: string;
  readonly ephemeralEnv?: Readonly<Record<string, string>>;
}

/** A shell-free command whose paths and executor-specific environment are validated. */
export interface MaterializedExecutorCommand {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}

/** Caller process inputs inherited by a materialized executor command. */
export interface ExecuteExecutorCommandOptions {
  readonly baseEnv?: NodeJS.ProcessEnv;
  readonly stdio?: SpawnOptions["stdio"];
}

function fail(code: ExecutorCommandErrorCode, message: string): never {
  throw new ExecutorCommandError(code, message);
}

function isContained(root: string, target: string): boolean {
  const child = relative(root, target);
  return child === "" || (!isAbsolute(child) && child !== ".." && !child.startsWith(`..${sep}`));
}

function resolveRepoRoot(repoRoot: string): { lexical: string; real: string } {
  if (typeof repoRoot !== "string" || repoRoot.trim() === "") {
    fail("EXECUTOR_COMMAND_REPO_ROOT_INVALID", "repo root 必须是非空路径");
  }
  const lexical = resolve(repoRoot);
  try {
    const real = realpathSync(lexical);
    if (!statSync(real).isDirectory()) {
      fail("EXECUTOR_COMMAND_REPO_ROOT_INVALID", "repo root 不是目录");
    }
    return { lexical, real };
  } catch (error) {
    if (error instanceof ExecutorCommandError) throw error;
    fail("EXECUTOR_COMMAND_REPO_ROOT_INVALID", "repo root 不存在或不可访问");
  }
}

function resolveCommandCwd(
  descriptor: ExecutorDescriptor,
  commandName: ExecutorCommandName,
  lexicalRepoRoot: string,
  realRepoRoot: string,
): string {
  const command = descriptor.commands[commandName];
  if (command === undefined) {
    fail("EXECUTOR_COMMAND_INVALID", `commands.${commandName} 不存在`);
  }
  const declaredCwd = command.cwd ?? descriptor.runtime.cwd ?? lexicalRepoRoot;
  if (typeof declaredCwd !== "string" || declaredCwd.trim() === "") {
    fail("EXECUTOR_COMMAND_CWD_INVALID", `commands.${commandName} 的 cwd 无效`);
  }
  const candidate = isAbsolute(declaredCwd) ? declaredCwd : resolve(lexicalRepoRoot, declaredCwd);

  let realCwd: string;
  try {
    realCwd = realpathSync(candidate);
    if (!statSync(realCwd).isDirectory()) {
      fail("EXECUTOR_COMMAND_CWD_INVALID", `commands.${commandName} 的 cwd 不是目录`);
    }
  } catch (error) {
    if (error instanceof ExecutorCommandError) throw error;
    fail("EXECUTOR_COMMAND_CWD_INVALID", `commands.${commandName} 的 cwd 不存在或不可访问`);
  }
  if (!isContained(realRepoRoot, realCwd)) {
    fail("EXECUTOR_COMMAND_PATH_OUTSIDE_ROOT", `commands.${commandName} 的 cwd 越过 repo root`);
  }
  return realCwd;
}

function resolveExecutionManifest(executionManifest: string, realRepoRoot: string): string {
  if (typeof executionManifest !== "string" || !isAbsolute(executionManifest)) {
    fail("EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID", "execution manifest 必须是绝对路径");
  }

  let realManifest: string;
  try {
    const entry = lstatSync(executionManifest);
    if (entry.isSymbolicLink() || !entry.isFile()) {
      fail(
        "EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID",
        "execution manifest 必须是普通非符号链接文件",
      );
    }
    realManifest = realpathSync(executionManifest);
    if (!statSync(realManifest).isFile()) {
      fail("EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID", "execution manifest 必须是普通文件");
    }
  } catch (error) {
    if (error instanceof ExecutorCommandError) throw error;
    fail("EXECUTOR_COMMAND_EXECUTION_MANIFEST_INVALID", "execution manifest 不存在或不可访问");
  }
  if (!isContained(realRepoRoot, realManifest)) {
    fail("EXECUTOR_COMMAND_PATH_OUTSIDE_ROOT", "execution manifest 越过 repo root");
  }
  return realManifest;
}

function validatedArgv(
  descriptor: ExecutorDescriptor,
  commandName: ExecutorCommandName,
): readonly string[] {
  const argv = descriptor.commands[commandName]?.argv;
  if (
    !Array.isArray(argv) ||
    argv.length === 0 ||
    argv.some((argument) => typeof argument !== "string" || argument.length === 0)
  ) {
    fail("EXECUTOR_COMMAND_INVALID", `commands.${commandName}.argv 必须是非空字符串数组`);
  }
  return argv;
}

function materializeArgv(
  argv: readonly string[],
  commandName: ExecutorCommandName,
  executionManifest: string | undefined,
  realRepoRoot: string,
): readonly string[] {
  const placeholderArguments = argv.filter(
    (argument) => argument === EXECUTION_MANIFEST_PLACEHOLDER,
  ).length;
  const hasEmbeddedPlaceholder = argv.some(
    (argument) =>
      argument !== EXECUTION_MANIFEST_PLACEHOLDER &&
      argument.includes(EXECUTION_MANIFEST_PLACEHOLDER),
  );

  if (commandName === "setup" || commandName === "doctor") {
    if (executionManifest !== undefined) {
      fail(
        "EXECUTOR_COMMAND_EXECUTION_MANIFEST_FORBIDDEN",
        `commands.${commandName} 禁止接收 execution manifest`,
      );
    }
    if (placeholderArguments !== 0 || hasEmbeddedPlaceholder) {
      fail(
        "EXECUTOR_COMMAND_PLACEHOLDER_INVALID",
        `commands.${commandName}.argv 禁止 execution manifest 占位符`,
      );
    }
    return [...argv];
  }

  if (executionManifest === undefined) {
    fail(
      "EXECUTOR_COMMAND_EXECUTION_MANIFEST_REQUIRED",
      `commands.${commandName} 必须接收 execution manifest`,
    );
  }
  if (placeholderArguments !== 1 || hasEmbeddedPlaceholder) {
    fail(
      "EXECUTOR_COMMAND_PLACEHOLDER_INVALID",
      `commands.${commandName}.argv 必须恰好包含一个独立 execution manifest 占位符`,
    );
  }
  const realManifest = resolveExecutionManifest(executionManifest, realRepoRoot);
  return argv.map((argument) =>
    argument === EXECUTION_MANIFEST_PLACEHOLDER ? realManifest : argument,
  );
}

function validatedEnv(
  env: Readonly<Record<string, string>> | undefined,
  field: string,
): Readonly<Record<string, string>> {
  if (env === undefined) return {};
  if (typeof env !== "object" || env === null || Array.isArray(env)) {
    fail("EXECUTOR_COMMAND_ENV_INVALID", `${field} 必须是字符串环境变量表`);
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (!ENV_NAME_RE.test(key) || typeof value !== "string") {
      fail("EXECUTOR_COMMAND_ENV_INVALID", `${field}.${key} 必须是字符串环境变量`);
    }
    result[key] = value;
  }
  return result;
}

function inheritedEnv(baseEnv: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value === undefined) continue;
    if (typeof value !== "string") {
      fail("EXECUTOR_COMMAND_ENV_INVALID", `caller env.${key} 必须是字符串环境变量`);
    }
    result[key] = value;
  }
  return result;
}

/** Materialize a validated lifecycle command without mutating the descriptor or filesystem. */
export function materializeExecutorCommand(
  options: MaterializeExecutorCommandOptions,
): MaterializedExecutorCommand {
  const { lexical: lexicalRepoRoot, real: realRepoRoot } = resolveRepoRoot(options.repoRoot);
  const command = options.descriptor.commands[options.commandName];
  if (command === undefined) {
    fail("EXECUTOR_COMMAND_INVALID", `commands.${options.commandName} 不存在`);
  }
  const argv = materializeArgv(
    validatedArgv(options.descriptor, options.commandName),
    options.commandName,
    options.executionManifest,
    realRepoRoot,
  );
  const cwd = resolveCommandCwd(
    options.descriptor,
    options.commandName,
    lexicalRepoRoot,
    realRepoRoot,
  );
  const env = {
    ...validatedEnv(options.descriptor.runtime.env, "runtime.env"),
    ...validatedEnv(command.env, `commands.${options.commandName}.env`),
    ...validatedEnv(options.ephemeralEnv, "caller ephemeral env"),
  };
  return { argv, cwd, env };
}

/** Execute a materialized command directly, forward terminal signals, and return its exit code. */
export async function executeExecutorCommand(
  command: MaterializedExecutorCommand,
  options: ExecuteExecutorCommandOptions = {},
): Promise<number> {
  if (
    !Array.isArray(command.argv) ||
    command.argv.length === 0 ||
    command.argv.some((argument) => typeof argument !== "string" || argument.length === 0)
  ) {
    fail("EXECUTOR_COMMAND_INVALID", "materialized argv 必须是非空字符串数组");
  }
  if (typeof command.cwd !== "string" || command.cwd.trim() === "") {
    fail("EXECUTOR_COMMAND_CWD_INVALID", "materialized cwd 无效");
  }
  try {
    if (!statSync(command.cwd).isDirectory()) {
      fail("EXECUTOR_COMMAND_CWD_INVALID", "materialized cwd 不是目录");
    }
  } catch (error) {
    if (error instanceof ExecutorCommandError) throw error;
    fail("EXECUTOR_COMMAND_CWD_INVALID", "materialized cwd 不存在或不可访问");
  }

  const env = {
    ...inheritedEnv(options.baseEnv ?? process.env),
    ...validatedEnv(command.env, "materialized env"),
  };
  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(command.argv[0], command.argv.slice(1), {
      cwd: command.cwd,
      env,
      shell: false,
      stdio: options.stdio ?? "inherit",
    });
  } catch {
    fail("EXECUTOR_COMMAND_SPAWN_FAILED", "无法启动 executor 子进程");
  }

  // 父进程收到终端信号时只转发，不在库函数中退出当前进程。
  const handlers = new Map<NodeJS.Signals, () => void>();
  for (const signal of FORWARDED_SIGNALS) {
    const handler = (): void => {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
    };
    handlers.set(signal, handler);
    process.on(signal, handler);
  }

  try {
    return await new Promise<number>((resolveExit, reject) => {
      child.once("error", () =>
        reject(
          new ExecutorCommandError("EXECUTOR_COMMAND_SPAWN_FAILED", "无法启动 executor 子进程"),
        ),
      );
      child.once("exit", (code, signal) => {
        const signalExitCode = signal ? 128 + (osConstants.signals[signal] ?? 1) : 1;
        resolveExit(code ?? signalExitCode);
      });
    });
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}
