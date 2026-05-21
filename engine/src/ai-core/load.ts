import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { aiCoreRoot, repoRoot } from "./paths.ts";
import type {
  AiCoreContractRef,
  AiCoreGuardRef,
  AiCoreProject,
  AiCoreRuntimeRoot,
  AiCoreSchemaRef,
} from "./types.ts";
import { parseYamlRows } from "./yaml-contract.ts";

const guardKinds = new Set<AiCoreGuardRef["kind"]>([
  "write_policy",
  "content_lint",
  "schema_guard",
  "plugin_policy",
  "runner_policy",
  "failure_policy",
]);
const runtimeRootStatuses = new Set<AiCoreRuntimeRoot["status"]>(["declared", "transitional"]);
const contractVersion = 1;
const gaWorkflowSkillMirrorIds = new Set([
  contractId("workspace-manage"),
  contractId("case-edit"),
  contractId("knowledge-curate"),
  contractId("bug-file"),
  contractId("conflict-analyze"),
  contractId("case-hotfix"),
  contractId("playwright-automation"),
  contractId("diff-scan"),
  contractId("infra-diagnose"),
]);
const SCHEMA_REGISTRY_ROW_KEYS = ["id", "version", "path"];
const GUARD_REGISTRY_ROW_KEYS = ["id", "kind", "implementation"];
const RUNTIME_ROOT_ROW_KEYS = ["path", "status", "hidden_id_lint"];

type LoadAiCoreOptions = {
  coreRoot?: string;
  root?: string;
};

function coerceValue(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^[0-9]+$/.test(value)) return Number(value);
  return value.replace(/^"|"$/g, "");
}

export async function loadAiCore(options: LoadAiCoreOptions = {}): Promise<AiCoreProject> {
  const coreRoot = options.coreRoot ?? aiCoreRoot();
  const root = options.root ?? repoRoot();
  const schemasYaml = readFileSync(join(coreRoot, "schemas", "registry.yaml"), "utf8");
  const guardsYaml = readFileSync(join(coreRoot, "guards", "registry.yaml"), "utf8");
  const rootsYaml = readFileSync(join(coreRoot, "runtimes", "implementation-roots.yaml"), "utf8");
  const schemas = validateSchemaRows(
    parseYamlRowListOrThrow(
      schemasYaml,
      ".ai/core/schemas/registry.yaml",
      "schemas",
      SCHEMA_REGISTRY_ROW_KEYS,
    ),
  );
  const guards = validateGuardRows(
    parseYamlRowListOrThrow(
      guardsYaml,
      ".ai/core/guards/registry.yaml",
      "guards",
      GUARD_REGISTRY_ROW_KEYS,
    ),
  );
  const runtimeRoots = validateRuntimeRootRows(
    parseYamlRowListOrThrow(
      rootsYaml,
      ".ai/core/runtimes/implementation-roots.yaml",
      "implementation_roots",
      RUNTIME_ROOT_ROW_KEYS,
    ),
  );
  const skills = discoverContractFiles(join(coreRoot, "skills"), "skill.yaml", root, {
    exactBasename: true,
  });
  const prompts = discoverContractFiles(join(coreRoot, "prompts"), ".prompt.yaml", root);
  const workflows = discoverContractFiles(join(coreRoot, "workflows"), ".workflow.yaml", root);
  const agents = discoverContractFiles(join(coreRoot, "agents"), ".agent.yaml", root);
  const plugins = discoverContractFiles(join(coreRoot, "plugins"), "plugin.yaml", root, {
    exactBasename: true,
  });
  validateUniqueContractIds([
    ...tagContracts(skills, "skill"),
    ...tagContracts(prompts, "prompt"),
    ...tagContracts(workflows, "workflow"),
    ...tagContracts(agents, "agent"),
    ...tagContracts(plugins, "plugin"),
  ]);

  return {
    root,
    schemas,
    guards,
    runtimeRoots,
    implementationRoots: runtimeRoots.map((root) => String(root.path)),
    skills,
    prompts,
    workflows,
    agents,
    plugins,
  };
}

function parseYamlRowListOrThrow(
  content: string,
  path: string,
  key: string,
  requiredRowKeys: string[],
): Record<string, string | number | boolean>[] {
  const result = parseYamlRows(content, path, key);
  if (!result.ok) throw new Error(result.issues.map(formatIssue).join("; "));
  const allowedRowKeys = new Set(requiredRowKeys);
  return (result.value ?? []).map((row, index) => {
    const rowNumber = index + 1;
    const missingKey = requiredRowKeys.find(
      (rowKey) => row[rowKey] === undefined || row[rowKey].length === 0,
    );
    if (missingKey) {
      throw new Error(
        formatIssue({
          code: "yaml.missing_required_row_field",
          message: `${key} row ${rowNumber} is missing required field ${missingKey}.`,
          path,
        }),
      );
    }
    const unknownKey = Object.keys(row).find((rowKey) => !allowedRowKeys.has(rowKey));
    if (unknownKey) {
      throw new Error(
        formatIssue({
          code: "yaml.unknown_row_field",
          message: `${key} row ${rowNumber} contains unknown field '${unknownKey}'.`,
          path,
        }),
      );
    }
    const coerced: Record<string, string | number | boolean> = {};
    for (const [rowKey, value] of Object.entries(row)) {
      coerced[rowKey] = coerceValue(value);
    }
    return coerced;
  });
}

function formatIssue(issue: { code: string; message: string; path: string }): string {
  return `${issue.code}: ${issue.message} (${issue.path})`;
}

type ContractCollection = "skill" | "prompt" | "workflow" | "agent" | "plugin";

type TaggedContractRef = AiCoreContractRef & {
  collection: ContractCollection;
};

function contractId(name: string): string {
  return `${name}@${contractVersion}`;
}

function tagContracts(
  contracts: AiCoreContractRef[],
  collection: ContractCollection,
): TaggedContractRef[] {
  return contracts.map((contract) => ({ ...contract, collection }));
}

function validateUniqueContractIds(contracts: TaggedContractRef[]): void {
  const seen = new Map<string, TaggedContractRef>();
  for (const contract of contracts) {
    const previous = seen.get(contract.id);
    if (previous && !isAllowedGaWorkflowSkillMirror(previous, contract)) {
      throw new Error(`Duplicate contract id ${contract.id} in ${contract.path}`);
    }
    if (!previous) seen.set(contract.id, contract);
  }
}

function isAllowedGaWorkflowSkillMirror(
  left: TaggedContractRef,
  right: TaggedContractRef,
): boolean {
  const collections = new Set([left.collection, right.collection]);
  return (
    collections.has("skill") && collections.has("workflow") && gaWorkflowSkillMirrorIds.has(left.id)
  );
}

function discoverContractFiles(
  directory: string,
  suffix: string,
  root: string,
  options: { exactBasename?: boolean } = {},
): AiCoreContractRef[] {
  if (!existsSync(directory)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...discoverContractFilePaths(path, suffix, options));
    } else if (stats.isFile() && matchesContractFile(path, suffix, options)) {
      files.push(path);
    }
  }

  const seen = new Map<string, string>();
  return files.sort().map((path) => {
    const id = readTopLevelId(path);
    if (seen.has(id)) throw new Error(`Duplicate contract id ${id} in ${relative(root, path)}`);
    seen.set(id, path);
    return {
      id,
      path: relative(root, path),
    };
  });
}

function discoverContractFilePaths(
  directory: string,
  suffix: string,
  options: { exactBasename?: boolean },
): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...discoverContractFilePaths(path, suffix, options));
    } else if (stats.isFile() && matchesContractFile(path, suffix, options)) {
      files.push(path);
    }
  }
  return files;
}

function matchesContractFile(
  path: string,
  suffix: string,
  options: { exactBasename?: boolean },
): boolean {
  return options.exactBasename === true ? basename(path) === suffix : path.endsWith(suffix);
}

function readTopLevelId(path: string): string {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^id:\s*([^\s#]+)/m);
  if (!match) throw new Error(`Missing id in ${path}`);
  return match[1];
}

function validateSchemaRows(rows: Record<string, string | number | boolean>[]): AiCoreSchemaRef[] {
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const context = `schema registry row ${index + 1}`;
    const id = requireString(row, "id", context);
    if (seen.has(id)) throw new Error(`Duplicate schema id: ${id}`);
    seen.add(id);
    return {
      id,
      version: requireNumber(row, "version", context),
      path: requireString(row, "path", context),
    };
  });
}

function validateGuardRows(rows: Record<string, string | number | boolean>[]): AiCoreGuardRef[] {
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const context = `guard registry row ${index + 1}`;
    const id = requireString(row, "id", context);
    if (seen.has(id)) throw new Error(`Duplicate guard id: ${id}`);
    seen.add(id);
    const kind = requireString(row, "kind", context);
    if (!guardKinds.has(kind as AiCoreGuardRef["kind"]))
      throw new Error(`Invalid guard kind for ${id}: ${kind}`);
    return {
      id,
      kind: kind as AiCoreGuardRef["kind"],
      implementation: requireString(row, "implementation", context),
    };
  });
}

function validateRuntimeRootRows(
  rows: Record<string, string | number | boolean>[],
): AiCoreRuntimeRoot[] {
  const seen = new Set<string>();
  return rows.map((row, index) => {
    const context = `implementation root row ${index + 1}`;
    const path = requireString(row, "path", context);
    if (seen.has(path)) throw new Error(`Duplicate implementation root path: ${path}`);
    seen.add(path);
    const status = requireString(row, "status", context);
    if (!runtimeRootStatuses.has(status as AiCoreRuntimeRoot["status"])) {
      throw new Error(`Invalid implementation root status for ${path}: ${status}`);
    }
    const hiddenIdLint = row.hidden_id_lint;
    if (typeof hiddenIdLint !== "boolean")
      throw new Error(`Missing or invalid boolean hidden_id_lint in ${context}`);
    return {
      path,
      status: status as AiCoreRuntimeRoot["status"],
      hidden_id_lint: hiddenIdLint,
    };
  });
}

function requireString(
  row: Record<string, string | number | boolean>,
  key: string,
  context: string,
): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`Missing or invalid string ${key} in ${context}`);
  return value;
}

function requireNumber(
  row: Record<string, string | number | boolean>,
  key: string,
  context: string,
): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`Missing or invalid number ${key} in ${context}`);
  return value;
}
