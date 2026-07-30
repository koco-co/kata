import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { formatKnowledgeRead, runReadEntries, runWriteEntry } from "../lib/knowledge/entry.ts";
import { writeIndexFile } from "../lib/knowledge/index-data.ts";
import { runWrite } from "../lib/knowledge/write.ts";

/** Build the `knowledge` command: read / write / index over the project knowledge base. */
export function registerKnowledge(program: Command): void {
  const knowledge = program.command("knowledge").description("项目知识的查询、维护与索引");

  knowledge
    .command("read")
    .description("统一检索知识条目(term/module/pitfall/site)与项目概览")
    .requiredOption("--project <name>", "项目名")
    .option("--module <name>", "按模块过滤(匹配标题或 tags)")
    .option("--keyword <word>", "按关键词检索(匹配标题/正文/tags)")
    .option("--type <types>", "限定类型,逗号分隔(term,module,pitfall,site)")
    .option("--status <statuses>", "限定状态,逗号分隔；默认仅 verified，使用 all 读取全部状态")
    .option("--json", "JSON 输出", false)
    .action(
      (opts: {
        project: string;
        module?: string;
        keyword?: string;
        type?: string;
        status?: string;
        json: boolean;
      }) => {
        const result = runReadEntries(opts);
        if (opts.json) outputJson(result);
        else process.stdout.write(formatKnowledgeRead(result));
      },
    );

  knowledge
    .command("write")
    .description("写入知识:独立条目用 --status/--title/--body;overview 用 --content JSON")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--type <type>", "term | overview | module | pitfall | site")
    .option("--status <status>", "四态:verified | observed | conflicting | deprecated")
    .option("--title <title>", "条目标题")
    .option("--body <md>", "条目正文 Markdown")
    .option("--tags <tags>", "标签,逗号分隔")
    .option("--source <source>", "证据来源(独立条目必填)")
    .option("--content <json>", "overview 内容 JSON(仅 overview 类型可用)")
    .option(
      "--confidence <level>",
      "overview 置信度:high | medium | low(仅 overview 类型可用)",
      "medium",
    )
    .option("--confirmed", "observed/低置信确认写入", false)
    .option("--dry-run", "只预览不写入(仅 overview 类型可用)", false)
    .option("--force", "越过 block 级冲突(仅 overview 类型可用)", false)
    .action(
      (opts: {
        project: string;
        type: string;
        status?: string;
        title?: string;
        body?: string;
        tags?: string;
        source?: string;
        content?: string;
        confidence: string;
        confirmed: boolean;
        dryRun: boolean;
        force: boolean;
      }) => {
        if (opts.type === "overview") {
          if (!opts.content) {
            throw new Error(`[knowledge] 类型 ${opts.type} 需要 --content JSON`);
          }
          const result = runWrite({
            project: opts.project,
            type: opts.type,
            content: opts.content,
            confidence: opts.confidence,
            confirmed: opts.confirmed,
            dryRun: opts.dryRun,
            overwrite: false,
            force: opts.force,
          });
          outputJson(result);
          if ("blocked" in result && result.blocked) process.exitCode = 2;
          return;
        }
        const overviewOnly =
          opts.content !== undefined || opts.dryRun || opts.force || opts.confidence !== "medium";
        if (overviewOnly) {
          throw new Error(
            `[knowledge] --content/--confidence/--dry-run/--force 仅 overview 类型可用;${opts.type} 用 --status/--title/--body 写入`,
          );
        }
        if (!opts.status || !opts.title || !opts.body) {
          throw new Error(`[knowledge] 类型 ${opts.type} 需要 --status/--title/--body`);
        }
        if (!opts.source) {
          throw new Error(`[knowledge] 类型 ${opts.type} 需要 --source(证据来源)`);
        }
        outputJson(
          runWriteEntry({
            project: opts.project,
            type: opts.type,
            status: opts.status,
            title: opts.title,
            body: opts.body,
            tags: opts.tags,
            source: opts.source,
            confirmed: opts.confirmed,
          }),
        );
      },
    );

  knowledge
    .command("index")
    .description("重建知识库索引 _index.md")
    .requiredOption("--project <name>", "项目名")
    .action((opts: { project: string }) => {
      const result = writeIndexFile(opts.project);
      outputJson({ project: opts.project, ...result });
    });
}
