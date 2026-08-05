/**
 * Knowledge entry model — 四态(status)知识条目。
 * 磁盘格式:YAML frontmatter(title/type/tags/status/source/updated) + Markdown 正文,
 * 所有条目使用四态 status，不再读取旧 confidence frontmatter。
 */

/** 四态:verified 已确认;observed 单次观察;conflicting 与现有冲突;deprecated 已失效。 */
export type KnowledgeStatus = "verified" | "observed" | "conflicting" | "deprecated";

export const KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = [
  "verified",
  "observed",
  "conflicting",
  "deprecated",
];

export type KnowledgeType =
  | "term"
  | "overview"
  | "module"
  | "pitfall"
  | "site"
  | "standard"
  | "customer";

/** One knowledge entry; overview remains a project-level context document. */
export interface KnowledgeEntry {
  title: string;
  type: KnowledgeType;
  status: KnowledgeStatus;
  tags: string[];
  /** 证据来源(源码/DOM/用户明示). */
  source?: string;
  /** YYYY-MM-DD */
  updated: string;
  body: string;
  /** 客户编号(standard 类型用,决定文件写入 standards/<customer>/ 子目录). */
  customer?: string;
}

export function isKnowledgeStatus(s: string): s is KnowledgeStatus {
  return (KNOWLEDGE_STATUSES as readonly string[]).includes(s);
}
