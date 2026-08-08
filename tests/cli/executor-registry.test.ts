import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  discoverExecutors,
  ExecutorRegistryError,
  type ExecutorRegistryErrorCode,
} from "../../cli/lib/automation/executor-registry.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "executor-registry-"));
  roots.push(root);
  mkdirSync(join(root, "automation"), { recursive: true });
  return root;
}

function descriptor(
  options: {
    id?: string;
    engine?: string;
    surface?: string;
    runtime?: string;
    commands?: string;
    capabilities?: string;
    agent?: string;
  } = {},
): string {
  const id = options.id ?? "playwright-web-ui";
  const engine = options.engine ?? "playwright";
  const surface = options.surface ?? "web-ui";
  return `schema_version = 1
id = "${id}"
engine = "${engine}"
surface = "${surface}"

${
  options.runtime ??
  `[runtime]
kind = "python"
cwd = "../.."

[runtime.env]
PYTHONUNBUFFERED = "1"`
}

${
  options.commands ??
  `[commands.setup]
argv = ["uv", "sync", "--locked"]

[commands.doctor]
argv = ["uv", "run", "python", "-m", "playwright_web_ui.doctor"]

[commands.collect]
argv = ["uv", "run", "pytest", "--collect-only", "--execution-manifest", "{execution_manifest}"]

[commands.run]
argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]
cwd = "../.."

[commands.run.env]
AUTOMATION_EXECUTOR_ID = "${id}"`
}

${
  options.capabilities ??
  `[capabilities]
requires = ["python-3.14", "browser"]
provides = ["collect", "run", "allure"]`
}

${options.agent ?? `[agent]\nguide = "AGENT.md"`}
`;
}

function writeExecutor(root: string, id: string, source = descriptor({ id })): string {
  const executorRoot = join(root, "automation", id);
  mkdirSync(executorRoot, { recursive: true });
  writeFileSync(join(executorRoot, "executor.toml"), source);
  writeFileSync(join(executorRoot, "AGENT.md"), `# ${id}\n`);
  return executorRoot;
}

function captureError(run: () => unknown): ExecutorRegistryError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ExecutorRegistryError);
    return error as ExecutorRegistryError;
  }
  throw new Error("expected ExecutorRegistryError");
}

function expectError(
  root: string,
  code: ExecutorRegistryErrorCode,
  expectedPath: string,
): ExecutorRegistryError {
  const error = captureError(() => discoverExecutors(root));
  expect(error.code).toBe(code);
  expect(error.path).toBe(expectedPath);
  expect(error.message).toContain(expectedPath);
  return error;
}

describe("executor registry discovery", () => {
  it("discovers valid descriptors in stable id order and resolves safe paths", () => {
    const root = fixtureRoot();
    const zetaRoot = writeExecutor(
      root,
      "zeta-api",
      descriptor({
        id: "zeta-api",
        engine: "zeta",
        surface: "api",
        runtime: `[runtime]\nkind = "node"\ncwd = "../.."`,
      }),
    );
    const alphaRoot = writeExecutor(
      root,
      "alpha-web-ui",
      descriptor({ id: "alpha-web-ui", engine: "alpha", surface: "web-ui" }),
    );
    mkdirSync(join(root, "automation", "not-an-executor"));

    const executors = discoverExecutors(root);

    expect(executors.map(({ id }) => id)).toEqual(["alpha-web-ui", "zeta-api"]);
    expect(executors[0]).toMatchObject({
      id: "alpha-web-ui",
      engine: "alpha",
      surface: "web-ui",
      rootDir: alphaRoot,
      descriptorPath: join(alphaRoot, "executor.toml"),
      runtime: {
        kind: "python",
        cwd: root,
        env: { PYTHONUNBUFFERED: "1" },
      },
      commands: {
        setup: { argv: ["uv", "sync", "--locked"] },
        run: {
          argv: ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"],
          cwd: root,
          env: { AUTOMATION_EXECUTOR_ID: "alpha-web-ui" },
        },
      },
      capabilities: {
        requires: ["python-3.14", "browser"],
        provides: ["collect", "run", "allure"],
      },
      agent: {
        guide: "AGENT.md",
        guidePath: join(alphaRoot, "AGENT.md"),
      },
    });
    expect(executors[1]?.rootDir).toBe(zetaRoot);
    expect(executors[1]?.runtime).toEqual({ kind: "node", cwd: root });
  });

  it("returns an empty list when the automation directory is absent", () => {
    const root = fixtureRoot();
    rmSync(join(root, "automation"), { recursive: true });
    expect(discoverExecutors(root)).toEqual([]);
  });

  it("rejects malformed TOML with an explicit descriptor path", () => {
    const root = fixtureRoot();
    const executorRoot = writeExecutor(root, "alpha-web-ui", "schema_version = [");
    expectError(root, "EXECUTOR_DESCRIPTOR_INVALID_TOML", join(executorRoot, "executor.toml"));
  });

  it("requires schema version 1", () => {
    const root = fixtureRoot();
    const executorRoot = writeExecutor(
      root,
      "alpha-web-ui",
      descriptor({ id: "alpha-web-ui", engine: "alpha" }).replace(
        "schema_version = 1",
        "schema_version = 2",
      ),
    );
    expectError(root, "EXECUTOR_SCHEMA_VERSION_UNSUPPORTED", join(executorRoot, "executor.toml"));
  });

  it("requires id to equal its executor directory", () => {
    const root = fixtureRoot();
    const executorRoot = writeExecutor(
      root,
      "wrong-web-ui",
      descriptor({ id: "alpha-web-ui", engine: "alpha" }),
    );
    expectError(root, "EXECUTOR_ID_DIRECTORY_MISMATCH", join(executorRoot, "executor.toml"));
  });

  it("requires id to equal engine-surface and accepts only declared surfaces", () => {
    const mismatchRoot = fixtureRoot();
    const mismatchExecutor = writeExecutor(
      mismatchRoot,
      "alpha-web-ui",
      descriptor({ id: "alpha-web-ui", engine: "beta" }),
    );
    expectError(
      mismatchRoot,
      "EXECUTOR_ID_ENGINE_SURFACE_MISMATCH",
      join(mismatchExecutor, "executor.toml"),
    );

    const surfaceRoot = fixtureRoot();
    const surfaceExecutor = writeExecutor(
      surfaceRoot,
      "alpha-desktop",
      descriptor({ id: "alpha-desktop", engine: "alpha", surface: "desktop" }),
    );
    expectError(
      surfaceRoot,
      "EXECUTOR_SURFACE_UNSUPPORTED",
      join(surfaceExecutor, "executor.toml"),
    );
  });

  it("accepts kebab runtime kinds and rejects whitespace or invalid runtime/env fields", () => {
    const kindRoot = fixtureRoot();
    const kindExecutor = writeExecutor(
      kindRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        runtime: `[runtime]\nkind = " node "`,
      }),
    );
    expectError(kindRoot, "EXECUTOR_RUNTIME_INVALID", join(kindExecutor, "executor.toml"));

    const invalidKindRoot = fixtureRoot();
    const invalidKindExecutor = writeExecutor(
      invalidKindRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        runtime: `[runtime]\nkind = "node js"`,
      }),
    );
    expectError(
      invalidKindRoot,
      "EXECUTOR_RUNTIME_INVALID",
      join(invalidKindExecutor, "executor.toml"),
    );

    const envRoot = fixtureRoot();
    const envExecutor = writeExecutor(
      envRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        runtime: `[runtime]\nkind = "python"\n\n[runtime.env]\nWORKERS = 2`,
      }),
    );
    expectError(envRoot, "EXECUTOR_RUNTIME_INVALID", join(envExecutor, "executor.toml"));
  });

  it("requires all lifecycle commands to use non-empty argv arrays", () => {
    const missingRoot = fixtureRoot();
    const missingExecutor = writeExecutor(
      missingRoot,
      "alpha-web-ui",
      descriptor({
        id: "alpha-web-ui",
        engine: "alpha",
        commands: `[commands.setup]
argv = ["uv", "sync"]

[commands.collect]
argv = ["uv", "run", "pytest", "--collect-only"]

[commands.run]
argv = ["uv", "run", "pytest", "{execution_manifest}"]`,
      }),
    );
    expectError(missingRoot, "EXECUTOR_COMMAND_MISSING", join(missingExecutor, "executor.toml"));

    const shellRoot = fixtureRoot();
    const shellExecutor = writeExecutor(
      shellRoot,
      "alpha-web-ui",
      descriptor({
        id: "alpha-web-ui",
        engine: "alpha",
        commands: `[commands.setup]
argv = ["uv", "sync"]

[commands.doctor]
argv = ["uv", "run", "python", "-m", "doctor"]

[commands.collect]
argv = ["uv", "run", "pytest", "--collect-only"]

[commands.run]
argv = "uv run pytest {execution_manifest}"`,
      }),
    );
    expectError(shellRoot, "EXECUTOR_COMMAND_ARGV_REQUIRED", join(shellExecutor, "executor.toml"));
  });

  it("requires execution_manifest once in collect and run and forbids other placeholders", () => {
    const source = descriptor();
    const cases: Array<{ commands: string; code: ExecutorRegistryErrorCode }> = [
      {
        commands: source.replace(
          'argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]',
          'argv = ["uv", "run", "pytest", "--execution-manifest", "manifest.json"]',
        ),
        code: "EXECUTOR_EXECUTION_MANIFEST_REQUIRED",
      },
      {
        commands: source.replace(
          'argv = ["uv", "run", "pytest", "--collect-only", "--execution-manifest", "{execution_manifest}"]',
          'argv = ["uv", "run", "pytest", "--collect-only"]',
        ),
        code: "EXECUTOR_EXECUTION_MANIFEST_REQUIRED",
      },
      {
        commands: source.replace(
          'argv = ["uv", "sync", "--locked"]',
          'argv = ["uv", "sync", "{execution_manifest}"]',
        ),
        code: "EXECUTOR_PLACEHOLDER_FORBIDDEN",
      },
      {
        commands: source.replace(
          'argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]',
          'argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}", "{execution_manifest}"]',
        ),
        code: "EXECUTOR_EXECUTION_MANIFEST_REQUIRED",
      },
      {
        commands: source.replace(
          'argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]',
          'argv = ["uv", "run", "pytest", "--execution-manifest", "{unknown_manifest}"]',
        ),
        code: "EXECUTOR_PLACEHOLDER_UNKNOWN",
      },
      {
        commands: source.replace(
          'argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]',
          'argv = ["uv", "run", "pytest", "{execution_manifest}"]',
        ),
        code: "EXECUTOR_EXECUTION_MANIFEST_REQUIRED",
      },
    ];

    for (const fixture of cases) {
      const root = fixtureRoot();
      const executorRoot = writeExecutor(root, "playwright-web-ui", fixture.commands);
      expectError(root, fixture.code, join(executorRoot, "executor.toml"));
    }
  });

  it("validates capabilities and the structured agent guide", () => {
    const capabilityRoot = fixtureRoot();
    const capabilityExecutor = writeExecutor(
      capabilityRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        capabilities: `[capabilities]\nrequires = "python"\nprovides = []`,
      }),
    );
    expectError(
      capabilityRoot,
      "EXECUTOR_CAPABILITIES_INVALID",
      join(capabilityExecutor, "executor.toml"),
    );

    const agentRoot = fixtureRoot();
    const agentExecutor = writeExecutor(
      agentRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        agent: `[agent]\nguide = 1`,
      }),
    );
    expectError(agentRoot, "EXECUTOR_AGENT_INVALID", join(agentExecutor, "executor.toml"));
  });

  it("keeps guides inside the executor and cwd paths inside the repository", () => {
    const guideRoot = fixtureRoot();
    writeFileSync(join(guideRoot, "outside.md"), "outside\n");
    const guideExecutor = writeExecutor(
      guideRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        agent: `[agent]\nguide = "../../outside.md"`,
      }),
    );
    expectError(guideRoot, "EXECUTOR_PATH_OUTSIDE_ROOT", join(guideExecutor, "executor.toml"));

    const cwdRoot = fixtureRoot();
    const cwdExecutor = writeExecutor(
      cwdRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        runtime: `[runtime]\nkind = "python"\ncwd = "../../.."`,
      }),
    );
    expectError(cwdRoot, "EXECUTOR_PATH_OUTSIDE_ROOT", join(cwdExecutor, "executor.toml"));

    const absoluteRoot = fixtureRoot();
    const absoluteExecutor = writeExecutor(
      absoluteRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        runtime: `[runtime]\nkind = "python"\ncwd = "${absoluteRoot}"`,
      }),
    );
    expectError(
      absoluteRoot,
      "EXECUTOR_PATH_OUTSIDE_ROOT",
      join(absoluteExecutor, "executor.toml"),
    );

    const commandRoot = fixtureRoot();
    const commandSource = descriptor({ id: "alpha-api", engine: "alpha", surface: "api" }).replace(
      `[commands.run]
argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]
cwd = "../.."`,
      `[commands.run]
argv = ["uv", "run", "pytest", "--execution-manifest", "{execution_manifest}"]
cwd = "../../.."`,
    );
    const commandExecutor = writeExecutor(commandRoot, "alpha-api", commandSource);
    expectError(commandRoot, "EXECUTOR_PATH_OUTSIDE_ROOT", join(commandExecutor, "executor.toml"));

    const symlinkRoot = fixtureRoot();
    const symlinkExecutor = writeExecutor(
      symlinkRoot,
      "alpha-api",
      descriptor({
        id: "alpha-api",
        engine: "alpha",
        surface: "api",
        runtime: `[runtime]\nkind = "python"\ncwd = "escape"`,
      }),
    );
    symlinkSync(dirname(symlinkRoot), join(symlinkExecutor, "escape"));
    expectError(symlinkRoot, "EXECUTOR_PATH_OUTSIDE_ROOT", join(symlinkExecutor, "executor.toml"));
  });

  it("rejects descriptor and guide symlinks that escape containment", () => {
    const directoryRoot = fixtureRoot();
    const externalExecutor = join(directoryRoot, "external-executor");
    mkdirSync(externalExecutor);
    writeFileSync(
      join(externalExecutor, "executor.toml"),
      descriptor({ id: "alpha-api", engine: "alpha", surface: "api" }),
    );
    writeFileSync(join(externalExecutor, "AGENT.md"), "outside\n");
    symlinkSync(externalExecutor, join(directoryRoot, "automation", "alpha-api"));
    expectError(
      directoryRoot,
      "EXECUTOR_DESCRIPTOR_OUTSIDE_ROOT",
      join(directoryRoot, "automation", "alpha-api", "executor.toml"),
    );

    const descriptorRoot = fixtureRoot();
    const externalDescriptor = join(descriptorRoot, "external-executor.toml");
    writeFileSync(
      externalDescriptor,
      descriptor({ id: "alpha-api", engine: "alpha", surface: "api" }),
    );
    const executorRoot = join(descriptorRoot, "automation", "alpha-api");
    mkdirSync(executorRoot, { recursive: true });
    symlinkSync(externalDescriptor, join(executorRoot, "executor.toml"));
    expectError(
      descriptorRoot,
      "EXECUTOR_DESCRIPTOR_OUTSIDE_ROOT",
      join(executorRoot, "executor.toml"),
    );

    const guideRoot = fixtureRoot();
    const externalGuide = join(guideRoot, "external-guide.md");
    writeFileSync(externalGuide, "outside\n");
    const guideExecutor = writeExecutor(
      guideRoot,
      "alpha-api",
      descriptor({ id: "alpha-api", engine: "alpha", surface: "api" }),
    );
    rmSync(join(guideExecutor, "AGENT.md"));
    symlinkSync(externalGuide, join(guideExecutor, "AGENT.md"));
    expectError(guideRoot, "EXECUTOR_PATH_OUTSIDE_ROOT", join(guideExecutor, "executor.toml"));
  });

  it("reports a missing guide against the descriptor that declared it", () => {
    const root = fixtureRoot();
    const executorRoot = writeExecutor(
      root,
      "alpha-api",
      descriptor({ id: "alpha-api", engine: "alpha", surface: "api" }),
    );
    rmSync(join(executorRoot, "AGENT.md"));
    const error = expectError(
      root,
      "EXECUTOR_AGENT_GUIDE_NOT_FOUND",
      join(executorRoot, "executor.toml"),
    );
    expect(error.message).toContain(resolve(executorRoot, "AGENT.md"));
  });
});
