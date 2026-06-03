#!/usr/bin/env bun
/**
 * plugins/zentao/create.ts — 在禅道创建 bug
 * Contract: docs/superpowers/specs/2026-06-03-zentao-bug-create-design.md
 */
import { existsSync, readFileSync } from "node:fs";
import type { BugReport } from "@shared/lib/bug-report-types.ts";
import type { Severity } from "@shared/lib/scan-report-types.ts";
import { parse as parseYaml } from "yaml";

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
export function loadZentaoConfig(path: string): ZentaoConfig {
  if (!existsSync(path)) throw new Error(`[zentao-create] 配置文件不存在：${path}`);
  const cfg = parseYaml(readFileSync(path, "utf8")) as Partial<ZentaoConfig>;
  if (!cfg || typeof cfg.product !== "number") {
    throw new Error("[zentao-create] 配置无效：缺少 product");
  }
  if (!cfg.assignee?.account) throw new Error("[zentao-create] 配置无效：缺少 assignee.account");
  if (!cfg.opened_build) throw new Error("[zentao-create] 配置无效：缺少 opened_build");
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
}

/**
 * Parse a zentao bug-create response. Handles standard ajax JSON
 * ({result:'success', id|locate|load} / {result:'fail', message}) and an
 * HTML fallback that contains a bug-view URL.
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
      let id = data.id != null ? Number(data.id) : Number.NaN;
      if (Number.isNaN(id)) {
        const locate =
          typeof data.locate === "string"
            ? data.locate
            : typeof data.load === "string"
              ? data.load
              : "";
        const m = locate.match(/bug-view-(\d+)/);
        if (m) id = Number(m[1]);
      }
      if (!Number.isNaN(id)) return idToResult(id);
      return { ok: false, error: "禅道返回 success 但未能解析 bug id" };
    }
    if (result === "fail" || data.message) {
      const msg =
        typeof data.message === "string" ? data.message : JSON.stringify(data.message ?? data);
      return { ok: false, error: `禅道创建失败：${msg}` };
    }
  }
  const m = text.match(/bug-view-(\d+)\.html/);
  if (m) return idToResult(Number(m[1]));
  return { ok: false, error: "禅道返回了无法解析的响应" };
}
