#!/usr/bin/env bun
/**
 * plugins/zentao/create.ts — 在禅道创建 bug
 * Contract: docs/superpowers/specs/2026-06-03-zentao-bug-create-design.md
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBugReport } from "@shared/lib/bug-report-render.ts";
import type { BugReport } from "@shared/lib/bug-report-types.ts";
import { validateBugReport } from "@shared/lib/bug-report-validate.ts";
import { createCli } from "@shared/lib/cli-runner.ts";
import { getEnv, initEnv } from "@shared/lib/env.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import type { Severity } from "@shared/lib/scan-report-types.ts";
import { parse as parseYaml } from "yaml";
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

// ─── 运行 / CLI ────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DEFAULT_CONFIG = resolve(__dirname, "zentao.config.yaml");

function emit(obj: unknown): void {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

async function run(opts: { json: string; config: string; dryRun: boolean }): Promise<void> {
  initEnv(resolve(repoRoot(), ".env"));
  const baseUrl = getEnv("KATA_ZENTAO_BASE_URL");
  if (!baseUrl) {
    emit({ ok: false, error: "缺少 KATA_ZENTAO_BASE_URL" });
    process.exit(1);
  }
  let report: BugReport;
  try {
    report = validateBugReport(JSON.parse(readFileSync(opts.json, "utf8")));
  } catch (e) {
    emit({ ok: false, error: `读取/校验 BugReport 失败：${(e as Error).message}` });
    process.exit(1);
  }
  let config: ZentaoConfig;
  let steps: string;
  let payload: Record<string, string>;
  try {
    config = loadZentaoConfig(opts.config);
    steps = renderBugReport(report, "zentao");
    payload = buildCreatePayload(report, config, steps);
  } catch (e) {
    emit({ ok: false, error: `配置加载/正文渲染失败：${(e as Error).message}` });
    process.exit(1);
  }

  if (opts.dryRun) {
    emit({
      ok: true,
      dryRun: true,
      endpoint: createUrl(baseUrl, config),
      fields: { ...payload, steps: `<${steps.length} chars>` },
    });
    return;
  }

  let cookie: string;
  try {
    cookie = await resolveSession();
  } catch (e) {
    emit({ ok: false, error: (e as Error).message });
    process.exit(1);
  }

  let text: string;
  try {
    const res = await fetch(createUrl(baseUrl, config), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookie,
        "User-Agent": "kata/2.0 zentao-plugin",
      },
      body: new URLSearchParams(payload).toString(),
    });
    text = await res.text();
  } catch (e) {
    emit({ ok: false, error: `网络连接失败: ${(e as Error).message}` });
    process.exit(1);
  }

  const result = parseCreateResponse(text, baseUrl, report.title);
  emit(result);
  if (!result.ok) process.exit(1);
}

export const program = createCli({
  name: "zentao-create",
  description: "Create a bug in ZenTao (fixed assignee, zentao variant body)",
  rootAction: {
    options: [
      { flag: "--json <path>", description: "BugReport JSON path", required: true },
      { flag: "--config <path>", description: "ZenTao config yaml", defaultValue: DEFAULT_CONFIG },
      { flag: "--dry-run", description: "Assemble fields without posting; print payload" },
    ],
    action: async (opts: { json: string; config: string; dryRun?: boolean }) => {
      await run({ json: opts.json, config: opts.config, dryRun: Boolean(opts.dryRun) });
    },
  },
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
