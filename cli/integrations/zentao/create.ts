#!/usr/bin/env bun
/**
 * cli/integrations/zentao/create.ts — 在禅道创建 bug
 * Contract: 已合并实现 (main 9f92a198e)；运维/风险笔记见 cli/integrations/zentao/NOTES.md
 */
import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { renderBugReport } from "../../lib/bug-report-render.ts";
import type { BugReport } from "../../lib/bug-report-types.ts";
import { parseBugReportMarkdown } from "../../lib/defect-report.ts";
import {
  loadZentaoConfig as loadZentaoPluginConfig,
  pluginConfigPath,
} from "../../lib/plugin-config.ts";
import type { Severity } from "../../lib/scan-report-types.ts";
import { repoRoot } from "../../lib/workspace-locator.ts";
import { resolveSession } from "./client.ts";

// ─── 配置 ─────────────────────────────────────────────────────────────────────

export interface ZentaoConfig {
  product: number;
  branch: number;
  module: number;
  assignee: { account: string; display?: string };
  opened_build: string;
  bug_type: string;
  severity_map: Record<string, number>;
  priority_map?: Record<string, number>;
}

/** Load and validate the zentao create config yaml. */
export function loadZentaoCreateConfig(path: string): ZentaoConfig {
  if (!existsSync(path)) throw new Error(`[zentao-create] 配置文件不存在：${path}`);
  const root = parseYaml(readFileSync(path, "utf8")) as { create?: Partial<ZentaoConfig> };
  const cfg = root?.create;
  if (!cfg || typeof cfg.product !== "number") {
    throw new Error("[zentao-create] 配置无效：缺少 create.product");
  }
  if (!cfg.assignee?.account) {
    throw new Error("[zentao-create] 配置无效：缺少 create.assignee.account");
  }
  if (!cfg.opened_build) throw new Error("[zentao-create] 配置无效：缺少 create.opened_build");
  return {
    product: cfg.product,
    branch: cfg.branch ?? 0,
    module: cfg.module ?? 0,
    assignee: cfg.assignee,
    opened_build: cfg.opened_build,
    bug_type: cfg.bug_type ?? "codeerror",
    severity_map: cfg.severity_map ?? { critical: 1, major: 2, normal: 3, minor: 4 },
    priority_map: cfg.priority_map,
  };
}

/** Map a BugReport severity to a zentao severity number (default 3). */
export function mapSeverity(config: ZentaoConfig, severity: Severity): number {
  return config.severity_map[severity] ?? 3;
}

/** Map a BugReport priority to a zentao pri number (default 3). */
export function mapPriority(config: ZentaoConfig, priority?: number | string): number {
  if (priority == null) return 3;
  return config.priority_map?.[String(priority)] ?? 3;
}

// ─── 创建 payload / 端点 / 响应解析 ─────────────────────────────────────────────

/** Build the PATH_INFO bug-create endpoint URL. */
export function createUrl(baseUrl: string, config: ZentaoConfig): string {
  return `${baseUrl}/zentao/bug-create-${config.product}-${config.branch}-moduleID=${config.module}.html`;
}

/** Map a validated BugReport + config + rendered steps into zentao form fields. */
export function buildCreatePayload(
  report: BugReport,
  config: ZentaoConfig,
  stepsHtml: string,
): Record<string, string> {
  return {
    product: String(config.product),
    branch: String(config.branch),
    module: String(config.module),
    title: report.title,
    assignedTo: config.assignee.account,
    openedBuild: config.opened_build,
    type: config.bug_type,
    severity: String(mapSeverity(config, report.severity)),
    pri: String(mapPriority(config, report.priority)),
    steps: stepsHtml,
  };
}

export interface CreateResult {
  ok: boolean;
  bug_id?: number;
  url?: string;
  title?: string;
  error?: string;
  note?: string;
}

export interface CreateDryRunResult {
  ok: true;
  dryRun: true;
  endpoint: string;
  fields: Record<string, string>;
}

export class ZentaoCreateError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "ZentaoCreateError";
  }
}

// 扫描整段响应里的 bug id：禅道不同版本会把它放进 PATH_INFO 链接
// （bug-view-N）或查询串（…&bugID=N），locate/load 还可能是嵌套对象，
// 所以统一对整段文本做匹配，而不是只看固定字段。
function extractBugId(text: string): number | null {
  for (const re of [/bug-view-(\d+)/, /bugID=(\d+)/i]) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Parse a zentao bug-create response. Handles standard ajax JSON
 * ({result:'success', id|locate|load} / {result:'fail', message}) and an
 * HTML fallback. The bug id is extracted by scanning the whole body for
 * either a `bug-view-N` path or a `bugID=N` query, since newer zentao
 * nests the redirect target in objects or query strings. When zentao
 * reports success but no id can be recovered, the bug WAS still created,
 * so this returns ok:true with a note rather than a false failure.
 */
export function parseCreateResponse(text: string, baseUrl: string, title: string): CreateResult {
  let data: Record<string, unknown> | null = null;
  try {
    const j = JSON.parse(text);
    if (j && typeof j === "object") data = j as Record<string, unknown>;
  } catch {
    // not json
  }
  const idToResult = (id: number): CreateResult => ({
    ok: true,
    bug_id: id,
    url: `${baseUrl}/zentao/bug-view-${id}.html`,
    title,
  });
  if (data) {
    const result = data.result ?? data.status;
    if (result === "success") {
      const explicit = data.id != null ? Number(data.id) : Number.NaN;
      const id = Number.isNaN(explicit) ? extractBugId(text) : explicit;
      if (id != null && !Number.isNaN(id)) return idToResult(id);
      return {
        ok: true,
        title,
        note: "禅道返回 success 但响应未包含可解析的 bug 链接，请到禅道按标题核对",
      };
    }
    if (result === "fail" || data.message) {
      const msg =
        typeof data.message === "string" ? data.message : JSON.stringify(data.message ?? data);
      return { ok: false, error: `禅道创建失败：${msg}` };
    }
  }
  const id = extractBugId(text);
  if (id != null) return idToResult(id);
  return { ok: false, error: "禅道返回了无法解析的响应" };
}

// ─── 运行 / CLI ────────────────────────────────────────────────────────────────

function fail(code: string, message: string): never {
  throw new ZentaoCreateError(code, message);
}

export async function runCreate(opts: {
  report: string;
  dryRun: boolean;
}): Promise<CreateResult | CreateDryRunResult> {
  const projectRoot = repoRoot();
  const baseUrl = loadZentaoPluginConfig(projectRoot).base_url;
  if (!baseUrl) {
    fail(
      "ZENTAO_CONFIG_MISSING",
      "缺少 config/plugin/zentao.yaml 的 base_url（或设置 KATA_ZENTAO_BASE_URL）",
    );
  }
  let report: BugReport;
  try {
    report = parseBugReportMarkdown(opts.report);
  } catch (e) {
    fail("REPORT_INVALID", `读取/校验 BugReport 失败：${(e as Error).message}`);
  }
  let config: ZentaoConfig;
  let steps: string;
  let payload: Record<string, string>;
  try {
    config = loadZentaoCreateConfig(pluginConfigPath("zentao", projectRoot));
    // zentao 模板本身只渲染首条主修复建议（其它相关问题应另开 bug）。
    steps = renderBugReport(report, "zentao");
    payload = buildCreatePayload(report, config, steps);
  } catch (e) {
    fail("CONFIG_INVALID", `配置加载/正文渲染失败：${(e as Error).message}`);
  }

  if (opts.dryRun) {
    return {
      ok: true,
      dryRun: true,
      endpoint: createUrl(baseUrl, config),
      fields: { ...payload, steps: `<${steps.length} chars>` },
    };
  }

  let cookie: string;
  try {
    cookie = await resolveSession();
  } catch (e) {
    fail("SESSION_FAILED", (e as Error).message);
  }

  let res: Response;
  try {
    res = await fetch(createUrl(baseUrl, config), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookie,
        "User-Agent": "kata/2.0 zentao-plugin",
      },
      body: new URLSearchParams(payload).toString(),
    });
  } catch (e) {
    fail("NETWORK_ERROR", `网络连接失败: ${(e as Error).message}`);
  }

  // HTML 错误页（登录页/网关错误）不当初步成功：先看状态码与 content-type，再解析正文
  if (!res.ok) {
    fail("CREATE_HTTP_ERROR", `禅道创建请求失败，HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    fail("CREATE_UNEXPECTED_HTML", "禅道创建返回了 HTML 页面而非 JSON（会话可能已失效）");
  }
  const text = await res.text();

  const result = parseCreateResponse(text, baseUrl, report.title);
  if (!result.ok) {
    fail("CREATE_FAILED", result.error ?? "禅道创建失败");
  }
  return result;
}
