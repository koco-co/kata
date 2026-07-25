import type { Command } from "commander";
import { normalizeAutomation } from "../lib/automation-normalize.ts";
import { scaffoldAutomation } from "../lib/automation-scaffold.ts";

/** Build the `automation` command: scaffold + normalize a feature's automation dir. */
export function registerAutomation(program: Command): void {
  const automation = program.command("automation").description("自动化目录结构管理");

  automation
    .command("scaffold <feature-dir>")
    .description("创建自动化骨架(tests/cases、runners、pages、fixtures、sql)")
    .option("--force", "覆盖已存在文件", false)
    .action((featureDir: string, opts: { force: boolean }) => {
      const r = scaffoldAutomation(featureDir, { force: opts.force });
      console.log(
        `[scaffold] created=${r.created.length} skipped=${r.skipped.length} overwritten=${r.overwritten.length}`,
      );
    });

  automation
    .command("normalize <feature-dir>")
    .description("修复自动化目录违规(stray 文件移入备份)")
    .option("--apply", "执行修复(默认 dry-run)", false)
    .action((featureDir: string, opts: { apply: boolean }) => {
      const report = normalizeAutomation(featureDir, { dryRun: !opts.apply, apply: opts.apply });
      if (!opts.apply && report.moved.length > 0) {
        console.log("[dry-run] 将移动以下文件到备份:");
        for (const m of report.moved) console.log(`  ${m.from} -> ${m.to}`);
      }
      console.log(`[normalize] violations=${report.violations} moved=${report.moved.length}`);
    });
}
