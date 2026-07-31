/**
 * Canonical types for cases.yaml — the single source of truth for QA cases.
 * Derivatives (xmind/md/csv/xlsx) are rendered from CasesFile and never hand-edited.
 */

/** File-level metadata for one feature's case set. */
export interface CaseMeta {
  /** 用例集标题(通常即需求名) */
  title: string;
  /** Lanhu/PRD requirement_id；历史未关联 PRD 的用例集可暂缺。 */
  requirement_id?: string;
  /** 禅道中存放该需求用例的模块 ID；未知时显式写空字符串。 */
  case_module_id: string;
  /** 用例来源说明(需求文档/链接) */
  source?: string;
  /** 原始导入材料文件名,相对于 cases/imports/. */
  imports?: string[];
  /** 由 YAML 生成的目标文件名,相对于 cases/exports/；缺省生成同名 xmind。 */
  exports?: string[];
  /** XMind layout contract; requirements creates one L1 topic per requirement. */
  layout?: "flat" | "requirements";
  /** Digest of cases/test-points.md; required when the feature has prd/prd.md. */
  test_points_digest?: string;
}

/** Runtime-only information derived from the feature directory, never serialized to cases YAML. */
export interface CaseRenderContext {
  version: string;
  featureKey: string;
}

/** One requirement represented as an L1 topic in the aggregate layout. */
export interface CaseRequirement {
  requirement_id: string;
  title: string;
  source: string;
}

/** One executable test case. */
export interface CaseItem {
  /** 稳定用例编号,如 C0001 */
  id: string;
  /** 用例标题 */
  title: string;
  /** Requirement link used by the aggregate XMind layout. */
  requirement_id?: string;
  priority: "P0" | "P1" | "P2";
  /** 前置条件 */
  precondition?: string;
  /** 执行步骤与逐步预期 */
  steps: { action: string; expected: string }[];
  /** 标签;首个起依次为 module/page/subgroup 层级路径 */
  tags?: string[];
  /** 证据关联(替代 .process/),如需求条目或截图路径 */
  source_ref?: string;
  /** Generated Playwright file name relative to the feature automation/tests/cases directory. */
  automation?: { spec_file: string };
}

/** Root document of cases/需求名.yaml. */
export interface CasesFile {
  meta: CaseMeta;
  requirements?: CaseRequirement[];
  cases: CaseItem[];
}

export const PRIORITIES = ["P0", "P1", "P2"] as const;
