/**
 * knowledge-guard.ts — knowledge write 侧防护层(仅供 knowledge/write.ts 使用)。
 *
 * 提供三项能力：
 * 1. 冲突检测（overview section replace）
 * 2. 快照（写入前保存原文件到 .history/）
 * 3. 审计日志（.audit.jsonl 每行一条 JSON）
 *
 * 不可变：所有函数接受参数返回新值，不在原地修改。
 */

import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { knowledgeDir } from "./knowledge-paths.ts";

// ── 类型 ────────────────────────────────────────────────────────────────────

export type ConflictSeverity = "block" | "warn";

export interface Conflict {
  severity: ConflictSeverity;
  type: "term" | "overview" | "body";
  reason: string;
  existing?: string;
  incoming?: string;
}

export interface AuditRecord {
  timestamp: string;
  action: "write" | "update" | "rollback";
  type?: string;
  file: string;
  before_hash: string;
  after_hash: string;
  snapshot: string;
  confidence?: string;
  confirmed: boolean;
  forced: boolean;
}

const AUDIT_FILE = ".audit.jsonl";
const HISTORY_DIR = ".history";

// ── 冲突检测 ────────────────────────────────────────────────────────────────

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * overview section 冲突：mode=replace 会覆盖已存在的非空 section。
 */
export function detectOverviewConflict(
  existingBody: string,
  section: string,
  incomingBody: string,
  mode: "append" | "replace",
): Conflict | null {
  if (mode !== "replace") return null;

  const lines = existingBody.split("\n");
  const headingRe = new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`);
  let startIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (headingRe.test(lines[i])) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return null;

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i += 1) {
    if (/^#{1,2}\s+/.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  const existingSection = lines
    .slice(startIdx + 1, endIdx)
    .join("\n")
    .trim();
  if (!existingSection) return null;
  if (existingSection === incomingBody.trim()) return null;

  return {
    severity: "block",
    type: "overview",
    reason: `概览 section "${section}" 已存在不同内容（mode=replace 将覆盖）`,
    existing: existingSection.slice(0, 200),
    incoming: incomingBody.slice(0, 200),
  };
}

// ── 快照 + 审计 ─────────────────────────────────────────────────────────────

function shortHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

function todayStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

/**
 * 把原文件内容保存到 .history/，返回快照文件名（相对 .history/）。
 * 若原内容为空（新建文件），返回空串，无需回滚点。
 */
export function saveSnapshot(
  project: string,
  absTargetPath: string,
  beforeContent: string,
): string {
  if (!beforeContent) return "";
  const kdir = knowledgeDir(project);
  const historyDir = join(kdir, HISTORY_DIR);
  mkdirSync(historyDir, { recursive: true });

  const rel = absTargetPath.startsWith(kdir) ? absTargetPath.slice(kdir.length + 1) : absTargetPath;
  const flat = rel.replace(/[\\/]/g, "__");
  const snapshotName = `${todayStamp()}__${flat}__${shortHash(beforeContent)}.bak`;
  writeFileSync(join(historyDir, snapshotName), beforeContent);
  return snapshotName;
}

export function appendAudit(project: string, record: AuditRecord): void {
  const kdir = knowledgeDir(project);
  mkdirSync(kdir, { recursive: true });
  appendFileSync(join(kdir, AUDIT_FILE), `${JSON.stringify(record)}\n`);
}

export function buildAuditRecord(params: {
  action: AuditRecord["action"];
  type?: string;
  file: string;
  before: string;
  after: string;
  snapshot: string;
  confidence?: string;
  confirmed: boolean;
  forced: boolean;
}): AuditRecord {
  return {
    timestamp: new Date().toISOString(),
    action: params.action,
    type: params.type,
    file: params.file,
    before_hash: params.before ? shortHash(params.before) : "",
    after_hash: params.after ? shortHash(params.after) : "",
    snapshot: params.snapshot,
    confidence: params.confidence,
    confirmed: params.confirmed,
    forced: params.forced,
  };
}
