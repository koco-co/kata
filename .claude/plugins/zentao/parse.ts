/**
 * plugins/zentao/parse.ts — 禅道 .json 响应解析
 *
 * 第一阶段：从 fetch.ts 迁入的纯解析助手（行为不变）。
 * 第二阶段（Task 3）：在此基础上新增富结构解析 parseBugPayload。
 */

// ─── 修复分支识别 ───────────────────────────────────────────────────────────
const HOTFIX_PATTERN = /hotfix[_/-][\w./-]+/gi;
const BRANCH_PATTERN = /(?:branch|分支)[:\s]*([^\s,;，；]+)/gi;

/**
 * Find a fix branch name among candidate strings.
 * Prefers `hotfix_` patterns, then falls back to generic branch mentions.
 */
export function detectFixBranch(candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hotfixMatches = candidate.match(HOTFIX_PATTERN);
    if (hotfixMatches && hotfixMatches.length > 0) return hotfixMatches[0];
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const branchMatches = candidate.matchAll(BRANCH_PATTERN);
    for (const m of branchMatches) {
      if (m[1]) return m[1];
    }
  }
  return null;
}

// ─── 原始 payload 解包 ───────────────────────────────────────────────────────
/** Raw ZenTao bug fields after unwrapping the API response envelope. */
export interface RawBugData {
  title?: string;
  severity?: string;
  pri?: number;
  priority?: number;
  status?: string;
  resolvedBuild?: string;
  resolution?: string;
  assignedTo?: string;
  openedBy?: string;
  resolvedBy?: string;
  product?: string | number;
  module?: string | number;
  productName?: string;
  moduleName?: string;
  steps?: string;
  comment?: string;
  comments?: Array<{ content?: string; text?: string }>;
  [key: string]: unknown;
}

function unwrapZentaoPayload(payload: unknown): RawBugData | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === "string") {
    try {
      return unwrapZentaoPayload(JSON.parse(payload));
    } catch {
      return null;
    }
  }
  if (typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (data.bug !== undefined) return unwrapZentaoPayload(data.bug);
  if (data.data !== undefined) return unwrapZentaoPayload(data.data);
  return data as RawBugData;
}

/** Parse a ZenTao bug-view response text into raw bug fields, or null if unparseable. */
export function parseZentaoResponseText(text: string): RawBugData | null {
  try {
    return unwrapZentaoPayload(JSON.parse(text));
  } catch {
    return null;
  }
}

// ─── 字段归一 ────────────────────────────────────────────────────────────────
/** Normalize a ZenTao severity code or string into a canonical level. */
export function parseSeverity(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const s = String(raw).toLowerCase();
  if (s === "1" || s === "fatal" || s === "critical") return "critical";
  if (s === "2" || s === "serious" || s === "major") return "major";
  if (s === "3" || s === "normal" || s === "average") return "normal";
  if (s === "4" || s === "minor" || s === "small") return "minor";
  return s;
}

/** Parse a ZenTao priority value into a number, or null if not numeric. */
export function parsePriority(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}
