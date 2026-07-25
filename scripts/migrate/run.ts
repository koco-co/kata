#!/usr/bin/env bun

/**
 * Migration runner (one-shot, T2). Default is --dry-run.
 *
 * Usage:
 *   bun scripts/migrate/run.ts                      # dry-run 全量计划
 *   bun scripts/migrate/run.ts --only <action> [--match <substr>] [--yes]
 *   bun scripts/migrate/run.ts --report duplicates|confirm
 *   bun scripts/migrate/run.ts --verify
 */

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, sep } from "node:path";
import { buildPlan, checkConflicts, duplicatePngGroups, type MigrateOp } from "./lib/plan.ts";

// ─── 参数解析 ───

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY = !flag("--yes");
const ONLY = opt("--only");
const MATCH = opt("--match");
const REPORT = opt("--report");
const VERIFY = flag("--verify");

const root = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim();
if (!root) throw new Error("not in a git repo");

// ─── 执行原语 ───

function git(args: string[]): void {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args[0]} failed: ${r.stderr}`);
}

/** tracked → git mv;untracked → fs 移动 */
function moveFile(op: MigrateOp): void {
  if (!op.dest) throw new Error(`move op missing dest: ${op.src}`);
  const src = `${root}/${op.src}`;
  const dest = `${root}/${op.dest}`;
  mkdirSync(dirname(dest), { recursive: true });
  if (op.tracked) git(["mv", "-f", op.src, op.dest]);
  else renameSync(src, dest);
}

function deleteFile(op: MigrateOp): void {
  if (op.tracked) git(["rm", "-q", op.src]);
  else rmSync(`${root}/${op.src}`);
}

/** 文本文件中做字面替换(仅 .md/.yaml/.ts/.csv) */
function rewriteRefs(from: string, to: string, scope: string): number {
  let hits = 0;
  const exts = new Set(["md", "yaml", "ts", "csv"]);
  const stack = [`${root}/${scope}`];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) break;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${ent.name}`;
      if (ent.isDirectory()) {
        stack.push(p);
        continue;
      }
      const ext = p.split(".").pop() ?? "";
      if (!exts.has(ext)) continue;
      const content = readFileSync(p, "utf8");
      if (!content.includes(from)) continue;
      writeFileSync(p, content.replaceAll(from, to));
      hits++;
    }
  }
  return hits;
}

// ─── 动作执行 ───

function execMoves(ops: MigrateOp[]): void {
  for (const op of ops) {
    if (!op.dest) throw new Error(`move op missing dest: ${op.src}`);
    if (existsSync(`${root}/${op.dest}`)) throw new Error(`dest exists, stop: ${op.dest}`);
    moveFile(op);
    console.log(`move ${op.src} -> ${op.dest}`);
  }
  // inputs 旧命名引用重写(prd.md / metadata.yaml 里的 inputs/<old>/ 形式)
  const renamed = [
    ["inputs/lanhu-snapshots", "inputs/snapshots"],
    ["inputs/images", "inputs/snapshots"],
    ["inputs/reference-docs", "inputs/attachments"],
    ["inputs/legacy", "inputs/attachments"],
  ] as const;
  for (const [from, to] of renamed) {
    const n = rewriteRefs(from, to, "workspace/dataAssets");
    if (n) console.log(`refs ${from} -> ${to}: ${n} file(s)`);
  }
}

function execDeletes(ops: MigrateOp[]): void {
  for (const op of ops) {
    deleteFile(op);
    console.log(`delete ${op.src}`);
  }
}

/** PNG 去重:每组保留首份进 _shared/snapshots/ 池,其余删除并重写引用 */
function execMerges(ops: MigrateOp[]): void {
  const groups = duplicatePngGroups(ops);
  const pool = "workspace/dataAssets/_shared/snapshots";
  mkdirSync(`${root}/${pool}`, { recursive: true });
  let removed = 0;
  for (const g of groups) {
    const sorted = [...g].sort((a, b) => a.src.localeCompare(b.src));
    const master = sorted[0];
    const base = baseName(master.src);
    const poolName = `${master.sha256.slice(0, 12)}-${base}`;
    const poolRel = `${pool}/${poolName}`;
    if (!existsSync(`${root}/${poolRel}`)) {
      moveFile({ ...master, dest: poolRel });
      console.log(`pool  ${master.src} -> ${poolRel}`);
    }
    for (const dup of sorted.slice(1)) {
      // 重写该副本在其 feature 内的引用,再删除
      const refsBefore = refOccurrences(dup, "workspace/dataAssets");
      for (const refFile of refsBefore) {
        const to = relative(dirname(refFile), `${root}/${poolRel}`);
        rewriteFile(refFile, dup, to.split(sep).join("/"));
      }
      deleteFile(dup);
      removed++;
      console.log(`dedup ${dup.src} (== ${poolName})`);
    }
  }
  console.log(`duplicates removed: ${removed}, pool masters: ${groups.length}`);
}

/** 找出引用 dup 文件名的文本文件(同 feature 内,按 basename 粗筛) */
function refOccurrences(dup: MigrateOp, scope: string): string[] {
  const base = baseName(dup.src);
  const featPrefix = dup.src.split("/").slice(0, 5).join("/");
  const r = spawnSync(
    "grep",
    ["-rl", "--include=*.md", "--include=*.yaml", base, `${root}/${scope}`],
    {
      encoding: "utf8",
    },
  );
  return r.stdout
    .split("\n")
    .filter(Boolean)
    .filter((f) => f.includes(featPrefix));
}

function rewriteFile(absFile: string, dup: MigrateOp, toRel: string): void {
  const base = baseName(dup.src);
  const content = readFileSync(absFile, "utf8");
  // 引用形式:inputs/<subdir>/<base>(feature 内相对路径)
  const updated = content.replaceAll(new RegExp(`inputs/[\\w-]+/${escapeRe(base)}`, "g"), toRel);
  if (updated !== content) {
    writeFileSync(absFile, updated);
    console.log(`refs  ${relative(root, absFile)}: inputs/*/${base} -> ${toRel}`);
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 路径末段;空路径直接报错(迁移脚本宁停勿错) */
function baseName(p: string): string {
  const b = p.split("/").pop();
  if (!b) throw new Error(`empty basename: ${p}`);
  return b;
}

// ─── 报告与验证 ───

function printSummary(ops: MigrateOp[]): void {
  const byAction = new Map<string, number>();
  for (const op of ops) byAction.set(op.action, (byAction.get(op.action) ?? 0) + 1);
  console.log(`files scanned: ${ops.length}`);
  for (const [a, n] of [...byAction.entries()].sort()) console.log(`  ${a}: ${n}`);
  const conflicts = checkConflicts(ops);
  if (conflicts.length) {
    console.log(`\nCONFLICTS (${conflicts.length}):`);
    for (const c of conflicts) console.log(`  ${c}`);
  } else {
    console.log("conflicts: none");
  }
}

function reportDuplicates(ops: MigrateOp[]): void {
  const groups = duplicatePngGroups(ops);
  let extra = 0;
  for (const g of groups) {
    extra += g.length - 1;
    console.log(`group ${g[0].sha256.slice(0, 12)} (${g.length}x):`);
    for (const op of g) console.log(`  ${op.src}`);
  }
  console.log(`\ngroups: ${groups.length}, redundant copies: ${extra}`);
}

function reportConfirm(ops: MigrateOp[]): void {
  const dirs = new Map<string, number>();
  for (const op of ops.filter((o) => o.action === "confirm")) {
    const dir = op.src.split("/").slice(0, 5).join("/");
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
  }
  for (const [d, n] of [...dirs.entries()].sort()) console.log(`${n.toString().padStart(4)}  ${d}`);
  console.log(`\nconfirm dirs: ${dirs.size}`);
}

/** 基线对账:每个基线文件必须有处置或属于已知磁盘垃圾 */
function verify(ops: MigrateOp[]): void {
  const baseline = JSON.parse(readFileSync(`${root}/scripts/migrate/baseline.json`, "utf8"));
  const debris = [
    /\.DS_Store$/, // 磁盘垃圾,主工作树清理
    /\/\.(temp|runs|debug)\//, // 运行时证据变体,主工作树清理
    /\/\.process\//, // T3 证据内联后删除,本次保留
    /\/cases\/tmp\//, // 临时目录
    /^features\//, // 寄生错位树
    /202607-v6411-ui-sort-qzmkxjrp/, // 游离 hash 目录
    /_shared\/env\//, // 本地环境配置,保持 ignore
    /性能测试方案\/.*\.(log|curl)$/, // 运行证据
  ];
  const covered = new Set<string>();
  for (const op of ops) {
    covered.add(op.src);
    if (op.dest) covered.add(op.dest);
  }
  const unaccounted: string[] = [];
  for (const f of baseline.files as string[]) {
    const rel = `workspace/${f}`;
    if (covered.has(rel)) continue;
    if (debris.some((re) => re.test(rel))) continue;
    unaccounted.push(rel);
  }
  if (unaccounted.length) {
    console.log(`UNACCOUNTED (${unaccounted.length}):`);
    for (const f of unaccounted.slice(0, 30)) console.log(`  ${f}`);
    process.exitCode = 1;
    return;
  }
  // 旧命名不得有残留引用
  const stale = spawnSync(
    "grep",
    [
      "-rl",
      "--include=*.md",
      "--include=*.yaml",
      "-E",
      "inputs/(lanhu-snapshots|images|reference-docs|legacy)",
      `${root}/workspace/dataAssets`,
    ],
    { encoding: "utf8" },
  ).stdout.trim();
  if (stale) {
    console.log(`STALE REFS:\n${stale}`);
    process.exitCode = 1;
    return;
  }
  console.log(`verify OK: ${baseline.files.length} baseline files all accounted`);
}

// ─── 主流程 ───

const ops = buildPlan(root);
const selected = ops.filter(
  (o) =>
    (!ONLY || o.action === ONLY) && (!MATCH || o.reason.includes(MATCH) || o.src.includes(MATCH)),
);

if (VERIFY) {
  verify(ops);
} else if (REPORT === "duplicates") {
  reportDuplicates(ops);
} else if (REPORT === "confirm") {
  reportConfirm(ops);
} else if (!ONLY) {
  printSummary(ops);
} else if (DRY) {
  printSummary(selected);
  if (ONLY === "merge") reportDuplicates(ops);
  if (ONLY === "confirm") reportConfirm(ops);
  for (const op of selected.slice(0, 200)) {
    console.log(`${op.action} ${op.src}${op.dest ? ` -> ${op.dest}` : ""}  [${op.reason}]`);
  }
  if (selected.length > 200) console.log(`... and ${selected.length - 200} more`);
} else {
  const conflicts = checkConflicts(selected);
  if (conflicts.length) {
    console.log(`conflicts, stop:\n${conflicts.join("\n")}`);
    process.exit(1);
  }
  if (ONLY === "move") execMoves(selected);
  else if (ONLY === "delete") execDeletes(selected);
  else if (ONLY === "merge") execMerges(ops);
  else console.log(`action "${ONLY}" has no executor in T2 (convert→T3, confirm→人工)`);
}
