import type { Command } from "commander";
import { generateAutomationScripts } from "../lib/automation-case-generator.ts";
import { generateAutomationRunner, inspectAutomationCoverage } from "../lib/automation-contract.ts";
import { runAutomationLint } from "../lib/automation-lint.ts";
import { normalizeAutomation } from "../lib/automation-normalize.ts";
import { scaffoldAutomation } from "../lib/automation-scaffold.ts";

/** Build the `automation` command: scaffold + normalize a feature's automation dir. */
export function registerAutomation(program: Command): void {
  const automation = program.command("automation").description("自动化目录结构管理");

  automation
    .command("coverage <feature-dir>")
    .description("检查 cases YAML 与 automation/tests/cases 的逐条映射")
    .action((featureDir: string) => {
      const coverage = inspectAutomationCoverage(featureDir);
      console.log(JSON.stringify(coverage, null, 2));
      if (
<<<<<<< HEAD
        coverage.unmapped.length ||
        coverage.mappedNotImplemented.length ||
=======
        coverage.missingSpecFile.length ||
>>>>>>> origin/main
        coverage.missingScript.length ||
        coverage.orphanScripts.length ||
        coverage.duplicateSpecFile.length
      ) {
        process.exitCode = 1;
      }
    });

  automation
    .command("generate-cases <feature-dir>")
    .description("为缺失的 automation.spec_file 生成逐条 Playwright 脚本(默认 dry-run)")
<<<<<<< HEAD
    .option("--apply", "写入缺失脚本并更新 generated.ts", false)
=======
    .option("--apply", "写入缺失脚本并更新 generated.spec.ts", false)
>>>>>>> origin/main
    .action((featureDir: string, opts: { apply: boolean }) => {
      const result = generateAutomationScripts(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          {
            created: result.created.length,
            skipped: result.skipped.length,
            orphanScripts: result.orphanScripts,
            runner: result.runner,
            applied: opts.apply,
          },
          null,
          2,
        ),
      );
      if (result.orphanScripts.length > 0) process.exitCode = 1;
    });

  automation
    .command("generate <feature-dir>")
    .description("按 automation.spec_file 生成 runner import(默认 dry-run)")
<<<<<<< HEAD
    .option("--apply", "写入 generated.ts", false)
=======
    .option("--apply", "写入 generated.spec.ts", false)
>>>>>>> origin/main
    .action((featureDir: string, opts: { apply: boolean }) => {
      const result = generateAutomationRunner(featureDir, { apply: opts.apply });
      console.log(
        JSON.stringify(
          { path: result.path, imports: result.imports, applied: opts.apply },
          null,
          2,
        ),
      );
    });

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

  automation
    .command("lint [feature-dir]")
    .description("检查 Playwright 自动化代码规范")
    .option("--shared", "检查 workspace 项目的 _shared 页面、helper 与 fixture")
    .option("--exit-code", "存在 violation 时退出码为 1")
    .action((featureDir: string | undefined, opts: { shared?: boolean; exitCode?: boolean }) => {
      const report = runAutomationLint({
        featureDir,
        shared: opts.shared === true,
      });
      for (const v of report.violations) {
        console.log(`${v.path}:${v.line}:${v.rule}:${v.message}`);
      }
      for (const ignored of report.ignored) {
        console.log(`ignored ${ignored.path}:${ignored.line}: ${ignored.reason}`);
      }
      console.log(
        `[automation lint] files=${report.scannedFiles} violations=${report.violations.length} ignored=${report.ignored.length}`,
      );
      if (opts.exitCode && report.violations.length > 0) process.exitCode = 1;
    });
}
