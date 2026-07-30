import type { Command } from "commander";

/** Build the `lanhu` command: 蓝湖 PRD 抓取,供 case draft 工作流调用。 */
export function registerLanhu(program: Command): void {
  const lanhu = program.command("lanhu").description("蓝湖集成:PRD 内容与截图抓取");

  lanhu
    .command("fetch")
    .description("已弃用：兼容入口，转发到 kata prd extract")
    .requiredOption(
      "--url <url>",
      '蓝湖页面 URL,例如 "https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx"',
    )
    .option("--project <name>", "已弃用")
    .option("--base-dir <dir>", "已弃用")
    .option(
      "--feature-dir <dir>",
      "目标 feature 目录；证据写入 prd/evidence/，截图写入 prd/assets/",
    )
    .option("--pages <ids>", "已弃用；页面只取 URL 的 pageId")
    .action(
      async (opts: {
        url: string;
        project?: string;
        baseDir?: string;
        featureDir?: string;
        pages?: string;
      }) => {
        if (!opts.featureDir) {
          throw new Error("kata lanhu fetch 已弃用；请传 --feature-dir，或改用 kata prd extract");
        }
        if (opts.pages) {
          throw new Error("kata lanhu fetch 不再接受 --pages；需求页面由 URL 的 pageId 唯一定位");
        }
        process.stderr.write("[deprecated] kata lanhu fetch -> kata prd extract\n");
        const { runPrdExtract } = await import("../integrations/lanhu/fetch.ts");
        process.stdout.write(
          `${JSON.stringify(
            await runPrdExtract(opts.url, { featureDir: opts.featureDir }),
            null,
            2,
          )}\n`,
        );
      },
    );
}
