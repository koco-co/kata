// Phase 1: catalog reads .claude single-source via compat-shim; Phase 2 will route through skill-manifest.yaml.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import YAML, { parseDocument } from "yaml";
import type { SkillSummary } from "../types.ts";
import { readClaudeSkillContracts, type SkillContractsRead } from "./compat-shim.ts";

interface YamlParseIssue {
  readonly message: string;
}

interface RuntimeSkillDoc {
  readonly name: string;
  readonly description: string | null;
}

function skillsRoot(): string {
  return join(currentRepoRoot(), ".claude/skills");
}

function contractsRoot(): string {
  return join(currentRepoRoot(), ".claude/contracts");
}

function currentRepoRoot(): string {
  let current = resolve(process.cwd());
  while (true) {
    if (existsSync(join(current, "package.json")) && existsSync(join(current, "engine"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return resolve(process.cwd());
    current = parent;
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function skillId(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid skill id");
  const id = value.replace(/@\d+$/, "");
  if (id === "") throw new Error("Invalid skill id");
  return id;
}

function skillName(value: unknown): string {
  if (typeof value !== "string" || value === "") {
    throw new Error("Invalid skill name");
  }
  return value;
}

function readFrontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, "utf-8");
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${path}: SKILL.md frontmatter is required`);

  const doc = parseDocument(match[1] ?? "");
  if (doc.errors.length > 0) {
    throw new Error(`${path}: ${firstYamlError(doc.errors)}`);
  }
  return (doc.toJS() ?? {}) as Record<string, unknown>;
}

function firstYamlError(errors: readonly YamlParseIssue[]): string {
  return errors[0]?.message ?? "YAML parse error";
}

function readRuntimeSkill(path: string): RuntimeSkillDoc {
  const data = readFrontmatter(path);
  try {
    return {
      name: skillName(data.name),
      description: typeof data.description === "string" ? data.description : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: ${message}`);
  }
}

function readRouteLists(
  routesRoot: string,
  id: string,
): Pick<SkillSummary, "mustTriggerWhen" | "mustNotTriggerWhen"> {
  const path = join(routesRoot, `${id}.yaml`);
  if (!existsSync(path)) return { mustTriggerWhen: [], mustNotTriggerWhen: [] };
  const parsed = YAML.parse(readFileSync(path, "utf-8"));
  return {
    mustTriggerWhen: asStringArray((parsed as { should_trigger?: unknown })?.should_trigger),
    mustNotTriggerWhen: asStringArray(
      (parsed as { should_not_trigger?: unknown })?.should_not_trigger,
    ),
  };
}

function toSummary(id: string, doc: RuntimeSkillDoc, contracts: SkillContractsRead): SkillSummary {
  const route = readRouteLists(contracts.routesRoot, id);
  const graphEntry = contracts.graph[id] ?? {};
  return {
    id,
    name: doc.name,
    kind: "runtime-skill",
    status: "active",
    summary: doc.description,
    mustTriggerWhen: route.mustTriggerWhen,
    mustNotTriggerWhen: route.mustNotTriggerWhen,
    inputs: asStringArray(graphEntry.consumes),
    outputs: asStringArray(graphEntry.produces),
  };
}

export function listSkills(): SkillSummary[] {
  return listSkillsFromRoot(skillsRoot(), contractsRoot());
}

export function listSkillsFromRoot(root: string, contractRoot = ""): SkillSummary[] {
  if (!existsSync(root)) return [];
  const contracts: SkillContractsRead = contractRoot
    ? readClaudeSkillContracts(contractRoot)
    : { graph: {}, routesRoot: "" };
  const ids = new Set<string>();
  const skills = readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => join(root, name, "SKILL.md"))
    .filter((path) => existsSync(path))
    .map((path) => {
      const doc = readRuntimeSkill(path);
      const id = skillId(doc.name);
      if (id !== basename(join(path, ".."))) {
        throw new Error(`${path}: skill name must match directory name`);
      }
      return toSummary(id, doc, contracts);
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const skill of skills) {
    if (ids.has(skill.id)) throw new Error(`${root}: Duplicate skill id: ${skill.id}`);
    ids.add(skill.id);
  }
  return skills;
}

export const __test__ = { readFrontmatter };
