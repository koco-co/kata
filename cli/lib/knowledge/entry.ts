/** knowledge read/write for file-per-entry knowledge records. */

import { todayIso } from "../knowledge.ts";
import { locateProject } from "../workspace-locator.ts";
import { readEntries, readEntryByTitle, readOverview, writeEntry } from "./store.ts";
import { isKnowledgeStatus, type KnowledgeStatus, type KnowledgeType } from "./types.ts";

const ENTRY_TYPES = ["term", "module", "pitfall", "site"];

export function runReadEntries(opts: {
  project: string;
  module?: string;
  keyword?: string;
  type?: string;
  status?: string;
  json: boolean;
}): void {
  const paths = locateProject(opts.project);
  const types = opts.type ? opts.type.split(",").map((t) => t.trim()) : undefined;
<<<<<<< HEAD
  if (opts.status?.trim() === "all") {
    opts.status = "verified,observed,conflicting,deprecated";
  }
=======
>>>>>>> origin/main
  const requestedStatuses = opts.status
    ?.split(",")
    .map((s) => s.trim())
    .filter((s): s is KnowledgeStatus => isKnowledgeStatus(s));
  if (opts.status && requestedStatuses?.length !== opts.status.split(",").length) {
    throw new Error("非法 --status；须为 verified | observed | conflicting | deprecated");
  }
<<<<<<< HEAD
  const statuses = requestedStatuses ?? (["verified"] as KnowledgeStatus[]);
=======
  const statuses =
    requestedStatuses ?? (["verified", "observed", "conflicting"] as KnowledgeStatus[]);
>>>>>>> origin/main
  const entries = readEntries(paths, {
    module: opts.module,
    keyword: opts.keyword,
    types,
    statuses,
  });
  const overview = readOverview(paths);
  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify({ project: opts.project, count: entries.length, entries, overview }, null, 2)}\n`,
    );
    return;
  }
  if (entries.length === 0 && !overview) {
    process.stdout.write("(无命中条目)\n");
    return;
  }
  for (const e of entries) {
    const tags = e.tags.length ? ` | tags: ${e.tags.join(", ")}` : "";
    const source = e.source ? ` | source: ${e.source}` : "";
    process.stdout.write(
      `## [${e.status}] ${e.title}\ntype: ${e.type} | updated: ${e.updated}${tags}${source}\n\n${e.body.trim()}\n\n`,
    );
  }
  if (overview) process.stdout.write(`## [context] overview.md\n\n${overview.trim()}\n\n`);
}

export function runWriteEntry(opts: {
  project: string;
  type: string;
  status: string;
  title: string;
  body: string;
  tags?: string;
  source?: string;
  confirmed: boolean;
}): void {
  if (!ENTRY_TYPES.includes(opts.type)) throw new Error(`类型 ${opts.type} 不是独立条目`);
  if (!isKnowledgeStatus(opts.status)) {
    throw new Error(
      `非法 status: ${opts.status};须为 verified | observed | conflicting | deprecated`,
    );
  }
  if (!opts.source?.trim()) throw new Error("知识条目必须提供 --source，禁止写入无来源事实");

  const incoming = {
    title: opts.title,
    type: opts.type as KnowledgeType,
    status: opts.status as KnowledgeStatus,
    tags: opts.tags
      ? opts.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
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
      process.stdout.write(
        `${JSON.stringify({ pending: true, conflict: true, title: incoming.title, existing, incoming }, null, 2)}\n`,
      );
      return;
    }
    entry = {
      ...incoming,
      tags: [...new Set([...existing.tags, ...incoming.tags])],
      body:
        oldBody === newBody
          ? existing.body
          : newBody.includes(oldBody)
            ? incoming.body
            : `${existing.body.trim()}\n\n${incoming.body.trim()}`,
    };
    action = compatible ? "merge" : "replace-confirmed";
  }
  const file = writeEntry(paths, entry);
  process.stdout.write(
    `${JSON.stringify({ action, file, status: entry.status, title: entry.title }, null, 2)}\n`,
  );
}
