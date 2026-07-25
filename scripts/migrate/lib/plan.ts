/**
 * Migration planner: scan workspace and produce one MigrateOp per file.
 * One-shot script for the T2 workspace migration; removed after use.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface MigrateOp {
  action: "keep" | "move" | "convert" | "merge" | "delete" | "confirm";
  /** 仓库相对路径 */
  src: string;
  /** move/merge 的目标路径(仓库相对) */
  dest?: string;
  sha256: string;
  reason: string;
  /** 扫描时是否被 git 跟踪 */
  tracked?: boolean;
}

// ─── 分类常量 ───

/** inputs 旧命名 → 新命名 */
const INPUTS_RENAME: Record<string, string> = {
  "lanhu-snapshots": "snapshots",
  images: "snapshots",
  "reference-docs": "attachments",
  legacy: "attachments",
};

/** 用例产物允许的扩展名(cases/ 下除此之外的散文件移去 automation/scripts/) */
const CASE_ARTIFACT_EXT = new Set(["xmind", "md", "yaml", "csv", "xlsx"]);

/** v647 空壳目录名(子串匹配),依据设计第 17 节判定清单 */
const V647_SHELLS = [
  "一致性多表数据一致性比对",
  "任务时长限制",
  "合理性单调递减递增",
  "每表规则集管理",
  "规则任务支持编辑分区信息",
  "Spark任务调参",
  "时效性两字段时间差校验",
  "时效性同字段时间差校验",
  "规则库支持自定义SQL模版",
  "内置规则增加规则项",
  "一个表支持多个规则任务",
  "产品名称修改",
  "合理性单表字段计算关系对比",
  "合理性多表字段大小计算对比",
  "报告字段维度范围选择",
  "控制每个规则开关",
  "控制规则开关影响任务运行",
];

// ─── 文件扫描 ───

function walk(dir: string, root: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, root, out);
    else out.push(p.slice(root.length + 1));
  }
}

function sha256Of(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function trackedFiles(root: string): Set<string> {
  const r = spawnSync("git", ["ls-files", "workspace"], { cwd: root, encoding: "utf8" });
  // 非 git 目录(如测试夹具)按全部未跟踪处理
  if (r.status !== 0) return new Set();
  return new Set(r.stdout.split("\n").filter(Boolean));
}

// ─── 单文件分类 ───

function classify(rel: string): Pick<MigrateOp, "action" | "dest" | "reason"> {
  // knowledge 历史备份:git 历史兜底,删
  if (rel.includes("_shared/knowledge/.history/") && rel.endsWith(".bak")) {
    return { action: "delete", reason: "knowledge .history 备份,git 兜底" };
  }

  const seg = rel.split("/");
  const fIdx = seg.indexOf("features");
  const inShared = rel.includes("workspace/dataAssets/_shared/");

  // v647 空壳 → 需业务确认
  if (fIdx >= 0 && seg[fIdx + 1] === "v6.4.7") {
    const dir = seg[fIdx + 2] ?? "";
    if (V647_SHELLS.some((s) => dir.includes(s))) {
      return { action: "confirm", reason: "v647 空壳,按用例覆盖逐项判定" };
    }
  }

  // inputs 旧命名归一
  const iIdx = seg.indexOf("inputs");
  if (fIdx >= 0 && iIdx > fIdx && seg.length > iIdx + 1) {
    const sub = seg[iIdx + 1];
    if (sub in INPUTS_RENAME) {
      const dest = [...seg.slice(0, iIdx + 1), INPUTS_RENAME[sub], ...seg.slice(iIdx + 2)].join(
        "/",
      );
      return { action: "move", dest, reason: `inputs/${sub} → inputs/${INPUTS_RENAME[sub]}` };
    }
    // inputs/ 根下的散文件 → attachments
    if (seg.length === iIdx + 2 && sub !== "snapshots" && sub !== "attachments") {
      const dest = [...seg.slice(0, iIdx + 1), "attachments", sub].join("/");
      return { action: "move", dest, reason: "inputs/ 散文件 → inputs/attachments/" };
    }
  }

  // cases/ 下的非用例产物散文件 → automation/scripts/(仅 feature 根级 cases/)
  const cIdx = seg.indexOf("cases");
  const isFeatureCases = fIdx >= 0 && seg[fIdx + 3] === "cases";
  if (isFeatureCases && cIdx > fIdx && seg.length === cIdx + 2) {
    const name = seg[cIdx + 1];
    const ext = name.split(".").pop() ?? "";
    if (!CASE_ARTIFACT_EXT.has(ext)) {
      const dest = [...seg.slice(0, cIdx), "automation", "scripts", name].join("/");
      return { action: "move", dest, reason: "cases/ 散脚本 → automation/scripts/" };
    }
    // archive 用例 md,T3 转换为 cases.yaml
    if (name === "archive.md" || name === "archive.draft.md") {
      return { action: "convert", reason: "archive.md → cases.yaml(T3 转换器)" };
    }
  }

  // analyses 归位:_shared/archive/audits → analyses/audit-*
  if (inShared && rel.includes("/_shared/archive/audits/")) {
    const rest = rel.split("/_shared/archive/audits/")[1];
    const dirName = rest.split("/")[0];
    const dest = `workspace/dataAssets/analyses/audit-${dirName}/${rest.slice(dirName.length + 1)}`;
    return { action: "move", dest, reason: "audits → analyses/audit-*" };
  }

  // hotfix 归位:_shared/archive/issues/<yyyymm>/<entry> → features/_hotfix/<yyyymm>-<slug>/cases/
  if (inShared && rel.includes("/_shared/archive/issues/")) {
    const rest = rel.split("/_shared/archive/issues/")[1];
    const parts = rest.split("/");
    const month = parts[0];
    if (parts.length >= 2 && /^\d{6}$/.test(month)) {
      const entry = parts[1];
      const isLooseMd = parts.length === 2 && entry.endsWith(".md");
      const slug = entry.replace(/^hotfix_/, "").replace(/\.md$/, "");
      const inner = isLooseMd ? "archive.md" : parts.slice(2).join("/");
      const dest = `workspace/dataAssets/features/_hotfix/${month}-${slug}/cases/${inner}`;
      return { action: "move", dest, reason: "issues → features/_hotfix/" };
    }
    return { action: "keep", reason: "issues 目录元文件(.gitkeep 等)" };
  }

  return { action: "keep", reason: "符合目标布局或不在本批处置范围" };
}

// ─── 计划构建 ───

/** 扫描 <root>/workspace,产出每个文件的处置 */
export function buildPlan(root: string): MigrateOp[] {
  const wsRoot = join(root, "workspace");
  const files: string[] = [];
  walk(wsRoot, root, files);
  const tracked = trackedFiles(root);
  return files.sort().map((rel) => {
    const c = classify(rel);
    return {
      ...c,
      src: rel,
      sha256: sha256Of(join(root, rel)),
      tracked: tracked.has(rel),
    };
  });
}

/** 目标路径冲突列表;非空则整体停止 */
export function checkConflicts(ops: MigrateOp[]): string[] {
  const byDest = new Map<string, string[]>();
  for (const op of ops) {
    if (!op.dest) continue;
    const srcs = byDest.get(op.dest) ?? [];
    srcs.push(op.src);
    byDest.set(op.dest, srcs);
  }
  const conflicts: string[] = [];
  for (const [dest, srcs] of byDest) {
    if (srcs.length > 1) conflicts.push(`${dest} <= ${srcs.join(", ")}`);
  }
  return conflicts;
}

/** 按内容哈希分组重复 PNG(每组 >=2 个相同文件) */
export function duplicatePngGroups(ops: MigrateOp[]): MigrateOp[][] {
  const pngs = ops.filter((o) => o.src.endsWith(".png"));
  const byHash = new Map<string, MigrateOp[]>();
  for (const op of pngs) {
    const g = byHash.get(op.sha256) ?? [];
    g.push(op);
    byHash.set(op.sha256, g);
  }
  return [...byHash.values()].filter((g) => g.length > 1);
}
