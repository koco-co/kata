/**
 * Canonical types for cases.yaml — the single source of truth for QA cases.
 * Derivatives (xmind/md/csv/xlsx) are rendered from CasesFile and never hand-edited.
 */

/** File-level metadata for one feature's case set. */
export interface CaseMeta {
  /** 用例集标题(通常即需求名) */
  title: string;
  /** 需求版本,如 v6.4.11 */
  version: string;
  /** feature 标识(目录名) */
  feature_id: string;
  /** 用例来源说明(需求文档/链接) */
  source?: string;
}

/** One executable test case. */
export interface CaseItem {
  /** 稳定用例编号,如 C001 */
  id: string;
  /** 用例标题 */
  title: string;
  priority: "P0" | "P1" | "P2";
  /** 前置条件 */
  precondition?: string;
  /** 执行步骤与逐步预期 */
  steps: { action: string; expected: string }[];
  /** 标签;首个起依次为 module/page/subgroup 层级路径 */
  tags?: string[];
  /** 证据关联(替代 .process/),如需求条目或截图路径 */
  source_ref?: string;
}

/** Root document of cases/需求名.yaml. */
export interface CasesFile {
  meta: CaseMeta;
  cases: CaseItem[];
}

export const PRIORITIES = ["P0", "P1", "P2"] as const;
