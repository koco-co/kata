import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  loadCoverageMatrixValidator,
  loadFeatureManifestValidator,
  loadFeatureMetadataValidator,
  loadFeatureSourceSnapshotValidator,
} from "@shared/schemas/loaders.ts";
import type { ResolvedTarget } from "@shared/lib/source-ref/resolve-target.ts";
import { sourceRefKind } from "@shared/lib/source-ref/resolve-target.ts";

export interface VerifyIssue {
  layer: "L1" | "L2" | "L3";
  rule: string;
  message: string;
  fix?: string;
}

export const STABLE_CORE_ARTIFACTS = [
  "manifest.json",
  "metadata.yaml",
  ".process/source-snapshot.json",
  ".process/coverage-matrix.json",
  "archive.md",
  "cases.xmind",
] as const;

export function verifyStableCoreArtifacts(input: {
  featureDir: string;
  status: string;
}): VerifyIssue[] {
  if (input.status !== "completed") return [];
  const issues: VerifyIssue[] = [];
  for (const f of STABLE_CORE_ARTIFACTS) {
    if (!existsSync(join(input.featureDir, f))) {
      issues.push({
        layer: "L1",
        rule: "stable_core_missing",
        message: `稳定核心产物缺失: ${f}`,
        fix: `在 feature 目录生成 ${f}（completed 路径必须六件齐全）`,
      });
    }
  }
  return issues;
}

const STRUCTURED_SCHEMA_FILES: {
  file: string;
  loader: () => (d: unknown) => boolean;
  kind: "json" | "yaml";
  array?: boolean;
}[] = [
  { file: "metadata.yaml", loader: loadFeatureMetadataValidator, kind: "yaml" },
  {
    file: ".process/source-snapshot.json",
    loader: loadFeatureSourceSnapshotValidator,
    kind: "json",
  },
  {
    file: ".process/coverage-matrix.json",
    loader: loadCoverageMatrixValidator,
    kind: "json",
    array: true,
  },
];

export function verifyStructuredSchemas(input: {
  featureDir: string;
  status: string;
}): VerifyIssue[] {
  if (input.status !== "completed") return [];
  const issues: VerifyIssue[] = [];
  for (const s of STRUCTURED_SCHEMA_FILES) {
    const p = join(input.featureDir, s.file);
    if (!existsSync(p)) continue;
    let data: unknown;
    try {
      const raw = readFileSync(p, "utf-8");
      data = s.kind === "yaml" ? parseYaml(raw) : JSON.parse(raw);
    } catch (e) {
      issues.push({
        layer: "L1",
        rule: "structured_parse_error",
        message: `${s.file} 解析失败: ${(e as Error).message}`,
        fix: `修正 ${s.file} 为合法 ${s.kind.toUpperCase()}`,
      });
      continue;
    }
    const validate = s.loader();
    const rows = s.array ? (Array.isArray(data) ? data : null) : [data];
    if (rows === null) {
      issues.push({
        layer: "L1",
        rule: "structured_schema_invalid",
        message: `${s.file} 顶层应为数组 (CoverageMatrix@1[])`,
        fix: `${s.file} 顶层用 CoverageMatrix@1 行数组`,
      });
      continue;
    }
    rows.forEach((row, i) => {
      if (!validate(row)) {
        const where = s.array ? `${s.file}[${i}]` : s.file;
        issues.push({
          layer: "L1",
          rule: "structured_schema_invalid",
          message: `${where} 不符合 schema: ${JSON.stringify((validate as { errors?: unknown }).errors)}`,
          fix: `修正 ${s.file} 至符合其 schema`,
        });
      }
    });
  }
  return issues;
}

const LEAK_PATTERNS = [
  /\bSR-\d/,
  /csv::/,
  /#sha256:[a-f0-9]{64}/,
  /\b(?:prd\.file|lanhu\.fixture|knowledge\.entry|repo\.line|case\.archive):/,
];

export function verifyL1Structure(input: {
  manifest: unknown;
  archiveMd: string;
  featureDir: string;
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const validate = loadFeatureManifestValidator();
  if (!validate(input.manifest)) {
    issues.push({
      layer: "L1",
      rule: "manifest_schema_invalid",
      message: JSON.stringify(validate.errors),
      fix: "修正 manifest.json 至符合 FeatureManifest@2",
    });
  }
  for (const re of LEAK_PATTERNS) {
    if (re.test(input.archiveMd)) {
      issues.push({
        layer: "L1",
        rule: "sourceref_leak",
        message: `archive.md 人类可读层出现 SourceRef 标识: ${re}`,
        fix: "把 SourceRef 标识移出 archive.md，仅保留在 manifest/结构化层",
      });
      break;
    }
  }
  return issues;
}

export function verifyL2Inputs(input: {
  manifest: { case_drafting?: { requirement_atoms?: { id: string; source_ref: string }[] } };
  requiredKinds: string[];
  resolve: (ref: string) => ResolvedTarget;
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const atoms = input.manifest.case_drafting?.requirement_atoms ?? [];
  const presentKinds = new Set(atoms.map((a) => sourceRefKind(a.source_ref)));
  for (const kind of input.requiredKinds) {
    if (!presentKinds.has(kind as never)) {
      issues.push({
        layer: "L2",
        rule: "required_input_uncovered",
        message: `没有任何 requirement_atom 引用 ${kind}`,
        fix: `补充至少一个 source_ref kind=${kind} 的证据`,
      });
    }
  }
  for (const a of atoms) {
    if (!input.resolve(a.source_ref).found) {
      issues.push({
        layer: "L2",
        rule: "source_ref_unresolved",
        message: `source_ref 无法解析到真实目标: ${a.source_ref}`,
        fix: "确认引用的知识条目/源码路径真实存在且已确认 triple",
      });
    }
  }
  return issues;
}

export interface CaseRecord {
  case_id: string;
  requirement_atom_ids: string[];
  steps: string[];
  expected: string;
  title: string;
}

export function verifyL3Quality(input: { cases: CaseRecord[]; atomIds: string[] }): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const known = new Set(input.atomIds);
  for (const c of input.cases) {
    const traced = c.requirement_atom_ids.filter((id) => known.has(id));
    if (traced.length === 0) {
      issues.push({
        layer: "L3",
        rule: "case_untraceable",
        message: `用例 ${c.case_id} 无法追溯到任何 requirement_atom`,
        fix: "为用例补 requirement_atom_ids",
      });
    }
    if (c.steps.length === 0 || c.expected.trim() === "" || c.title.trim() === "") {
      issues.push({
        layer: "L3",
        rule: "case_incomplete",
        message: `用例 ${c.case_id} 缺步骤/预期/标题`,
        fix: "补全步骤、预期结果与标题",
      });
    }
  }
  return issues;
}

export interface CoverageRow {
  id: string;
  requirement_atom_ids: string[];
  evidence_status: string;
}
const UNCOVERED_STATUSES = new Set(["uncovered", "missing", "none", "todo"]);

export function verifyCoverageHoles(input: {
  coverageRows: CoverageRow[];
  atomIds: string[];
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const covered = new Set<string>();
  for (const r of input.coverageRows) {
    for (const id of r.requirement_atom_ids) covered.add(id);
    if (UNCOVERED_STATUSES.has(r.evidence_status)) {
      issues.push({
        layer: "L3",
        rule: "coverage_uncovered",
        message: `覆盖行 ${r.id} evidence_status=${r.evidence_status}`,
        fix: "补齐该覆盖项的证据或用例",
      });
    }
  }
  for (const id of input.atomIds) {
    if (!covered.has(id)) {
      issues.push({
        layer: "L3",
        rule: "coverage_hole",
        message: `requirement_atom ${id} 无任何 coverage 行覆盖`,
        fix: "在 .process/coverage-matrix.json 增加覆盖该 atom 的行",
      });
    }
  }
  return issues;
}
