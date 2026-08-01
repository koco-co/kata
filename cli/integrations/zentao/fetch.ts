#!/usr/bin/env bun
/**
 * cli/integrations/zentao/fetch.ts — 禅道 Bug 抓取器（编排 + CLI）
 *
 * Usage:
 *   kata zentao fetch --bug-id 151858 --output workspace/<project>/.temp/zentao
 *   kata zentao fetch --url "https://zentao.example.cn/zentao/bug-view-151858.html" --output .temp/zentao
 *   kata zentao fetch --help
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { assertNoSymlinkPath } from "../../lib/features-layout.ts";
import { loadZentaoConfig, pluginConfigPath } from "../../lib/plugin-config.ts";
import { repoRoot } from "../../lib/workspace-locator.ts";

import { parseBugPayload, type RichBug } from "./parse.ts";
import {
  type AuthedBugJson,
  type FetchFn,
  fetchAuthedBugJson,
  readCookie,
  type ZentaoCreds,
} from "./session.ts";

// ─── 类型定义 ────────────────────────────────────────────────────────────────
export interface PartialBugOutput {
  bug_id: number;
  title: null;
  fix_branch: null;
  error: string;
  partial: true;
}

export interface ZentaoFetchOutput {
  bug_id: number;
  url: string;
  title: RichBug["title"];
  severity: RichBug["fields"]["severity"];
  priority: RichBug["fields"]["priority"];
  status: RichBug["fields"]["status"];
  fix_branch: RichBug["fields"]["fix_branch"];
  assigned_to: RichBug["fields"]["assigned_to"];
  module: RichBug["fields"]["module"];
  fields: RichBug["fields"];
  sections: RichBug["sections"];
  history: RichBug["history"];
  attachments: DownloadedAttachment[];
  output_path: string;
}

export type ZentaoFetchResult = PartialBugOutput | ZentaoFetchOutput;

export class ZentaoIntegrationError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: string,
    message: string,
    readonly hint?: string,
  ) {
    super(`${code}: ${message}${hint ? `\n${hint}` : ""}`);
    this.name = "ZentaoIntegrationError";
  }
}

// ─── URL 解析 ────────────────────────────────────────────────────────────────
/** Extracts bug ID from a zentao bug URL. Supports /zentao/bug-view-138845.html. */
export function extractBugIdFromUrl(url: string): number | null {
  const match = url.match(/bug-view-(\d+)\.html/);
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isNaN(id) ? null : id;
}

/** Remove URL credentials and transient query state before persisting evidence. */
export function sanitizeEvidenceUrl(value: string, fallback: string): string {
  try {
    const url = new URL(value, fallback);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return fallback;
  }
}

function canonicalBugPageUrl(baseUrl: string, bugId: number): string {
  const base = new URL(baseUrl);
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/zentao/bug-view-${bugId}.html`;
  base.username = "";
  base.password = "";
  base.search = "";
  base.hash = "";
  return base.toString();
}

// ─── 内嵌附件证据 ────────────────────────────────────────────────────────────
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\(([^)]+)\)/g;
const ZENTAO_FILE_PATH_PATTERN = /^\/zentao\/file-read-\d+\.[a-z0-9]+$/i;

function assertOutputPath(target: string, label: string): string {
  const resolved = resolve(target);
  assertNoSymlinkPath(dirname(resolved), resolved, label);
  return resolved;
}

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
  const absOutputDir = assertOutputPath(outputDir, "禅道附件输出目录");
  mkdirSync(absOutputDir, { recursive: true });

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

    const outputPath = assertOutputPath(
      resolve(absOutputDir, basename(url.pathname)),
      "禅道附件输出文件",
    );
    writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
    attachments.push({
      source_url: sanitizeEvidenceUrl(url.toString(), base.toString()),
      output_path: outputPath,
    });
  }

  return attachments;
}

// ─── 输出辅助 ────────────────────────────────────────────────────────────────
function writePartial(outputPath: string, bugId: number, error: string): PartialBugOutput {
  const partial: PartialBugOutput = {
    bug_id: bugId,
    title: null,
    fix_branch: null,
    error,
    partial: true,
  };
  writeFileSync(outputPath, JSON.stringify(partial, null, 2), "utf8");
  return partial;
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────
export async function runFetch(options: {
  bugId?: number;
  url?: string;
  output: string;
}): Promise<ZentaoFetchResult> {
  const projectRoot = repoRoot();
  const pluginConfig = loadZentaoConfig(projectRoot);

  // Resolve bug ID
  let bugId: number;
  if (options.bugId !== undefined) {
    bugId = options.bugId;
  } else if (options.url) {
    const extracted = extractBugIdFromUrl(options.url);
    if (extracted === null) {
      throw new ZentaoIntegrationError(
        "INVALID_BUG_URL",
        "无法从 URL 提取 Bug ID，预期格式：bug-view-{数字}.html",
      );
    }
    bugId = extracted;
  } else {
    throw new ZentaoIntegrationError("BUG_ID_REQUIRED", "必须提供 --bug-id 或 --url 参数");
  }

  // Validate env
  const baseUrl = pluginConfig.base_url;
  const account = pluginConfig.username;
  const password = pluginConfig.password;
  const configuredCookie = readCookie();
  const missing: string[] = [];
  if (!baseUrl) missing.push("base_url");
  if (!configuredCookie && !account) missing.push("username");
  if (!configuredCookie && !password) missing.push("password");
  if (missing.length > 0) {
    throw new ZentaoIntegrationError(
      "ZENTAO_CONFIG_MISSING",
      `缺少必要的禅道配置：${missing.join(", ")}`,
      `请在 ${pluginConfigPath("zentao", projectRoot)} 中配置 base_url，以及 cookie 或完整账号密码；` +
        "也可设置环境变量 KATA_ZENTAO_BASE_URL / KATA_ZENTAO_COOKIE / KATA_ZENTAO_ACCOUNT / KATA_ZENTAO_PASSWORD",
    );
  }

  // Output dir
  const absOutput = assertOutputPath(options.output, "禅道抓取输出目录");
  mkdirSync(absOutput, { recursive: true });
  const outputPath = `${absOutput}/bug-${bugId}.json`;

  const creds: ZentaoCreds = {
    baseUrl: baseUrl as string,
    account,
    password,
  };

  // Fetch（cookie 优先、失效降级登录）
  let raw: AuthedBugJson;
  try {
    raw = await fetchAuthedBugJson(bugId, creds);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "BUG_NOT_FOUND") {
      throw new ZentaoIntegrationError("BUG_NOT_FOUND", `Bug #${bugId} 不存在`);
    }
    if (e.code === "LOGIN_FAILED") {
      throw new ZentaoIntegrationError(
        "LOGIN_FAILED",
        "禅道登录失败",
        `请检查 ${pluginConfigPath("zentao", projectRoot)} 中的 username 和 password`,
      );
    }
    if (e.code === "ZENTAO_AUTH_MISSING") {
      throw new ZentaoIntegrationError("ZENTAO_AUTH_MISSING", e.message);
    }
    if (e.code === "NETWORK_ERROR" && options.url) {
      return writePartial(outputPath, bugId, "禅道 API 不可达，仅从 URL 提取了 Bug ID");
    }
    throw new ZentaoIntegrationError(e.code ?? "FETCH_FAILED", e.message);
  }
  const rawText = raw.text;

  // Parse → 富结构
  const rich = parseBugPayload(rawText);
  if (!rich) {
    return writePartial(outputPath, bugId, "禅道返回了无法解析的响应");
  }

  const evidenceMarkdown = [
    rich.sections.steps_md,
    rich.sections.resolution_md,
    ...rich.history.map((entry) => entry.comment_md),
  ];
  const referencedAttachments = extractMarkdownAttachmentUrls(evidenceMarkdown);

  // 附件下载复用本次抓取实际生效的 cookie（探活通过的旧 cookie 或新登录回存的 cookie），
  // 不重新读配置——env 覆盖会让重读拿到已失效的旧值
  let attachments: DownloadedAttachment[] = [];
  if (referencedAttachments.length > 0) {
    try {
      attachments = await downloadMarkdownAttachments(
        evidenceMarkdown,
        creds.baseUrl,
        absOutput,
        raw.cookie,
      );
    } catch (err) {
      const error = err as Error & { code?: string };
      throw new ZentaoIntegrationError(error.code ?? "ATTACHMENT_FETCH_FAILED", error.message);
    }
  }

  // 装配输出：保留 legacy 顶层字段 + 富结构
  const canonicalUrl = canonicalBugPageUrl(creds.baseUrl, rich.bug_id ?? bugId);
  const output: ZentaoFetchOutput = {
    bug_id: rich.bug_id ?? bugId,
    url: options.url ? sanitizeEvidenceUrl(options.url, canonicalUrl) : canonicalUrl,
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
  return output;
}
