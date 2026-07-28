import type { Command } from "commander";

/** Build the `lanhu` command: 蓝湖 PRD 抓取,供 case draft 工作流调用。 */
export function registerLanhu(program: Command): void {
  const lanhu = program.command("lanhu").description("蓝湖集成:PRD 内容与截图抓取");

  lanhu
    .command("fetch")
    .description("从蓝湖 URL 抓取 PRD 内容和截图,按需求生成独立 PRD 文件")
    .requiredOption(
      "--url <url>",
      '蓝湖页面 URL,例如 "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx"',
    )
    .option("--project <name>", "项目名称")
    .option("--base-dir <dir>", "PRD 输出基目录(覆盖项目默认)")
    .option(
      "--feature-dir <dir>",
      "直接写入指定 feature 目录:prd.md + inputs/lanhu-snapshots + inputs/reference-docs(不按 yyyymm 暂存,仅限单个需求)",
    )
    .option("--pages <ids>", "要获取的需求 ID(逗号分隔),不指定则获取全部")
    .action(
      async (opts: {
        url: string;
        project?: string;
        baseDir?: string;
        featureDir?: string;
        pages?: string;
      }) => {
        const { runFetch } = await import("../integrations/lanhu/fetch.ts");
        await runFetch(opts.url, {
          project: opts.project,
          baseDir: opts.baseDir,
          featureDir: opts.featureDir,
          pagesFilter: opts.pages,
        });
      },
    );
}
