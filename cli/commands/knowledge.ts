import type { Command } from "commander";
import { outputJson } from "../lib/cli.ts";
import { formatKnowledgeRead, runReadEntries, runWriteEntry } from "../lib/knowledge/entry.ts";
import { writeIndexFile } from "../lib/knowledge/index-data.ts";
import { formatKnowledgeLint, lintKnowledge } from "../lib/knowledge/lint.ts";
import { listCustomers } from "../lib/knowledge/store.ts";
import { runWrite } from "../lib/knowledge/write.ts";
import { listWorkspaceProjects, locateProject } from "../lib/workspace-locator.ts";

/** Build the `knowledge` command: list / read / write / index over the project knowledge base. */
export function registerKnowledge(program: Command): void {
  const knowledge = program.command("knowledge").description("项目知识的查询、维护与索引");

  knowledge
    .command("list")
    .description("列出知识库中登记的客户编号与中文名(default 始终作为保留项)")
    .requiredOption("--project <name>", "项目名")
    .option("--json", "JSON 输出", false)
    .action((opts: { project: string; json: boolean }) => {
      const customers = listCustomers(locateProject(opts.project));
      if (opts.json) outputJson(customers);
      else {
        for (const c of customers) {
          process.stdout.write(`${c.code} → ${c.name}\n`);
        }
      }
    });

  knowledge
    .command("read")
    .description("统一检索知识条目(term/module/pitfall/site/standard)与项目概览")
    .requiredOption("--project <name>", "项目名")
    .requiredOption(
      "--customer <code>",
      "客户编号(default=公共条目即袋鼠云,具体 code=公共+客户专属)",
    )
    .option("--module <name>", "按模块过滤(匹配标题或 tags)")
    .option("--keyword <word>", "按关键词检索(匹配标题/正文/tags)")
    .option("--type <types>", "限定类型,逗号分隔(term,module,pitfall,site,standard)")
    .option("--status <statuses>", "限定状态,逗号分隔；默认仅 verified，使用 all 读取全部状态")
    .option("--json", "JSON 输出", false)
    .action(
      (opts: {
        project: string;
        customer: string;
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
    .description(
      "写入知识:独立条目用 --status/--title/--body;overview 用 --content/--status/--source",
    )
    .requiredOption("--project <name>", "项目名")
    .requiredOption(
      "--type <type>",
      "term | overview | module | pitfall | site | standard | customer",
    )
    .option(
      "--status <status>",
      "四态:verified | observed | conflicting | deprecated；overview 默认 observed",
    )
    .option("--title <title>", "条目标题")
    .option("--body <md>", "条目正文 Markdown")
    .option("--tags <tags>", "标签,逗号分隔")
    .option("--source <source>", "证据来源(写入知识必填)")
    .option("--content <json>", "overview 内容 JSON(仅 overview 类型可用)")
    .option("--customer <code>", "客户编号(standard 类型必填;default=公共条目)")
    .option("--confirmed", "确认 observed→verified 的状态升级", false)
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
        customer?: string;
        confirmed: boolean;
        dryRun: boolean;
        force: boolean;
      }) => {
        if (opts.type === "overview") {
          if (!opts.content) {
            throw new Error(`[knowledge] 类型 ${opts.type} 需要 --content JSON`);
          }
          if (!opts.source) {
            throw new Error(`[knowledge] 类型 ${opts.type} 需要 --source(证据来源)`);
          }
          if (opts.title || opts.body || opts.tags) {
            throw new Error(
              `[knowledge] 类型 ${opts.type} 只接受 --content，不接受 --title/--body/--tags`,
            );
          }
          const result = runWrite({
            project: opts.project,
            type: opts.type,
            content: opts.content,
            status: opts.status ?? "observed",
            source: opts.source,
            confirmed: opts.confirmed,
            dryRun: opts.dryRun,
            overwrite: false,
            force: opts.force,
          });
          outputJson(result);
          if ("blocked" in result && result.blocked) process.exitCode = 2;
          return;
        }
        const overviewOnly = opts.content !== undefined || opts.dryRun || opts.force;
        if (overviewOnly) {
          throw new Error(
            `[knowledge] --content/--dry-run/--force 仅 overview 类型可用;${opts.type} 用 --status/--title/--body 写入`,
          );
        }
        if (opts.type === "standard" && !opts.customer) {
          throw new Error(
            "[knowledge] standard 类型必须提供 --customer（使用 default 写入公共条目）",
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
            customer: opts.customer,
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

  knowledge
    .command("lint")
    .description("检查知识条目结构、状态来源、标题与模板残留")
    .option("--project <name>", "项目名")
    .option("--all-projects", "检查 workspace 下全部项目")
    .option("--exit-code", "存在违规时退出码为 1")
    .action((opts: { project?: string; allProjects?: boolean; exitCode?: boolean }) => {
      if (Boolean(opts.project) === Boolean(opts.allProjects)) {
        throw new Error("[knowledge] lint 须指定 --project <name> 或 --all-projects 之一");
      }
      const projects = opts.allProjects ? listWorkspaceProjects() : [opts.project as string];
      if (projects.length === 0) throw new Error("[knowledge] lint 未发现可检查的 workspace 项目");
      const reports = projects.map((project) => lintKnowledge(project));
      for (const report of reports) {
        if (report.violations.length > 0) process.stderr.write(`${formatKnowledgeLint(report)}\n`);
      }
      const violations = reports.flatMap((report) => report.violations);
      outputJson(opts.allProjects ? { projects: reports } : reports[0]);
      if (opts.exitCode && violations.length > 0) process.exitCode = 1;
    });
}
