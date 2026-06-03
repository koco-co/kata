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
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv, initEnv } from "@shared/lib/env.ts";
import { Command } from "commander";

import { parseBugPayload } from "./parse.ts";
import { fetchAuthedBugJson, type ZentaoCreds } from "./session.ts";

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
async function run(options: { bugId?: number; url?: string; output: string }): Promise<void> {
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
  const missing: string[] = [];
  if (!baseUrl) missing.push("KATA_ZENTAO_BASE_URL");
  if (!account) missing.push("KATA_ZENTAO_ACCOUNT");
  if (!password) missing.push("KATA_ZENTAO_PASSWORD");
  if (missing.length > 0) {
    writeJsonExit(
      {
        error: `缺少必要的环境变量：${missing.join(", ")}`,
        hint: "请在项目根目录 .env 文件中配置 KATA_ZENTAO_BASE_URL、KATA_ZENTAO_ACCOUNT 和 KATA_ZENTAO_PASSWORD",
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
    account: account as string,
    password: password as string,
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
    output_path: outputPath,
  };
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ─── 命令行入口 ──────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename || process.argv[1]?.endsWith("fetch.ts");

if (isMain) {
  const program = new Command("zentao-fetch");
  program
    .description("从禅道 Bug 链接提取缺陷详情、解决叙述和修复分支")
    .option("--bug-id <number>", "禅道 Bug ID（数字），例如 151858")
    .option(
      "--url <url>",
      '禅道 Bug 页面 URL，例如 "http://zenpms.dtstack.cn/zentao/bug-view-151858.html"',
    )
    .requiredOption("--output <dir>", "输出目录路径，例如 workspace/<project>/.temp/zentao")
    .option("--project <name>", "项目名称")
    .action(async (opts: { bugId?: string; url?: string; output: string; project?: string }) => {
      let parsedBugId: number | undefined;
      if (opts.bugId !== undefined) {
        parsedBugId = Number.parseInt(opts.bugId, 10);
        if (Number.isNaN(parsedBugId)) {
          writeJsonExit({ error: `无效的 Bug ID 格式："${opts.bugId}"，必须为正整数` }, 1);
        }
      }
      if (parsedBugId === undefined && !opts.url) {
        writeJsonExit({ error: "必须提供 --bug-id 或 --url 参数" }, 1);
      }
      await run({ bugId: parsedBugId, url: opts.url, output: opts.output });
    });
  program.parse(process.argv);
}
