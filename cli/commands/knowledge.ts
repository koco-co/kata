import { Command } from "commander";
import { runIndex, runReadCore, runReadModule, runReadPitfall } from "../lib/knowledge/read.ts";
import { runWrite } from "../lib/knowledge/write.ts";

/** Build the `knowledge` command: read / write / index over the project knowledge base. */
export function registerKnowledge(program: Command): void {
  const knowledge = program.command("knowledge").description("项目知识的查询、维护与索引");

  knowledge
    .command("read-core")
    .description("读取概览 + 术语 + 索引")
    .requiredOption("--project <name>", "项目名")
    .action((opts: { project: string }) => runReadCore(opts));

  knowledge
    .command("read-module")
    .description("读取单个模块知识")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--module <name>", "模块名")
    .action((opts: { project: string; module: string }) => runReadModule(opts));

  knowledge
    .command("read-pitfall")
    .description("按关键词检索踩坑记录")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--query <keyword>", "检索关键词")
    .action((opts: { project: string; query: string }) => runReadPitfall(opts));

  knowledge
    .command("write")
    .description("写入业务事实/规则/术语")
    .requiredOption("--project <name>", "项目名")
    .requiredOption("--type <type>", "term | overview | module | pitfall")
    .requiredOption("--content <json>", "条目内容 JSON")
    .option("--confidence <level>", "high | medium | low", "medium")
    .option("--confirmed", "低置信度时确认写入", false)
    .option("--dry-run", "只预览不写入", false)
    .option("--overwrite", "允许覆盖", false)
    .option("--force", "越过 block 级冲突", false)
    .action((opts: { project: string; type: string; content: string; confidence: string; confirmed: boolean; dryRun: boolean; overwrite: boolean; force: boolean }) =>
      runWrite({
        project: opts.project,
        type: opts.type,
        content: opts.content,
        confidence: opts.confidence,
        confirmed: opts.confirmed,
        dryRun: opts.dryRun,
        overwrite: opts.overwrite,
        force: opts.force,
      }),
    );

  knowledge
    .command("index")
    .description("重建知识库索引")
    .requiredOption("--project <name>", "项目名")
    .action((opts: { project: string }) => runIndex(opts));
}
