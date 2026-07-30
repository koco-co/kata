/** knowledge read/write for file-per-entry knowledge records. */

import { todayIso } from "../knowledge.ts";
import { locateProject } from "../workspace-locator.ts";
import { readEntries, readEntryByTitle, readOverview, writeEntry } from "./store.ts";
import {
  isKnowledgeStatus,
  type KnowledgeEntry,
  type KnowledgeStatus,
  type KnowledgeType,
} from "./types.ts";

const ENTRY_TYPES = ["term", "module", "pitfall", "site"];

/** title 进 frontmatter 单行,tags 进 `[a, b]` 列表;换行/逗号/方括号会破坏磁盘格式。 */
function assertLegalEntryFields(title: string, tags: string[]): void {
  if (!title.trim() || /[\r\n]/.test(title)) {
    throw new Error("非法 title:不能为空且不得包含换行");
  }
  const bad = tags.filter((t) => /[\r\n,[\]]/.test(t));
  if (bad.length > 0) {
    throw new Error(`非法 tags:${bad.join(", ")}(不得包含逗号/方括号/换行)`);
  }
}

export function runReadEntries(opts: {
  project: string;
  module?: string;
  keyword?: string;
  type?: string;
  status?: string;
}): {
  project: string;
  count: number;
  entries: KnowledgeEntry[];
  overview: string | null;
} {
  const paths = locateProject(opts.project);
  const types = opts.type ? opts.type.split(",").map((t) => t.trim()) : undefined;
  const invalidTypes = types?.filter((t) => !ENTRY_TYPES.includes(t)) ?? [];
  if (invalidTypes.length > 0) {
    throw new Error(`非法 --type: ${invalidTypes.join(", ")};须为 ${ENTRY_TYPES.join(" | ")}`);
  }
  const statusFilter =
    opts.status?.trim() === "all" ? "verified,observed,conflicting,deprecated" : opts.status;
  const requestedStatuses = statusFilter
    ?.split(",")
    .map((s) => s.trim())
    .filter((s): s is KnowledgeStatus => isKnowledgeStatus(s));
  if (statusFilter && requestedStatuses?.length !== statusFilter.split(",").length) {
    throw new Error("非法 --status；须为 verified | observed | conflicting | deprecated");
  }
  const statuses = requestedStatuses ?? (["verified"] as KnowledgeStatus[]);
  const entries = readEntries(paths, {
    module: opts.module,
    keyword: opts.keyword,
    types,
    statuses,
  });
  const overview = readOverview(paths);
  return { project: opts.project, count: entries.length, entries, overview };
}

export function formatKnowledgeRead(result: ReturnType<typeof runReadEntries>): string {
  if (result.entries.length === 0 && !result.overview) return "(无命中条目)\n";
  let output = "";
  for (const e of result.entries) {
    const tags = e.tags.length ? ` | tags: ${e.tags.join(", ")}` : "";
    const source = e.source ? ` | source: ${e.source}` : "";
    output += `## [${e.status}] ${e.title}\ntype: ${e.type} | updated: ${e.updated}${tags}${source}\n\n${e.body.trim()}\n\n`;
  }
  if (result.overview) {
    output += `## [context] overview.md\n\n${result.overview.trim()}\n\n`;
  }
  return output;
}

export type KnowledgeEntryWriteResult =
  | {
      pending: true;
      conflict: true;
      title: string;
      existing: KnowledgeEntry;
      incoming: KnowledgeEntry;
    }
  | {
      pending: true;
      promotion: true;
      title: string;
      hint: string;
      existing: KnowledgeEntry;
      incoming: KnowledgeEntry;
    }
  | {
      action: "write" | "merge" | "replace-confirmed";
      file: string;
      status: KnowledgeStatus;
      title: string;
    };

export function runWriteEntry(opts: {
  project: string;
  type: string;
  status: string;
  title: string;
  body: string;
  tags?: string;
  source?: string;
  confirmed: boolean;
}): KnowledgeEntryWriteResult {
  if (!ENTRY_TYPES.includes(opts.type)) throw new Error(`类型 ${opts.type} 不是独立条目`);
  if (!isKnowledgeStatus(opts.status)) {
    throw new Error(
      `非法 status: ${opts.status};须为 verified | observed | conflicting | deprecated`,
    );
  }
  if (!opts.source?.trim()) throw new Error("知识条目必须提供 --source，禁止写入无来源事实");

  const tags = opts.tags
    ? opts.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];
  assertLegalEntryFields(opts.title, tags);

  const incoming: KnowledgeEntry = {
    title: opts.title,
    type: opts.type as KnowledgeType,
    status: opts.status as KnowledgeStatus,
    tags,
    source: opts.source.trim(),
    updated: todayIso(),
    body: opts.body,
  };
  const paths = locateProject(opts.project);
  const existing = readEntryByTitle(paths, incoming.type, incoming.title);
  let entry = incoming;
  let action = "write";
  if (existing) {
    const oldBody = existing.body.trim();
    const newBody = incoming.body.trim();
    const compatible =
      oldBody === newBody || oldBody.includes(newBody) || newBody.includes(oldBody);
    if (!compatible && !opts.confirmed) {
      return { pending: true, conflict: true, title: incoming.title, existing, incoming };
    }
    if (existing.status === "observed" && incoming.status === "verified" && !opts.confirmed) {
      return {
        pending: true,
        promotion: true,
        title: incoming.title,
        hint: "observed→verified 属人工确认升级,请加 --confirmed",
        existing,
        incoming,
      };
    }
    entry = {
      ...incoming,
      tags: [...new Set([...existing.tags, ...incoming.tags])],
      body:
        oldBody === newBody || oldBody.includes(newBody)
          ? existing.body
          : newBody.includes(oldBody)
            ? incoming.body
            : `${existing.body.trim()}\n\n${incoming.body.trim()}`,
    };
    action = compatible ? "merge" : "replace-confirmed";
  }
  const file = writeEntry(paths, entry);
  return {
    action: action as "write" | "merge" | "replace-confirmed",
    file,
    status: entry.status,
    title: entry.title,
  };
}
