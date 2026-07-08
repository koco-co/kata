import { Command } from "commander";
import { normalizeAutomation } from "./automation-normalize.ts";
import { scaffoldAutomation } from "./automation-scaffold.ts";

function relPaths(featureDir: string, paths: string[]): string {
  return paths.map((path) => path.replace(`${featureDir}/`, "")).join(", ");
}

export function buildAutomationCommand(): Command {
  const automation = new Command("automation").description("自动化目录结构管理");

  automation
    .command("scaffold <feature-dir>")
    .description("创建自动化测试骨架（只补充缺失，不覆盖已有文件）")
    .option("--force", "覆盖 runners 壳文件")
    .action(async (featureDir: string, opts: { force?: boolean }) => {
      const result = scaffoldAutomation(featureDir, { force: opts.force ?? false });
      if (result.created.length) console.log(`created: ${relPaths(featureDir, result.created)}`);
      if (result.overwritten.length)
        console.log(`overwritten: ${relPaths(featureDir, result.overwritten)}`);
      if (result.skipped.length)
        console.log(`skipped (exists): ${relPaths(featureDir, result.skipped)}`);
    });

  automation
    .command("normalize <feature-dir>")
    .description("检测并修复自动化目录结构违规（默认 dry-run，--apply 才执行修复）")
    .option("--dry-run", "只报告不移动文件（默认）")
    .option("--apply", "执行修复（stray 文件移动到 runs/<ts>/normalized/ 备份）")
    .action(async (featureDir: string, opts: { dryRun?: boolean; apply?: boolean }) => {
      const dryRun = !opts.apply || opts.dryRun === true;
      const report = normalizeAutomation(featureDir, { dryRun, apply: !!opts.apply });
      if (dryRun) {
        console.log("[dry-run] 将移动以下文件到 runs/<ts>/normalized/：");
        for (const path of report.moved) console.log(`  ${path}`);
        console.log("[dry-run] 不可自动修复：");
        for (const item of report.unfixable) console.log(`  ${item.path} - ${item.reason}`);
        if (report.moved.length === 0 && report.unfixable.length === 0) {
          console.log("  (无违规)");
        }
        console.log(`\n[normalize] violations=${report.violations}`);
        if (report.moved.length > 0) {
          console.log("\n使用 --apply 执行修复（文件将移入 runs/<ts>/normalized/ 备份）。");
        }
      } else {
        for (const path of report.moved) console.log(`moved: ${path} -> ${report.backupDir}`);
        for (const item of report.unfixable)
          console.log(`unfixable: ${item.path} - ${item.reason}`);
        console.log(
          `\n[normalize] violations=${report.violations} | moved=${report.moved.length} | backup=${report.backupDir}`,
        );
      }
      if (report.unfixable.length > 0) process.exit(1);
    });

  return automation;
}
