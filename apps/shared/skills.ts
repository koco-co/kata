/**
 * Skill catalog reader for the kata platform.
 *
 * Reads the declarative .ai/core/skills/<id>/skill.yaml contracts so agents and
 * the console can discover what kata can do without crawling the filesystem.
 * Read-only.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "kata-engine";
import { parseDocument } from "yaml";

export interface SkillSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: string | null;
  readonly status: string | null;
  readonly summary: string | null;
  readonly mustTriggerWhen: readonly string[];
  readonly mustNotTriggerWhen: readonly string[];
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

function skillsRoot(): string {
  return join(repoRoot(), ".ai/core/skills");
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function toSummary(doc: Record<string, unknown>): SkillSummary {
  const description = (doc.description ?? {}) as Record<string, unknown>;
  const inputs = (doc.inputs ?? {}) as Record<string, unknown>;
  return {
    id: typeof doc.id === "string" ? doc.id : "",
    name: typeof doc.name === "string" ? doc.name : "",
    kind: typeof doc.kind === "string" ? doc.kind : null,
    status: typeof doc.status === "string" ? doc.status : null,
    summary: typeof description.summary === "string" ? description.summary : null,
    mustTriggerWhen: asStringArray(description.must_trigger_when),
    mustNotTriggerWhen: asStringArray(description.must_not_trigger_when),
    inputs: Object.keys(inputs),
    outputs: asStringArray(doc.outputs),
  };
}

export function listSkills(): SkillSummary[] {
  const root = skillsRoot();
  if (!existsSync(root)) return [];
  return (
    readdirSync(root)
      .filter((name) => statSync(join(root, name)).isDirectory())
      .map((name) => join(root, name, "skill.yaml"))
      .filter((path) => existsSync(path))
      // strict:false tolerates backtick-prefixed scalars deep in body.hard_rules;
      // we only consume top-level fields, which recover cleanly.
      .map((path) => {
        const doc = parseDocument(readFileSync(path, "utf-8"), { strict: false });
        return toSummary((doc.toJS() ?? {}) as Record<string, unknown>);
      })
      .filter((skill) => skill.id !== "")
      .sort((a, b) => a.id.localeCompare(b.id))
  );
}
