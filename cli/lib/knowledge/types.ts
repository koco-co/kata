/**
 * Knowledge entry model — 四态(status)知识条目。
 * 磁盘格式:YAML frontmatter(title/type/tags/status/source/updated) + Markdown 正文,
 * 与既有 knowledge 库同构;旧条目的 confidence 字段读取时映射为 status。
 */

/** 四态:verified 已确认;observed 单次观察;conflicting 与现有冲突;deprecated 已失效。 */
export type KnowledgeStatus = "verified" | "observed" | "conflicting" | "deprecated";

export const KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = [
  "verified",
  "observed",
  "conflicting",
  "deprecated",
];

export type KnowledgeType = "term" | "overview" | "module" | "pitfall" | "site";

/** One knowledge entry (file-per-entry types; term/overview 由 terms.md/overview.md 承载)。 */
export interface KnowledgeEntry {
  title: string;
  type: KnowledgeType;
  status: KnowledgeStatus;
  tags: string[];
  /** 证据来源(源码/DOM/用户明示),可缺省 */
  source?: string;
  /** YYYY-MM-DD */
  updated: string;
  body: string;
}

/** 旧 confidence 字段 → status 映射:high→verified,其余→observed。 */
export function statusFromConfidence(confidence?: string): KnowledgeStatus {
  return confidence === "high" ? "verified" : "observed";
}

export function isKnowledgeStatus(s: string): s is KnowledgeStatus {
  return (KNOWLEDGE_STATUSES as readonly string[]).includes(s);
}
