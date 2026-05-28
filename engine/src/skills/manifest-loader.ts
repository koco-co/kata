import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export interface SkillRouting {
  must_trigger_when: string[];
  must_not_trigger_when: string[];
  clarify: string[];
}

export interface SkillDataflow {
  consumes: string[];
  produces: string[];
  related: string[];
}

export interface SkillManifestEntry {
  user_entry: string;
  dataflow: SkillDataflow;
  routing: SkillRouting;
}

export interface SkillManifest {
  version: number;
  generated_for: string;
  facets: {
    by_input: Record<string, string[]>;
    by_output: Record<string, string[]>;
  };
  skills: Record<string, SkillManifestEntry>;
}

const MANIFEST_PATH = ".claude/contracts/skill-manifest.yaml";

export function loadSkillManifest(root: string): SkillManifest {
  const path = join(root, MANIFEST_PATH);
  if (!existsSync(path)) {
    throw new Error(`skill-manifest.yaml not found at ${MANIFEST_PATH}`);
  }
  const parsed = YAML.parse(readFileSync(path, "utf-8")) as Partial<SkillManifest> | null;
  return {
    version: parsed?.version ?? 0,
    generated_for: parsed?.generated_for ?? "",
    facets: {
      by_input: normalizeFacet(parsed?.facets?.by_input),
      by_output: normalizeFacet(parsed?.facets?.by_output),
    },
    skills: normalizeSkills((parsed?.skills ?? {}) as Record<string, unknown>),
  };
}

function normalizeFacet(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = arr(v);
  }
  return out;
}

function normalizeSkills(raw: Record<string, unknown>): Record<string, SkillManifestEntry> {
  const out: Record<string, SkillManifestEntry> = {};
  for (const [id, value] of Object.entries(raw)) {
    const v = (value ?? {}) as Partial<SkillManifestEntry>;
    out[id] = {
      user_entry: typeof v.user_entry === "string" ? v.user_entry : `/${id}`,
      dataflow: {
        consumes: arr(v.dataflow?.consumes),
        produces: arr(v.dataflow?.produces),
        related: arr(v.dataflow?.related),
      },
      routing: {
        must_trigger_when: arr(v.routing?.must_trigger_when),
        must_not_trigger_when: arr(v.routing?.must_not_trigger_when),
        clarify: arr(v.routing?.clarify),
      },
    };
  }
  return out;
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
