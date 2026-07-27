import type { Command } from "commander";
import { DEFAULT_CONFIG, runCreate } from "../integrations/zentao/create.ts";
import { runFetch } from "../integrations/zentao/fetch.ts";

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
          // 与 runFetch 内部错误输出一致的机器可读契约
          process.stdout.write(
            `${JSON.stringify({ error: `无效的 Bug ID 格式:"${opts.bugId}",必须为正整数` }, null, 2)}\n`,
          );
          process.exit(1);
        }
        bugId = Number.parseInt(opts.bugId, 10);
      }
      if (bugId === undefined && !opts.url) {
        process.stdout.write(
          `${JSON.stringify({ error: "必须提供 --bug-id 或 --url 参数" }, null, 2)}\n`,
        );
        process.exit(1);
      }
      await runFetch({ bugId, url: opts.url, output: opts.output });
    });

  zentao
    .command("create")
    .description("从正式 Markdown 报告在禅道创建 bug(fixed assignee,zentao variant body)")
    .requiredOption("--report <path>", "BugReport Markdown 路径")
    .option("--config <path>", "ZenTao 配置 yaml", DEFAULT_CONFIG)
    .option("--dry-run", "只组装字段不提交,打印 payload", false)
    .action(async (opts: { report: string; config: string; dryRun: boolean }) => {
      await runCreate({ report: opts.report, config: opts.config, dryRun: opts.dryRun });
    });
}
