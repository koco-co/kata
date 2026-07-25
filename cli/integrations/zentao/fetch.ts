#!/usr/bin/env bun
/**
 * plugins/zentao/fetch.ts — 禅道 Bug 抓取器（编排 + CLI）
 *
 * Usage:
 *   bun run plugins/zentao/fetch.ts --bug-id 151858 --output workspace/<project>/.temp/zentao
 *   bun run plugins/zentao/fetch.ts --url "http://zenpms.dtstack.cn/zentao/bug-view-151858.html" --output .temp/zentao
 *   bun run plugins/zentao/fetch.ts --help
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv, initEnv } from "../../lib/env.ts";

import { parseBugPayload } from "./parse.ts";
import { type FetchFn, fetchAuthedBugJson, readCookie, type ZentaoCreds } from "./session.ts";

// re-export 供现有测试与外部复用
export { detectFixBranch, parseZentaoResponseText } from "./parse.ts";

// ─── 类型定义 ────────────────────────────────────────────────────────────────
interface ErrorOutput {
  error: string;
  hint?: string;
  partial?: boolean;
}

interface PartialBugOutput {
  bug_id: number;
  title: null;
  fix_branch: null;
  error: string;
  partial: true;
}

// ─── URL 解析 ────────────────────────────────────────────────────────────────
/** Extracts bug ID from a zentao bug URL. Supports /zentao/bug-view-138845.html. */
export function extractBugIdFromUrl(url: string): number | null {
  const match = url.match(/bug-view-(\d+)\.html/);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}

// ─── 内嵌附件证据 ────────────────────────────────────────────────────────────
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\(([^)]+)\)/g;
const ZENTAO_FILE_PATH_PATTERN = /^\/zentao\/file-read-\d+\.[a-z0-9]+$/i;

export interface DownloadedAttachment {
  source_url: string;
  output_path: string;
}

/** Extract embedded image URLs in first-seen order and remove duplicates. */
export function extractMarkdownAttachmentUrls(markdownSections: string[]): string[] {
  const urls = new Set<string>();
  for (const markdown of markdownSections) {
    for (const match of markdown.matchAll(MARKDOWN_IMAGE_PATTERN)) {
      const url = match[1]?.trim();
      if (url) urls.add(url);
    }
  }
  return [...urls];
}

/** Download same-origin ZenTao image evidence with the authenticated bug session. */
export async function downloadMarkdownAttachments(
  markdownSections: string[],
  baseUrl: string,
  outputDir: string,
  cookie: string,
  fetchFn: FetchFn = globalThis.fetch as FetchFn,
): Promise<DownloadedAttachment[]> {
  const base = new URL(baseUrl);
  const attachments: DownloadedAttachment[] = [];
  mkdirSync(outputDir, { recursive: true });

  for (const reference of extractMarkdownAttachmentUrls(markdownSections)) {
    const url = new URL(reference, base);
    if (url.origin !== base.origin || !ZENTAO_FILE_PATH_PATTERN.test(url.pathname)) continue;

    const response = await fetchFn(url.toString(), {
      headers: { Cookie: cookie },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || contentType.includes("text/html")) {
      throw Object.assign(new Error(`下载禅道附件失败：${url.pathname}，HTTP ${response.status}`), {
        code: "ATTACHMENT_FETCH_FAILED",
      });
    }

    const outputPath = resolve(outputDir, basename(url.pathname));
    writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
    attachments.push({ source_url: url.toString(), output_path: outputPath });
  }

  return attachments;
}

// ─── 输出辅助 ────────────────────────────────────────────────────────────────
function writeJsonExit(payload: ErrorOutput, code: number): never {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function writePartial(outputPath: string, bugId: number, error: string): void {
  const partial: PartialBugOutput = {
    bug_id: bugId,
    title: null,
    fix_branch: null,
    error,
    partial: true,
  };
  writeFileSync(outputPath, JSON.stringify(partial, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify(partial, null, 2)}\n`);
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────
export async function runFetch(options: {
  bugId?: number;
  url?: string;
  output: string;
}): Promise<void> {
  const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../");
  initEnv(resolve(projectRoot, ".env"));

  // Resolve bug ID
  let bugId: number;
  if (options.bugId !== undefined) {
    bugId = options.bugId;
  } else if (options.url) {
    const extracted = extractBugIdFromUrl(options.url);
    if (extracted === null) {
      writeJsonExit({ error: "无法从 URL 提取 Bug ID，预期格式：bug-view-{数字}.html" }, 1);
    }
    bugId = extracted as number;
  } else {
    writeJsonExit({ error: "必须提供 --bug-id 或 --url 参数" }, 1);
  }

  // Validate env
  const baseUrl = getEnv("KATA_ZENTAO_BASE_URL");
  const account = getEnv("KATA_ZENTAO_ACCOUNT");
  const password = getEnv("KATA_ZENTAO_PASSWORD");
  const configuredCookie = readCookie();
  const missing: string[] = [];
  if (!baseUrl) missing.push("KATA_ZENTAO_BASE_URL");
  if (!configuredCookie && !account) missing.push("KATA_ZENTAO_ACCOUNT");
  if (!configuredCookie && !password) missing.push("KATA_ZENTAO_PASSWORD");
  if (missing.length > 0) {
    writeJsonExit(
      {
        error: `缺少必要的环境变量：${missing.join(", ")}`,
        hint: "请在项目根目录 .env 中配置 KATA_ZENTAO_BASE_URL，并配置 KATA_ZENTAO_COOKIE 或完整账号密码",
      },
      1,
    );
  }

  // Output dir
  const absOutput = resolve(options.output);
  mkdirSync(absOutput, { recursive: true });
  const outputPath = `${absOutput}/bug-${bugId}.json`;

  const creds: ZentaoCreds = {
    baseUrl: baseUrl as string,
    account,
    password,
  };

  // Fetch（cookie 优先、失效降级登录）
  let rawText: string;
  try {
    rawText = await fetchAuthedBugJson(bugId, creds);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "BUG_NOT_FOUND") writeJsonExit({ error: `Bug #${bugId} 不存在` }, 1);
    if (e.code === "LOGIN_FAILED") {
      writeJsonExit(
        { error: "禅道登录失败", hint: "请检查 KATA_ZENTAO_ACCOUNT 和 KATA_ZENTAO_PASSWORD" },
        1,
      );
    }
    if (e.code === "ZENTAO_AUTH_MISSING") {
      writeJsonExit({ error: e.message, hint: "请在根目录 .env 中补充 ZenTao 账号密码" }, 1);
    }
    if (e.code === "NETWORK_ERROR" && options.url) {
      writePartial(outputPath, bugId, "禅道 API 不可达，仅从 URL 提取了 Bug ID");
      return;
    }
    // e.message 已带各错误码的描述前缀（network/fetch 等），直接透传避免重复前缀
    writeJsonExit({ error: e.message, partial: true }, 1);
  }

  // Parse → 富结构
  const rich = parseBugPayload(rawText);
  if (!rich) {
    writePartial(outputPath, bugId, "禅道返回了无法解析的响应");
    return;
  }

  const evidenceMarkdown = [
    rich.sections.steps_md,
    rich.sections.resolution_md,
    ...rich.history.map((entry) => entry.comment_md),
  ];
  const referencedAttachments = extractMarkdownAttachmentUrls(evidenceMarkdown);
  const cookie = readCookie();
  if (referencedAttachments.length > 0 && !cookie) {
    writeJsonExit({ error: "KATA_ZENTAO_COOKIE 未配置，无法下载截图证据", partial: true }, 1);
  }

  let attachments: DownloadedAttachment[] = [];
  if (cookie) {
    try {
      attachments = await downloadMarkdownAttachments(
        evidenceMarkdown,
        creds.baseUrl,
        absOutput,
        cookie,
      );
    } catch (err) {
      writeJsonExit({ error: (err as Error).message, partial: true }, 1);
    }
  }

  // 装配输出：保留 legacy 顶层字段 + 富结构
  const output = {
    bug_id: rich.bug_id ?? bugId,
    url: options.url ?? `${creds.baseUrl}/zentao/bug-view-${bugId}.html`,
    title: rich.title,
    severity: rich.fields.severity,
    priority: rich.fields.priority,
    status: rich.fields.status,
    fix_branch: rich.fields.fix_branch,
    assigned_to: rich.fields.assigned_to,
    module: rich.fields.module,
    fields: rich.fields,
    sections: rich.sections,
    history: rich.history,
    attachments,
    output_path: outputPath,
  };
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
