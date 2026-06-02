#!/usr/bin/env bun
/**
 * build-case-tasks.ts — deterministically enumerate feature cases and output a case task list JSON.
 *
 * Usage:
 *   kata case-tasks build <featureDir>
 *
 * Output (stdout): CaseTaskList JSON. Mutation classification is heuristic;
 * can be corrected after an upstream opus sub-agent probe.
 */

// ─── 类型 ───

export interface CaseTask {
  id: string; // 稳定全局序号 C001…
  title: string; // archive heading 文本（= 任务标题）
  priority: string; // "P0".."P9" from heading; "P?" when the heading has no 【P?】 prefix
  mutates_data: boolean; // 启发式：步骤含写关键词
  serial: boolean; // 创建+删除链路
  excluded: { reason_category: string; reason: string } | null;
}

export interface CaseTaskList {
  feature_id: string;
  source: "manifest_intents" | "archive_md";
  case_count: number;
  cases: CaseTask[];
}

// ─── 启发式词表 ───

const WRITE_KEYWORDS = [
  "新增",
  "创建",
  "新建",
  "删除",
  "编辑",
  "修改",
  "导入",
  "同步",
  "保存",
  "提交",
  "配置",
];
const CREATE_KEYWORDS = ["新增", "创建", "新建"];
const DELETE_KEYWORDS = ["删除"];
const TENANT_KEYWORDS = ["泸州老窖", "生产环境"];

/** Steps text containing write keywords → classified as data-mutating. */
export function classifyMutation(stepsText: string): boolean {
  return WRITE_KEYWORDS.some((k) => stepsText.includes(k));
}

/** Contains both create and delete keywords → create-verify-delete flow, needs serial execution. */
export function isSerialCase(stepsText: string): boolean {
  const hasCreate = CREATE_KEYWORDS.some((k) => stepsText.includes(k));
  const hasDelete = DELETE_KEYWORDS.some((k) => stepsText.includes(k));
  return hasCreate && hasDelete;
}

/** Parse archive.md and extract cases from each `##### 【P?】title` heading. */
export function parseArchiveCases(md: string): CaseTask[] {
  const cases: CaseTask[] = [];
  // 以五级标题切块；每块第一行是标题，余下是步骤与预期文本
  const blocks = md.split(/^#####\s+/m).slice(1);
  let seq = 0;
  for (const block of blocks) {
    const firstLineEnd = block.indexOf("\n");
    const heading = (firstLineEnd === -1 ? block : block.slice(0, firstLineEnd)).trim();
    const body = firstLineEnd === -1 ? "" : block.slice(firstLineEnd + 1);
    const priorityMatch = heading.match(/^【(P\d)】/);
    const priority = priorityMatch ? priorityMatch[1] : "P?";
    const title = heading.replace(/^【P\d】/, "").trim();
    seq += 1;
    const id = `C${String(seq).padStart(3, "0")}`;
    const tenantHit = TENANT_KEYWORDS.find((k) => `${heading}${body}`.includes(k));
    cases.push({
      id,
      title,
      priority,
      mutates_data: classifyMutation(body),
      serial: isSerialCase(body),
      excluded: tenantHit
        ? { reason_category: "tenant_mismatch", reason: `命中跨环境/租户关键词：${tenantHit}` }
        : null,
    });
  }
  return cases;
}
