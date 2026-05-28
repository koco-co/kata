import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

// WHY: Phase 1 transitional state — bug-file / conflict-analyze / diff-scan 三个 skill
// 在 spec §6.12 中被 fuse 进 defect-analyze 单 workflow，因此 manifest 仍有 entry
// 但没有独立 workflow.yaml（共用 defect-analyze.yaml）。playwright-cli 则在 Commit 5
// 整体删除（spec §11 P1#5）。三类 transitional skill 暂跳过 manifest ↔ workflow 一致性
// 校验，P3 落地 defect-analyze 与 Commit 5 删 playwright-cli 后这条豁免应同步清理。
// 配套 guard test (engine/tests/skills/manifest-loader.test.ts) 校验本集合的每个 id
// 仍在 manifest 中，避免 Commit 5/P3 删 manifest entry 后这里被遗忘。
export const MANIFEST_WORKFLOW_EXCLUSIONS = new Set<string>([
  "bug-file", // TODO(p3-defect-analyze): remove when fused skill workflow ships
  "conflict-analyze", // TODO(p3-defect-analyze): remove when fused skill workflow ships
  "diff-scan", // TODO(p3-defect-analyze): remove when fused skill workflow ships
  "playwright-cli", // TODO(p1-commit5): remove when manifest entry is dropped
]);

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

/** Verify every manifest skill id resolves to a workflow yaml under .claude/contracts/workflows/. */
export function validateManifestAgainstWorkflows(root: string): string[] {
  const errs: string[] = [];
  const manifest = loadSkillManifest(root);
  for (const id of Object.keys(manifest.skills)) {
    if (MANIFEST_WORKFLOW_EXCLUSIONS.has(id)) continue;
    const workflowPath = join(root, ".claude/contracts/workflows", `${id}.yaml`);
    if (!existsSync(workflowPath)) {
      errs.push(
        `skill '${id}' in manifest has no workflow at .claude/contracts/workflows/${id}.yaml`,
      );
    }
  }
  return errs;
}
