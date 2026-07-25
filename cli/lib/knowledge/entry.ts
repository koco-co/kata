/**
 * knowledge read/write 命令实现 — 四态条目的统一检索与写入。
 * term/overview 聚合文件不走这里(见 write.ts 旧路径)。
 */

import { todayIso } from "../knowledge.ts";
import { locateProject } from "../workspace-locator.ts";
import { readEntries, writeEntry } from "./store.ts";
import { isKnowledgeStatus, type KnowledgeStatus, type KnowledgeType } from "./types.ts";

const ENTRY_TYPES = ["module", "pitfall", "site"];

export function runReadEntries(opts: {
  project: string;
  module?: string;
  keyword?: string;
  type?: string;
  json: boolean;
}): void {
  const types = opts.type ? opts.type.split(",").map((t) => t.trim()) : undefined;
  const entries = readEntries(locateProject(opts.project), {
    module: opts.module,
    keyword: opts.keyword,
    types,
  });
  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify({ project: opts.project, count: entries.length, entries }, null, 2)}\n`,
    );
    return;
  }
  if (entries.length === 0) {
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
  if (!ENTRY_TYPES.includes(opts.type)) {
    process.stderr.write(
      `[knowledge] 类型 ${opts.type} 不是独立条目;term/overview 请用 --content JSON 写入\n`,
    );
    process.exit(1);
  }
  if (!isKnowledgeStatus(opts.status)) {
    process.stderr.write(
      `[knowledge] 非法 status: ${opts.status};须为 verified | observed | conflicting | deprecated\n`,
    );
    process.exit(1);
  }

  // observed 是单次观察:未经用户确认不落盘,由调用方确认后加 --confirmed 重跑
  if (opts.status === "observed" && !opts.confirmed) {
    process.stdout.write(
      `${JSON.stringify(
        {
          pending: true,
          status: opts.status,
          title: opts.title,
          reason: "observed 为单次观察,需用户确认;确认后加 --confirmed 重跑",
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const entry = {
    title: opts.title,
    type: opts.type as KnowledgeType,
    status: opts.status as KnowledgeStatus,
    tags: opts.tags
      ? opts.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    source: opts.source,
    updated: todayIso(),
    body: opts.body,
  };
  const file = writeEntry(locateProject(opts.project), entry);
  process.stdout.write(
    `${JSON.stringify({ action: "write", file, status: entry.status, title: entry.title }, null, 2)}\n`,
  );
}
