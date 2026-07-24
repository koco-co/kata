/**
 * plugins/zentao/parse.ts — 禅道 .json 响应解析
 *
 * 第一阶段：从 fetch.ts 迁入的纯解析助手（行为不变）。
 * 第二阶段（Task 3）：在此基础上新增富结构解析 parseBugPayload。
 */

import { htmlFragmentToMarkdown } from "./html-md.ts";

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

// ─── 富结构类型 ──────────────────────────────────────────────────────────────
/** Human-readable bug fields with user/build codes resolved to display names. */
export interface BugFields {
  product: string | null;
  issue_app: string | null;
  module: string | null;
  type: string | null;
  severity: string | null;
  priority: number | null;
  status: string | null;
  confirmed: boolean | null;
  keywords: string | null;
  customer: string | null;
  env: string | null;
  engine: string | null;
  resolved_build: string | null;
  tech_reason: string | null;
  reason: string | null;
  found_by: string | null;
  opened_by: string | null;
  opened_date: string | null;
  resolved_by: string | null;
  resolved_date: string | null;
  assigned_to: string | null;
  resolution: string | null;
  fix_branch: string | null;
  git_projects: string[];
}

/** A single bug history entry with its comment cleaned to markdown. */
export interface BugAction {
  date: string;
  actor: string;
  action: string;
  comment_md: string;
}

/** Rich, hotfix-ready bug structure parsed from a ZenTao bug-view response. */
export interface RichBug {
  bug_id: number | null;
  title: string | null;
  fields: BugFields;
  sections: { steps_md: string; resolution_md: string };
  history: BugAction[];
}

type StrMap = Record<string, string>;
type AnyMap = Record<string, unknown>;

function str(v: unknown): string | null {
  if (typeof v === "string") return v.length > 0 ? v : null;
  if (typeof v === "number") return String(v);
  return null;
}

function resolveName(code: unknown, map: StrMap): string | null {
  const c = str(code);
  if (c === null) return null;
  const name = map[c];
  return name ? name.split("|")[0] : c;
}

function gitProjects(bug: AnyMap): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const v = str(bug[`gitProject${i}`]);
    if (v) out.push(v);
  }
  return out;
}

function pickFixBranch(bug: AnyMap, resolutionMd: string): string | null {
  // 1. gitBranch1~6
  for (let i = 1; i <= 6; i++) {
    const v = str(bug[`gitBranch${i}`]);
    if (v) return v;
  }
  // 2. gitProjectBranch JSON：{"repo":["branch"]}
  const gpb = str(bug.gitProjectBranch);
  if (gpb) {
    try {
      const obj = JSON.parse(gpb) as Record<string, string[]>;
      for (const arr of Object.values(obj)) {
        if (Array.isArray(arr) && arr[0]) return arr[0];
      }
    } catch {
      // ignore
    }
  }
  // 3. 解决叙述里的「修复分支：xxx」
  const m = resolutionMd.match(/修复分支[:：]\s*([^\s，。;；]+)/);
  if (m?.[1]) return m[1];
  // 4. 兜底
  return detectFixBranch([resolutionMd, str(bug.steps), str(bug.title)]);
}

function extractResolutionNarrative(actions: AnyMap): string {
  const parts: string[] = [];
  for (const a of Object.values(actions)) {
    const act = a as AnyMap;
    const comment = str(act.comment);
    if (!comment) continue;
    if (act.action === "resolved" || act.action === "closed" || /问题原因|解决方案/.test(comment)) {
      parts.push(htmlFragmentToMarkdown(comment));
    }
  }
  return parts.join("\n\n");
}

function buildHistory(actions: AnyMap, users: StrMap): BugAction[] {
  return Object.values(actions)
    .map((a) => {
      const act = a as AnyMap;
      return {
        date: str(act.date) ?? "",
        actor: resolveName(act.actor, users) ?? "",
        action: str(act.action) ?? "",
        comment_md: htmlFragmentToMarkdown(str(act.comment) ?? ""),
      };
    })
    .sort((x, y) => x.date.localeCompare(y.date));
}

/**
 * Parse a zentao bug-view JSON response into a rich, hotfix-ready structure.
 * Returns null for login HTML or unparseable input.
 */
export function parseBugPayload(rawJsonText: string): RichBug | null {
  let outer: unknown;
  try {
    outer = JSON.parse(rawJsonText);
  } catch {
    return null;
  }
  if (typeof outer !== "object" || outer === null) return null;
  const o = outer as AnyMap;
  if (o.status === "fail") return null;

  let data: AnyMap;
  if (typeof o.data === "string") {
    try {
      data = JSON.parse(o.data) as AnyMap;
    } catch {
      return null;
    }
  } else if (o.data && typeof o.data === "object") {
    data = o.data as AnyMap;
  } else {
    data = o;
  }

  const bug = (data.bug ?? data) as AnyMap;
  if (!bug || typeof bug !== "object" || str(bug.id) === null) return null;

  const users = (data.users ?? {}) as StrMap;
  const builds = (data.builds ?? {}) as StrMap;
  const actions = (data.actions ?? {}) as AnyMap;

  const steps_md = htmlFragmentToMarkdown(str(bug.steps) ?? "");
  const resolution_md = extractResolutionNarrative(actions);

  const confirmedRaw = str(bug.confirmed);
  const confirmed = confirmedRaw === "1" ? true : confirmedRaw === "0" ? false : null;

  const fields: BugFields = {
    product: str(data.productName),
    issue_app: str(bug.issueApp),
    module: str(data.bugModule),
    type: str(bug.type),
    severity: parseSeverity(bug.severity),
    priority: parsePriority(bug.pri ?? bug.priority),
    status: str(bug.status)?.toLowerCase() ?? null,
    confirmed,
    keywords: str(bug.keywords),
    customer: str(bug.customer),
    env: str(bug.env),
    engine: str(bug.engine),
    resolved_build: resolveName(bug.resolvedBuild, builds),
    tech_reason: str(bug.techReason),
    reason: str(bug.reason),
    found_by: str(bug.founded),
    opened_by: resolveName(bug.openedBy, users),
    opened_date: str(bug.openedDate),
    resolved_by: resolveName(bug.resolvedBy, users),
    resolved_date: str(bug.resolvedDate),
    assigned_to: resolveName(bug.assignedTo, users),
    resolution: str(bug.resolution),
    fix_branch: pickFixBranch(bug, resolution_md),
    git_projects: gitProjects(bug),
  };

  return {
    bug_id: parsePriority(bug.id),
    title: str(bug.title),
    fields,
    sections: { steps_md, resolution_md },
    history: buildHistory(actions, users),
  };
}
