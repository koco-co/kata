#!/usr/bin/env bun
/**
 * build-case-tasks.ts — deterministically enumerate feature cases and output a case task list JSON.
 *
 * Usage:
 *   kata case-tasks build --feature <feature-dir>
 *
 * Output (stdout): CaseTaskList JSON. Mutation classification is heuristic;
 * can be corrected after an upstream opus sub-agent probe.
 */

import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createCli } from "@shared/lib/cli-runner.ts";
import { isV2, readFeatureMeta } from "@shared/lib/features/feature-meta.ts";

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

// manifest.json（@1）或 metadata.yaml（@2）中 automation.intents 的条目结构（文件内部，非 export）
interface ManifestIntent {
  id?: string;
  title?: string;
  description?: string;
  automation_status?: string;
}

// 从 intents 数组中筛出 ready 条目并构建 CaseTask 列表
function buildIntentsCases(intents: ManifestIntent[]): CaseTask[] {
  const ready = intents.filter((i) => i.automation_status === "ready");
  return ready.map((intent, idx) => {
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
}

/** Read a feature dir and produce its case-task list: intents first, else parse archive.
 * Supports FeatureMetadata@2 (metadata.yaml) and @1 (manifest.json) layouts.
 */
export function buildCaseTaskList(featureDir: string): CaseTaskList {
  // ── @2 路径：metadata.yaml 存在且 schema=FeatureMetadata@2 ──
  const meta = readFeatureMeta(featureDir);
  if (isV2(meta)) {
    const featureId = (meta.feature_id ?? meta.id) || basename(featureDir);
    const intents = (meta.automation?.intents ?? []) as ManifestIntent[];
    const readyCases = buildIntentsCases(intents);
    if (readyCases.length > 0) {
      return {
        feature_id: featureId,
        source: "manifest_intents",
        case_count: readyCases.length,
        cases: readyCases,
      };
    }
    // 退回 archive 分支：files.archive 或 case_drafting.archive_path
    const archiveName =
      (meta.files?.archive as string | null | undefined) ??
      (meta.case_drafting?.archive_path as string | null | undefined);
    if (!archiveName) {
      throw new Error(`no automation intents and no archive path in metadata.yaml: ${featureDir}`);
    }
    const archivePath = join(featureDir, archiveName);
    if (!existsSync(archivePath)) {
      throw new Error(`archive not found: ${archivePath}`);
    }
    const cases = parseArchiveCases(readFileSync(archivePath, "utf8"));
    return { feature_id: featureId, source: "archive_md", case_count: cases.length, cases };
  }

  // ── @1 兼容路径：manifest.json 兜底（老 feature 仍可能 manifest.json 形态）──
  const manifestPath = join(featureDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`no metadata.yaml or manifest.json in feature: ${featureDir}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    feature_id?: string;
    automation?: { intents?: ManifestIntent[] };
    files?: { archive?: string };
    case_drafting?: { archive_path?: string };
  };
  const featureId = manifest.feature_id ?? basename(featureDir);

  // intents 优先：有 ready 状态的条目就用 intents 分支
  const readyCases = buildIntentsCases(manifest.automation?.intents ?? []);
  if (readyCases.length > 0) {
    return {
      feature_id: featureId,
      source: "manifest_intents",
      case_count: readyCases.length,
      cases: readyCases,
    };
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

// ─── CLI 程序 ───

/** CLI program: `kata case-tasks build --feature <dir>` */
export const program = createCli({
  name: "case-tasks",
  description: "枚举 feature 用例，输出用例任务清单 JSON（供 playwright-automation 编排消费）",
  commands: [
    {
      name: "build",
      description: "构建 feature 用例任务清单。成功退出 0，失败退出 1。",
      options: [{ flag: "--feature <dir>", description: "feature 目录路径", required: true }],
      action: (opts) => {
        const o = opts as Record<string, unknown>;
        const featureDir = o.feature as string;
        try {
          const list = buildCaseTaskList(featureDir);
          process.stdout.write(`${JSON.stringify(list, null, 2)}\n`);
        } catch (err) {
          process.stderr.write(`${(err as Error).message}\n`);
          process.exit(1);
        }
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
