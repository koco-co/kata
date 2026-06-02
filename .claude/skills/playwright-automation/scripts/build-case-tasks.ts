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

import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

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

// ─── 清单编排器 ───

// manifest.json 中 automation.intents 的条目结构（文件内部，非 export）
interface ManifestIntent {
  id?: string;
  title?: string;
  description?: string;
  automation_status?: string;
}

/** Read a feature dir and produce its case-task list: intents first, else parse archive. */
export function buildCaseTaskList(featureDir: string): CaseTaskList {
  const manifestPath = join(featureDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    feature_id?: string;
    automation?: { intents?: ManifestIntent[] };
    files?: { archive?: string };
    case_drafting?: { archive_path?: string };
  };
  const featureId = manifest.feature_id ?? basename(featureDir);

  // intents 优先：有 ready 状态的条目就用 intents 分支
  const ready = (manifest.automation?.intents ?? []).filter((i) => i.automation_status === "ready");
  if (ready.length > 0) {
    const cases: CaseTask[] = ready.map((intent, idx) => {
      const title = intent.title ?? intent.description ?? intent.id ?? `intent-${idx + 1}`;
      return {
        id: intent.id ?? `C${String(idx + 1).padStart(3, "0")}`,
        title,
        priority: "P?",
        mutates_data: classifyMutation(title),
        serial: isSerialCase(title),
        // intents 已由上游筛为 ready，无需再做租户排除；租户检查只留在 archive 分支
        excluded: null,
      };
    });
    return { feature_id: featureId, source: "manifest_intents", case_count: cases.length, cases };
  }

  // 退回 archive 分支（主路径：多数 feature 的 intents 为空）
  const archiveName = manifest.files?.archive ?? manifest.case_drafting?.archive_path;
  if (!archiveName) {
    throw new Error(`no automation intents and no archive path in manifest: ${manifestPath}`);
  }
  const archivePath = join(featureDir, archiveName);
  if (!existsSync(archivePath)) {
    throw new Error(`archive not found: ${archivePath}`);
  }
  const cases = parseArchiveCases(readFileSync(archivePath, "utf8"));
  return { feature_id: featureId, source: "archive_md", case_count: cases.length, cases };
}
