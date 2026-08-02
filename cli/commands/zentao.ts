import type { Command } from "commander";
import { runCreate } from "../integrations/zentao/create.ts";
import { runFetch, ZentaoIntegrationError } from "../integrations/zentao/fetch.ts";
import { outputJson } from "../lib/cli.ts";

/** Build the `zentao` command: low-level bug fetch and formal report registration. */
export function registerZentao(program: Command): void {
  const zentao = program.command("zentao").description("禅道集成:bug 抓取与创建");

  zentao
    .command("fetch")
    .description("从禅道 Bug 链接提取缺陷详情、解决叙述和修复分支")
    .option("--bug-id <number>", "禅道 Bug ID(数字),例如 151858")
    .option(
      "--url <url>",
      '禅道 Bug 页面 URL,例如 "https://zentao.example.cn/zentao/bug-view-151858.html"',
    )
    .requiredOption("--output <dir>", "输出目录路径,例如 <hotfixDir>/.temp")
    .action(async (opts: { bugId?: string; url?: string; output: string }) => {
      let bugId: number | undefined;
      if (opts.bugId !== undefined) {
        if (!/^\d+$/.test(opts.bugId)) {
          throw new ZentaoIntegrationError(
            "INVALID_BUG_ID",
            `无效的 Bug ID 格式:"${opts.bugId}",必须为正整数`,
          );
        }
        bugId = Number.parseInt(opts.bugId, 10);
      }
      if (bugId === undefined && !opts.url) {
        throw new ZentaoIntegrationError("BUG_ID_REQUIRED", "必须提供 --bug-id 或 --url 参数");
      }
      outputJson(await runFetch({ bugId, url: opts.url, output: opts.output }));
    });

  zentao
    .command("create")
    .description("按 config/private/integrations/zentao.yaml 的映射从正式 Markdown 报告创建 bug")
    .requiredOption("--report <path>", "BugReport Markdown 路径")
    .option("--dry-run", "只组装字段不提交,打印 payload", false)
    .action(async (opts: { report: string; dryRun: boolean }) => {
      outputJson(await runCreate({ report: opts.report, dryRun: opts.dryRun }));
    });
}
