import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const EXECUTOR_SURFACES = ["web-ui", "app-ui", "api"] as const;
const COMMAND_NAMES = ["setup", "doctor", "collect", "run"] as const;
const KEBAB_ID_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EXECUTION_MANIFEST_FLAG = "--execution-manifest";
const EXECUTION_MANIFEST_PLACEHOLDER = "{execution_manifest}";
const PLACEHOLDER_RE = /\{[^{}]*\}/g;

type UnknownRecord = Record<string, unknown>;

export type ExecutorSurface = (typeof EXECUTOR_SURFACES)[number];
export type ExecutorCommandName = (typeof COMMAND_NAMES)[number];

export type ExecutorRegistryErrorCode =
  | "EXECUTOR_AUTOMATION_ROOT_INVALID"
  | "EXECUTOR_DESCRIPTOR_OUTSIDE_ROOT"
  | "EXECUTOR_DESCRIPTOR_READ_FAILED"
  | "EXECUTOR_DESCRIPTOR_INVALID_TOML"
  | "EXECUTOR_DESCRIPTOR_INVALID_FIELD"
  | "EXECUTOR_SCHEMA_VERSION_UNSUPPORTED"
  | "EXECUTOR_ID_INVALID"
  | "EXECUTOR_ID_DIRECTORY_MISMATCH"
  | "EXECUTOR_ID_ENGINE_SURFACE_MISMATCH"
  | "EXECUTOR_SURFACE_UNSUPPORTED"
  | "EXECUTOR_RUNTIME_INVALID"
  | "EXECUTOR_COMMAND_MISSING"
  | "EXECUTOR_COMMAND_UNKNOWN"
  | "EXECUTOR_COMMAND_INVALID"
  | "EXECUTOR_COMMAND_ARGV_REQUIRED"
  | "EXECUTOR_PLACEHOLDER_UNKNOWN"
  | "EXECUTOR_PLACEHOLDER_FORBIDDEN"
  | "EXECUTOR_EXECUTION_MANIFEST_REQUIRED"
  | "EXECUTOR_CAPABILITIES_INVALID"
  | "EXECUTOR_AGENT_INVALID"
  | "EXECUTOR_AGENT_GUIDE_NOT_FOUND"
  | "EXECUTOR_PATH_OUTSIDE_ROOT";

export class ExecutorRegistryError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: ExecutorRegistryErrorCode,
    readonly path: string,
    message: string,
  ) {
    super(`executor registry: ${path}: ${message}`);
    this.name = "ExecutorRegistryError";
  }
}

export interface ExecutorRuntime {
  readonly kind: string;
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export interface ExecutorCommand {
  readonly argv: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
}

export type ExecutorCommands = Readonly<Record<ExecutorCommandName, ExecutorCommand>>;

export interface ExecutorCapabilities {
  readonly requires: readonly string[];
  readonly provides: readonly string[];
}

export interface ExecutorAgent {
  readonly guide: string;
  readonly guidePath: string;
}

export interface ExecutorDescriptor {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly engine: string;
  readonly surface: ExecutorSurface;
  readonly rootDir: string;
  readonly descriptorPath: string;
  readonly runtime: ExecutorRuntime;
  readonly commands: ExecutorCommands;
  readonly capabilities: ExecutorCapabilities;
  readonly agent: ExecutorAgent;
}

function fail(code: ExecutorRegistryErrorCode, descriptorPath: string, message: string): never {
  throw new ExecutorRegistryError(code, descriptorPath, message);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(
  value: unknown,
  code: ExecutorRegistryErrorCode,
  descriptorPath: string,
  field: string,
): UnknownRecord {
  if (!isRecord(value)) {
    fail(code, descriptorPath, `${field} 必须是 TOML table`);
  }
  return value;
}

function assertExactKeys(
  value: UnknownRecord,
  allowedKeys: readonly string[],
  code: ExecutorRegistryErrorCode,
  descriptorPath: string,
  field: string,
): void {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value)
    .filter((key) => !allowed.has(key))
    .sort();
  if (unknown.length > 0) {
    fail(code, descriptorPath, `${field} 包含未知字段: ${unknown.join(", ")}`);
  }
}

function requiredString(
  value: UnknownRecord,
  key: string,
  code: ExecutorRegistryErrorCode,
  descriptorPath: string,
  fieldPrefix = "",
): string {
  const item = value[key];
  const field = fieldPrefix ? `${fieldPrefix}.${key}` : key;
  if (typeof item !== "string" || item.trim() === "" || item !== item.trim()) {
    fail(code, descriptorPath, `${field} 必须是无首尾空白的非空字符串`);
  }
  return item;
}

function optionalString(
  value: UnknownRecord,
  key: string,
  code: ExecutorRegistryErrorCode,
  descriptorPath: string,
  fieldPrefix: string,
): string | undefined {
  if (value[key] === undefined) return undefined;
  return requiredString(value, key, code, descriptorPath, fieldPrefix);
}

function parseStringArray(
  value: unknown,
  code: ExecutorRegistryErrorCode,
  descriptorPath: string,
  field: string,
): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    fail(code, descriptorPath, `${field} 必须是字符串数组`);
  }
  return [...value] as string[];
}

function parseEnv(
  value: unknown,
  code: ExecutorRegistryErrorCode,
  descriptorPath: string,
  field: string,
): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  const input = assertRecord(value, code, descriptorPath, field);
  const env: Record<string, string> = {};
  for (const key of Object.keys(input).sort()) {
    if (!ENV_NAME_RE.test(key) || typeof input[key] !== "string") {
      fail(code, descriptorPath, `${field}.${key} 必须是字符串环境变量`);
    }
    env[key] = input[key];
  }
  return env;
}

function isContained(root: string, target: string): boolean {
  const child = relative(root, target);
  return child === "" || (!isAbsolute(child) && child !== ".." && !child.startsWith(`..${sep}`));
}

function nearestExistingPath(target: string): string {
  let current = target;
  while (true) {
    try {
      lstatSync(current);
      return current;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const parent = dirname(current);
      if (parent === current) return current;
      current = parent;
    }
  }
}

function resolveContainedPath(
  originRoot: string,
  containmentRoot: string,
  realContainmentRoot: string,
  declaredPath: string,
  descriptorPath: string,
  field: string,
): string {
  if (isAbsolute(declaredPath)) {
    fail(
      "EXECUTOR_PATH_OUTSIDE_ROOT",
      descriptorPath,
      `${field} 必须是受控根目录内的相对路径: ${declaredPath}`,
    );
  }

  const target = resolve(originRoot, declaredPath);
  if (!isContained(containmentRoot, target)) {
    fail("EXECUTOR_PATH_OUTSIDE_ROOT", descriptorPath, `${field} 越过受控根目录: ${target}`);
  }

  const existing = nearestExistingPath(target);
  const realExisting = realpathSync(existing);
  const projectedTarget = resolve(realExisting, relative(existing, target));
  if (!isContained(realContainmentRoot, projectedTarget)) {
    fail(
      "EXECUTOR_PATH_OUTSIDE_ROOT",
      descriptorPath,
      `${field} 通过符号链接越过受控根目录: ${target}`,
    );
  }
  return target;
}

function validateIdentity(
  input: UnknownRecord,
  directoryName: string,
  descriptorPath: string,
): Pick<ExecutorDescriptor, "id" | "engine" | "surface"> {
  const id = requiredString(input, "id", "EXECUTOR_DESCRIPTOR_INVALID_FIELD", descriptorPath);
  const engine = requiredString(
    input,
    "engine",
    "EXECUTOR_DESCRIPTOR_INVALID_FIELD",
    descriptorPath,
  );
  const surfaceValue = requiredString(
    input,
    "surface",
    "EXECUTOR_DESCRIPTOR_INVALID_FIELD",
    descriptorPath,
  );

  if (!KEBAB_ID_RE.test(id) || !KEBAB_ID_RE.test(engine)) {
    fail("EXECUTOR_ID_INVALID", descriptorPath, "id 和 engine 必须使用小写 kebab-case");
  }
  if (!EXECUTOR_SURFACES.includes(surfaceValue as ExecutorSurface)) {
    fail(
      "EXECUTOR_SURFACE_UNSUPPORTED",
      descriptorPath,
      `surface=${surfaceValue} 不受支持，仅允许 ${EXECUTOR_SURFACES.join(", ")}`,
    );
  }
  if (id !== directoryName) {
    fail(
      "EXECUTOR_ID_DIRECTORY_MISMATCH",
      descriptorPath,
      `id=${id} 必须等于目录名 ${directoryName}`,
    );
  }
  if (id !== `${engine}-${surfaceValue}`) {
    fail(
      "EXECUTOR_ID_ENGINE_SURFACE_MISMATCH",
      descriptorPath,
      `id=${id} 必须等于 engine-surface: ${engine}-${surfaceValue}`,
    );
  }
  return { id, engine, surface: surfaceValue as ExecutorSurface };
}

function validateRuntime(
  value: unknown,
  executorRoot: string,
  repoRoot: string,
  realRepoRoot: string,
  descriptorPath: string,
): ExecutorRuntime {
  const input = assertRecord(value, "EXECUTOR_RUNTIME_INVALID", descriptorPath, "runtime");
  assertExactKeys(
    input,
    ["kind", "cwd", "env"],
    "EXECUTOR_RUNTIME_INVALID",
    descriptorPath,
    "runtime",
  );
  const kind = requiredString(input, "kind", "EXECUTOR_RUNTIME_INVALID", descriptorPath, "runtime");
  if (!KEBAB_ID_RE.test(kind)) {
    fail("EXECUTOR_RUNTIME_INVALID", descriptorPath, "runtime.kind 必须使用小写 kebab-case");
  }

  const declaredCwd = optionalString(
    input,
    "cwd",
    "EXECUTOR_RUNTIME_INVALID",
    descriptorPath,
    "runtime",
  );
  const cwd = declaredCwd
    ? resolveContainedPath(
        executorRoot,
        repoRoot,
        realRepoRoot,
        declaredCwd,
        descriptorPath,
        "runtime.cwd",
      )
    : undefined;
  const env = parseEnv(input.env, "EXECUTOR_RUNTIME_INVALID", descriptorPath, "runtime.env");
  return {
    kind,
    ...(cwd ? { cwd } : {}),
    ...(env ? { env } : {}),
  };
}

function validateCommand(
  name: ExecutorCommandName,
  value: unknown,
  executorRoot: string,
  repoRoot: string,
  realRepoRoot: string,
  descriptorPath: string,
): ExecutorCommand {
  const field = `commands.${name}`;
  const input = assertRecord(value, "EXECUTOR_COMMAND_INVALID", descriptorPath, field);
  assertExactKeys(input, ["argv", "cwd", "env"], "EXECUTOR_COMMAND_INVALID", descriptorPath, field);
  if (!Array.isArray(input.argv) || input.argv.length === 0) {
    fail(
      "EXECUTOR_COMMAND_ARGV_REQUIRED",
      descriptorPath,
      `${field}.argv 必须是非空 argv 数组，禁止 shell 字符串`,
    );
  }
  const argv = parseStringArray(
    input.argv,
    "EXECUTOR_COMMAND_ARGV_REQUIRED",
    descriptorPath,
    `${field}.argv`,
  );
  const declaredCwd = optionalString(
    input,
    "cwd",
    "EXECUTOR_COMMAND_INVALID",
    descriptorPath,
    field,
  );
  const cwd = declaredCwd
    ? resolveContainedPath(
        executorRoot,
        repoRoot,
        realRepoRoot,
        declaredCwd,
        descriptorPath,
        `${field}.cwd`,
      )
    : undefined;
  const env = parseEnv(input.env, "EXECUTOR_COMMAND_INVALID", descriptorPath, `${field}.env`);
  return {
    argv,
    ...(cwd ? { cwd } : {}),
    ...(env ? { env } : {}),
  };
}

function validatePlaceholders(commands: ExecutorCommands, descriptorPath: string): void {
  const manifestCounts: Record<"collect" | "run", number> = {
    collect: 0,
    run: 0,
  };
  for (const name of COMMAND_NAMES) {
    if (
      name !== "collect" &&
      name !== "run" &&
      commands[name].argv.includes(EXECUTION_MANIFEST_FLAG)
    ) {
      fail(
        "EXECUTOR_PLACEHOLDER_FORBIDDEN",
        descriptorPath,
        `${EXECUTION_MANIFEST_FLAG} 只能用于 commands.collect.argv 和 commands.run.argv`,
      );
    }
    for (const argument of commands[name].argv) {
      const placeholders = argument.match(PLACEHOLDER_RE) ?? [];
      const remainder = argument.replace(PLACEHOLDER_RE, "");
      if (remainder.includes("{") || remainder.includes("}")) {
        fail(
          "EXECUTOR_PLACEHOLDER_UNKNOWN",
          descriptorPath,
          `commands.${name}.argv 包含格式无效的占位符: ${argument}`,
        );
      }
      for (const placeholder of placeholders) {
        if (placeholder !== EXECUTION_MANIFEST_PLACEHOLDER) {
          fail(
            "EXECUTOR_PLACEHOLDER_UNKNOWN",
            descriptorPath,
            `commands.${name}.argv 包含未知占位符: ${placeholder}`,
          );
        }
        if (name !== "collect" && name !== "run") {
          fail(
            "EXECUTOR_PLACEHOLDER_FORBIDDEN",
            descriptorPath,
            `${EXECUTION_MANIFEST_PLACEHOLDER} 只能用于 commands.collect.argv 和 commands.run.argv`,
          );
        }
        manifestCounts[name] += 1;
      }
    }
  }
  for (const name of ["collect", "run"] as const) {
    const argv = commands[name].argv;
    const flagCount = argv.filter((argument) => argument === EXECUTION_MANIFEST_FLAG).length;
    const pairCount = argv.reduce(
      (count, argument, index) =>
        argument === EXECUTION_MANIFEST_FLAG && argv[index + 1] === EXECUTION_MANIFEST_PLACEHOLDER
          ? count + 1
          : count,
      0,
    );
    if (manifestCounts[name] !== 1 || flagCount !== 1 || pairCount !== 1) {
      fail(
        "EXECUTOR_EXECUTION_MANIFEST_REQUIRED",
        descriptorPath,
        `commands.${name}.argv 必须恰好包含一次 ${EXECUTION_MANIFEST_FLAG} ${EXECUTION_MANIFEST_PLACEHOLDER}`,
      );
    }
  }
}

function validateCommands(
  value: unknown,
  executorRoot: string,
  repoRoot: string,
  realRepoRoot: string,
  descriptorPath: string,
): ExecutorCommands {
  const input = assertRecord(value, "EXECUTOR_COMMAND_MISSING", descriptorPath, "commands");
  const unknown = Object.keys(input).filter(
    (key) => !COMMAND_NAMES.includes(key as ExecutorCommandName),
  );
  if (unknown.length > 0) {
    fail(
      "EXECUTOR_COMMAND_UNKNOWN",
      descriptorPath,
      `commands 包含未知 lifecycle: ${unknown.sort().join(", ")}`,
    );
  }
  for (const name of COMMAND_NAMES) {
    if (input[name] === undefined) {
      fail("EXECUTOR_COMMAND_MISSING", descriptorPath, `缺少 commands.${name}`);
    }
  }

  const commands: ExecutorCommands = {
    setup: validateCommand(
      "setup",
      input.setup,
      executorRoot,
      repoRoot,
      realRepoRoot,
      descriptorPath,
    ),
    doctor: validateCommand(
      "doctor",
      input.doctor,
      executorRoot,
      repoRoot,
      realRepoRoot,
      descriptorPath,
    ),
    collect: validateCommand(
      "collect",
      input.collect,
      executorRoot,
      repoRoot,
      realRepoRoot,
      descriptorPath,
    ),
    run: validateCommand("run", input.run, executorRoot, repoRoot, realRepoRoot, descriptorPath),
  };
  validatePlaceholders(commands, descriptorPath);
  return commands;
}

function validateCapabilities(value: unknown, descriptorPath: string): ExecutorCapabilities {
  const input = assertRecord(
    value,
    "EXECUTOR_CAPABILITIES_INVALID",
    descriptorPath,
    "capabilities",
  );
  assertExactKeys(
    input,
    ["requires", "provides"],
    "EXECUTOR_CAPABILITIES_INVALID",
    descriptorPath,
    "capabilities",
  );
  return {
    requires: parseStringArray(
      input.requires,
      "EXECUTOR_CAPABILITIES_INVALID",
      descriptorPath,
      "capabilities.requires",
    ),
    provides: parseStringArray(
      input.provides,
      "EXECUTOR_CAPABILITIES_INVALID",
      descriptorPath,
      "capabilities.provides",
    ),
  };
}

function validateAgent(
  value: unknown,
  executorRoot: string,
  realExecutorRoot: string,
  descriptorPath: string,
): ExecutorAgent {
  const input = assertRecord(value, "EXECUTOR_AGENT_INVALID", descriptorPath, "agent");
  assertExactKeys(input, ["guide"], "EXECUTOR_AGENT_INVALID", descriptorPath, "agent");
  const guide = requiredString(input, "guide", "EXECUTOR_AGENT_INVALID", descriptorPath, "agent");
  const guidePath = resolveContainedPath(
    executorRoot,
    executorRoot,
    realExecutorRoot,
    guide,
    descriptorPath,
    "agent.guide",
  );
  if (!existsSync(guidePath)) {
    fail("EXECUTOR_AGENT_GUIDE_NOT_FOUND", descriptorPath, `agent.guide 不存在: ${guidePath}`);
  }
  if (!statSync(guidePath).isFile()) {
    fail("EXECUTOR_AGENT_INVALID", descriptorPath, `agent.guide 不是文件: ${guidePath}`);
  }
  return { guide, guidePath };
}

function parseDescriptor(
  repoRoot: string,
  realRepoRoot: string,
  executorRoot: string,
  realExecutorRoot: string,
  descriptorPath: string,
): ExecutorDescriptor {
  let source: string;
  try {
    source = readFileSync(descriptorPath, "utf8");
  } catch (error) {
    fail(
      "EXECUTOR_DESCRIPTOR_READ_FAILED",
      descriptorPath,
      `读取失败: ${(error as Error).message}`,
    );
  }

  let document: unknown;
  try {
    document = Bun.TOML.parse(source);
  } catch (error) {
    fail(
      "EXECUTOR_DESCRIPTOR_INVALID_TOML",
      descriptorPath,
      `TOML 解析失败: ${(error as Error).message}`,
    );
  }

  const input = assertRecord(
    document,
    "EXECUTOR_DESCRIPTOR_INVALID_FIELD",
    descriptorPath,
    "descriptor",
  );
  assertExactKeys(
    input,
    ["schema_version", "id", "engine", "surface", "runtime", "commands", "capabilities", "agent"],
    "EXECUTOR_DESCRIPTOR_INVALID_FIELD",
    descriptorPath,
    "descriptor",
  );
  if (input.schema_version !== 1) {
    fail(
      "EXECUTOR_SCHEMA_VERSION_UNSUPPORTED",
      descriptorPath,
      `schema_version 必须为 1，当前 ${String(input.schema_version)}`,
    );
  }

  const identity = validateIdentity(input, basename(executorRoot), descriptorPath);
  const runtime = validateRuntime(
    input.runtime,
    executorRoot,
    repoRoot,
    realRepoRoot,
    descriptorPath,
  );
  const commands = validateCommands(
    input.commands,
    executorRoot,
    repoRoot,
    realRepoRoot,
    descriptorPath,
  );
  const capabilities = validateCapabilities(input.capabilities, descriptorPath);
  const agent = validateAgent(input.agent, executorRoot, realExecutorRoot, descriptorPath);

  return {
    schemaVersion: 1,
    ...identity,
    rootDir: executorRoot,
    descriptorPath,
    runtime,
    commands,
    capabilities,
    agent,
  };
}

/** Discover and validate self-described automation executors below automation/*. */
export function discoverExecutors(repoRoot: string): ExecutorDescriptor[] {
  const root = resolve(repoRoot);
  const automationRoot = join(root, "automation");
  if (!existsSync(automationRoot)) return [];

  let realRoot: string;
  let realAutomationRoot: string;
  try {
    if (!statSync(automationRoot).isDirectory()) {
      fail("EXECUTOR_AUTOMATION_ROOT_INVALID", automationRoot, "automation 必须是目录");
    }
    realRoot = realpathSync(root);
    realAutomationRoot = realpathSync(automationRoot);
  } catch (error) {
    if (error instanceof ExecutorRegistryError) throw error;
    fail(
      "EXECUTOR_AUTOMATION_ROOT_INVALID",
      automationRoot,
      `无法读取 automation 目录: ${(error as Error).message}`,
    );
  }
  if (!isContained(realRoot, realAutomationRoot)) {
    fail(
      "EXECUTOR_AUTOMATION_ROOT_INVALID",
      automationRoot,
      "automation 目录通过符号链接越过仓库根目录",
    );
  }

  const descriptors: ExecutorDescriptor[] = [];
  const entries = readdirSync(automationRoot, { withFileTypes: true }).sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  for (const entry of entries) {
    const executorRoot = join(automationRoot, entry.name);
    const descriptorPath = join(executorRoot, "executor.toml");
    if (!entry.isDirectory()) {
      if (entry.isSymbolicLink() && existsSync(descriptorPath)) {
        fail("EXECUTOR_DESCRIPTOR_OUTSIDE_ROOT", descriptorPath, "executor 目录不得是符号链接");
      }
      continue;
    }
    try {
      lstatSync(descriptorPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      fail(
        "EXECUTOR_DESCRIPTOR_READ_FAILED",
        descriptorPath,
        `无法读取 descriptor 路径: ${(error as Error).message}`,
      );
    }

    let realExecutorRoot: string;
    let realDescriptorPath: string;
    try {
      realExecutorRoot = realpathSync(executorRoot);
      realDescriptorPath = realpathSync(descriptorPath);
    } catch (error) {
      fail(
        "EXECUTOR_DESCRIPTOR_READ_FAILED",
        descriptorPath,
        `无法解析 descriptor 路径: ${(error as Error).message}`,
      );
    }
    if (
      !isContained(realAutomationRoot, realExecutorRoot) ||
      !isContained(realExecutorRoot, realDescriptorPath)
    ) {
      fail(
        "EXECUTOR_DESCRIPTOR_OUTSIDE_ROOT",
        descriptorPath,
        "executor.toml 通过符号链接越过 executor 根目录",
      );
    }
    if (!statSync(realDescriptorPath).isFile()) {
      fail("EXECUTOR_DESCRIPTOR_READ_FAILED", descriptorPath, "executor.toml 不是文件");
    }
    descriptors.push(
      parseDescriptor(root, realRoot, executorRoot, realExecutorRoot, descriptorPath),
    );
  }
  return descriptors.sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}
