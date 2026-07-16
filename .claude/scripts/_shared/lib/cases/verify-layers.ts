import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isV2 } from "@shared/lib/features/feature-meta.ts";
import type { ResolvedTarget } from "@shared/lib/source-ref/resolve-target.ts";
import { sourceRefKind } from "@shared/lib/source-ref/resolve-target.ts";
import {
  loadCaseEvidenceMapValidator,
  loadCoverageMatrixValidator,
  loadFeatureManifestValidator,
  loadFeatureMetadataV2Validator,
  loadFeatureMetadataValidator,
  loadFeatureSourceSnapshotV2Validator,
  loadFeatureSourceSnapshotValidator,
} from "@shared/schemas/loaders.ts";
import { parse as parseYaml } from "yaml";
import type { CaseEvidenceRow } from "./case-extract.ts";

export interface VerifyIssue {
  layer: "L1" | "L2" | "L3";
  rule: string;
  message: string;
  fix?: string;
}

export const STABLE_CORE_ARTIFACTS = [
  "metadata.yaml",
  ".process/source-snapshot.json",
  ".process/coverage-matrix.json",
  ".process/case-evidence-map.json",
  "cases/archive.md",
  "cases/cases.xmind",
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

const NON_META_STRUCTURED_SCHEMA_FILES: {
  file: string;
  loader: () => (d: unknown) => boolean;
  kind: "json" | "yaml";
  array?: boolean;
  loaderV2?: () => (d: unknown) => boolean;
}[] = [
  {
    file: ".process/source-snapshot.json",
    loader: loadFeatureSourceSnapshotValidator,
    loaderV2: loadFeatureSourceSnapshotV2Validator,
    kind: "json",
  },
  {
    file: ".process/coverage-matrix.json",
    loader: loadCoverageMatrixValidator,
    kind: "json",
    array: true,
  },
  {
    file: ".process/case-evidence-map.json",
    loader: loadCaseEvidenceMapValidator,
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

  // metadata.yaml：按 schema 字段选 v1/v2 验证器
  const metaPath = join(input.featureDir, "metadata.yaml");
  if (existsSync(metaPath)) {
    let metaData: unknown;
    try {
      metaData = parseYaml(readFileSync(metaPath, "utf-8"));
    } catch (e) {
      issues.push({
        layer: "L1",
        rule: "structured_parse_error",
        message: `metadata.yaml 解析失败: ${(e as Error).message}`,
        fix: "修正 metadata.yaml 为合法 YAML",
      });
    }
    if (metaData !== undefined) {
      const validate = isV2(metaData as Record<string, unknown>)
        ? loadFeatureMetadataV2Validator()
        : loadFeatureMetadataValidator();
      if (!validate(metaData)) {
        issues.push({
          layer: "L1",
          rule: "structured_schema_invalid",
          message: `metadata.yaml 不符合 schema: ${JSON.stringify((validate as { errors?: unknown }).errors)}`,
          fix: "修正 metadata.yaml 至符合其 schema",
        });
      }
    }
  }

  for (const s of NON_META_STRUCTURED_SCHEMA_FILES) {
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
    const validate =
      s.loaderV2 && (data as { schema?: string })?.schema === "FeatureSourceSnapshot@2"
        ? s.loaderV2()
        : s.loader();
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
  /\b(?:design\.screenshot|user\.confirmation):/,
];

export function verifyL1Structure(input: {
  manifest: unknown;
  archiveMd: string;
  featureDir: string;
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  // null manifest 表示 FeatureMetadata@2 路径（无独立 manifest.json），跳过 manifest 结构校验
  if (input.manifest !== null) {
    const validate = loadFeatureManifestValidator();
    if (!validate(input.manifest)) {
      issues.push({
        layer: "L1",
        rule: "manifest_schema_invalid",
        message: JSON.stringify(validate.errors),
        fix: "修正 manifest.json 至符合 FeatureManifest@2",
      });
    }
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
  const presentKinds = new Set(atoms.map((a) => sourceRefKind(a.source_ref)).filter(Boolean));
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
  case_id_explicit?: boolean;
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

export function verifyCaseEvidenceMap(input: {
  cases: CaseRecord[];
  evidenceRows: CaseEvidenceRow[];
  atomIds: string[];
  coverageRows: CoverageRow[];
}): VerifyIssue[] {
  const issues: VerifyIssue[] = [];
  const knownAtoms = new Set(input.atomIds);
  const knownCoverage = new Set(input.coverageRows.map((row) => row.id));
  const caseIds = new Set<string>();
  const evidenceById = new Map<string, CaseEvidenceRow>();

  for (const row of input.evidenceRows) {
    if (evidenceById.has(row.case_id)) {
      issues.push({
        layer: "L1",
        rule: "case_evidence_duplicate",
        message: `CaseEvidenceMap case_id 重复: ${row.case_id}`,
        fix: "每条用例只保留一行 CaseEvidenceMap@1",
      });
    }
    evidenceById.set(row.case_id, row);
    for (const atomId of row.requirement_atom_ids) {
      if (!knownAtoms.has(atomId)) {
        issues.push({
          layer: "L1",
          rule: "case_evidence_atom_unknown",
          message: `用例 ${row.case_id} 引用了不存在的 requirement_atom: ${atomId}`,
          fix: "修正 requirement_atom_ids 或补齐 metadata requirement_atoms",
        });
      }
    }
    for (const coverageId of row.coverage_matrix_ids) {
      if (!knownCoverage.has(coverageId)) {
        issues.push({
          layer: "L1",
          rule: "case_evidence_coverage_unknown",
          message: `用例 ${row.case_id} 引用了不存在的 coverage row: ${coverageId}`,
          fix: "修正 coverage_matrix_ids 或补齐 CoverageMatrix@1 行",
        });
      }
    }
  }

  for (const testCase of input.cases) {
    if (testCase.case_id_explicit === false) {
      issues.push({
        layer: "L1",
        rule: "archive_case_id_missing",
        message: `Archive 用例缺少显式 case_id: ${testCase.title}`,
        fix: "在 ##### 用例前添加 <!-- case_id: C... -->",
      });
    }
    if (caseIds.has(testCase.case_id)) {
      issues.push({
        layer: "L1",
        rule: "archive_case_id_duplicate",
        message: `Archive case_id 重复: ${testCase.case_id}`,
        fix: "为每条 ##### 用例设置唯一的 <!-- case_id: ... -->",
      });
    }
    caseIds.add(testCase.case_id);
    const row = evidenceById.get(testCase.case_id);
    if (!row) {
      issues.push({
        layer: "L1",
        rule: "case_evidence_missing",
        message: `Archive 用例 ${testCase.case_id} 缺少 CaseEvidenceMap@1 行`,
        fix: "在 .process/case-evidence-map.json 补齐同 case_id 映射",
      });
    } else if (row.case_title !== testCase.title) {
      issues.push({
        layer: "L1",
        rule: "case_evidence_title_mismatch",
        message: `用例 ${testCase.case_id} 标题与 CaseEvidenceMap 不一致`,
        fix: "同步 Archive 标题与 case-evidence-map.json#case_title",
      });
    }
  }

  for (const row of input.evidenceRows) {
    if (!caseIds.has(row.case_id)) {
      issues.push({
        layer: "L1",
        rule: "case_evidence_orphan",
        message: `CaseEvidenceMap 用例不存在于 Archive: ${row.case_id}`,
        fix: "删除孤立映射或恢复对应 Archive 用例",
      });
    }
  }
  return issues;
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
