import { CASE_FORMATS, type CaseFormat, convertCases } from "@shared/cli/case-convert/formats.ts";
import { outputJson } from "@shared/lib/cli.ts";
import { type Command, Option } from "commander";

interface CasesConvertCliOptions {
  input: string;
  output?: string;
  to: CaseFormat;
  project?: string;
  requirement?: string;
  version?: string;
  force: boolean;
}

export function registerCasesConvert(cases: Command): void {
  cases
    .command("convert")
    .description("在 Archive Markdown、XLSX、CSV、XMind 与 JSON 用例格式间转换")
    .requiredOption("-i, --input <path>", "输入用例文件，格式由扩展名自动识别")
    .addOption(
      new Option("-t, --to <format>", "目标格式").choices([...CASE_FORMATS]).makeOptionMandatory(),
    )
    .option("-o, --output <path>", "输出文件；默认与输入同目录、同名并替换扩展名")
    .option("--project <name>", "输入格式缺少项目/产品线时使用的名称")
    .option("--requirement <name>", "输入格式缺少需求名称时使用的名称")
    .option("--version <version>", "输入格式缺少版本时使用的版本")
    .option("--force", "覆盖已存在的输出文件", false)
    .action(async (options: CasesConvertCliOptions) => {
      const result = await convertCases(options);
      outputJson(result);
    });
}
