import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { repoRoot } from "kata-engine";
import { parseDocument } from "yaml";
import type { SkillSummary } from "../types.ts";

interface YamlParseIssue {
  readonly code?: string;
  readonly message: string;
  readonly linePos?: readonly [{ readonly line: number; readonly col: number }, ...unknown[]];
}

function skillsRoot(): string {
  return join(repoRoot(), ".ai/core/skills");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (value === undefined) return {};
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`Invalid skill ${field}`);
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

function indentation(line: string): number {
  return line.length - line.trimStart().length;
}

function isRecoverableHardRulesScalar(text: string, error: YamlParseIssue): boolean {
  if (error.code !== "BAD_SCALAR_START") return false;
  const line = error.linePos?.[0]?.line;
  if (line === undefined) return false;
  const lines = text.split(/\r?\n/);
  const sourceLine = lines[line - 1] ?? "";
  if (!sourceLine.trimStart().startsWith("- `")) return false;

  let foundHardRules = false;
  const hardRulesIndent = 4;
  for (let index = line - 2; index >= 0; index -= 1) {
    const current = lines[index] ?? "";
    if (current.trim() === "") continue;
    if (!foundHardRules) {
      if (indentation(current) <= hardRulesIndent && current.trim() !== "hard_rules:") return false;
      if (indentation(current) === hardRulesIndent && current.trim() === "hard_rules:") {
        foundHardRules = true;
      }
      continue;
    }
    if (indentation(current) === 0) return current.trim() === "body:";
  }
  return false;
}

function fatalYamlErrors(
  text: string,
  errors: readonly YamlParseIssue[],
  allowHardRulesRecovery: boolean,
): YamlParseIssue[] {
  if (!allowHardRulesRecovery) return [...errors];
  return errors.filter((error) => !isRecoverableHardRulesScalar(text, error));
}

function toSummary(doc: Record<string, unknown>, path: string): SkillSummary {
  const description = asObject(doc.description, "description");
  const inputs = asObject(doc.inputs, "inputs");
  try {
    return {
      id: skillId(doc.id),
      name: skillName(doc.name),
      kind: typeof doc.kind === "string" ? doc.kind : null,
      status: typeof doc.status === "string" ? doc.status : null,
      summary: typeof description.summary === "string" ? description.summary : null,
      mustTriggerWhen: asStringArray(description.must_trigger_when),
      mustNotTriggerWhen: asStringArray(description.must_not_trigger_when),
      inputs: Object.keys(inputs),
      outputs: asStringArray(doc.outputs),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path}: ${message}`);
  }
}

export function listSkills(): SkillSummary[] {
  return listSkillsFromRoot(skillsRoot());
}

export function listSkillsFromRoot(root: string): SkillSummary[] {
  if (!existsSync(root)) return [];
  const allowHardRulesRecovery = resolve(root) === resolve(skillsRoot());
  const ids = new Set<string>();
  const skills = readdirSync(root)
    .filter((name) => statSync(join(root, name)).isDirectory())
    .map((name) => join(root, name, "skill.yaml"))
    .filter((path) => existsSync(path))
    .map((path) => {
      // strict:false tolerates backtick-prefixed scalars in body.hard_rules;
      // we only consume top-level fields, which recover cleanly.
      const text = readFileSync(path, "utf-8");
      const doc = parseDocument(text, {
        strict: false,
      });
      const fatalErrors = fatalYamlErrors(text, doc.errors, allowHardRulesRecovery);
      if (fatalErrors.length > 0) {
        throw new Error(`${path}: ${fatalErrors[0]?.message ?? "YAML parse error"}`);
      }
      return toSummary((doc.toJS() ?? {}) as Record<string, unknown>, path);
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const skill of skills) {
    if (ids.has(skill.id)) throw new Error(`${root}: Duplicate skill id: ${skill.id}`);
    ids.add(skill.id);
  }
  return skills;
}
