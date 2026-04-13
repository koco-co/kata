#!/usr/bin/env bun
/**
 * kata.ts — Unified entry point for kata scripts.
 *
 * Usage:
 *   kata <noun> <verb> [options]
 *   kata --help                       # list all commands
 *   kata <noun> --help                # list command's verbs
 *   kata <noun> <verb> --help         # show verb options (incl. choices)
 *
 * Setup (one-time, from repo root):
 *   bun install && bun link
 *   # afterwards, `kata` is available globally via ~/.bun/bin/
 *
 * Each module is an existing script in engine/src/ that exports a
 * commander `program`. Registered below via addCommand().
 */

import { Command } from "commander";
import { initEnv } from "../../lib/env.ts";

// 大部分模块静态加载（无昂贵依赖）
import { program as archiveGen } from "../archive-gen.ts";
import { program as autoFixer } from "../auto-fixer.ts";
import { program as caseDraft } from "../case-draft.ts";
import { program as caseSignalAnalyzer } from "../case-signal-analyzer.ts";
import { program as caseStrategyResolver } from "../case-strategy-resolver.ts";
import { program as config } from "../config.ts";
import { program as createProject } from "../create-project.ts";
import { program as discuss } from "../discuss.ts";
import { program as formatCheckScript } from "../format-check-script.ts";
import { program as formatReportLocator } from "../format-report-locator.ts";
import { program as historyConvert } from "../history-convert.ts";
import { program as imageCompress } from "../image-compress.ts";
import { program as initWizard } from "../init-wizard.ts";
import { program as managingProjectKnowledge } from "../knowledge-curate.ts";
import { program as plan } from "../plan.ts";
import { program as pluginLoader } from "../plugin-loader.ts";
import { program as prdFrontmatter } from "../prd-frontmatter.ts";
import { program as progress } from "../progress.ts";
import { program as repoProfile } from "../repo-profile.ts";
import { program as repoSync } from "../repo-sync.ts";
import { program as reportToPdf } from "../report-to-pdf.ts";
import { program as ruleLoader } from "../rule-loader.ts";
import { program as runTestsNotify } from "../run-tests-notify.ts";
import { program as scanReport } from "../scan-report.ts";
import { program as searchFilter } from "../search-filter.ts";
import { program as sourceAnalyze } from "../source-analyze.ts";
import { program as sourceRef } from "../source-ref.ts";
import { program as writerContextBuilder } from "../writer-context-builder.ts";
import { program as xmindGen } from "../xmind-gen.ts";
import { program as xmindPatch } from "../xmind-patch.ts";

const kata = new Command()
  .name("kata")
  .description("kata 统一 CLI — 调度 engine/src/ 下的脚本")
  .showHelpAfterError();

kata.addCommand(archiveGen);
kata.addCommand(autoFixer);
kata.addCommand(caseDraft);
kata.addCommand(caseSignalAnalyzer);
kata.addCommand(caseStrategyResolver);
kata.addCommand(config);
kata.addCommand(createProject);
kata.addCommand(discuss);
kata.addCommand(formatCheckScript);
kata.addCommand(formatReportLocator);
kata.addCommand(historyConvert);
kata.addCommand(imageCompress);
kata.addCommand(initWizard);
kata.addCommand(managingProjectKnowledge);
kata.addCommand(plan);
kata.addCommand(pluginLoader);
kata.addCommand(prdFrontmatter);
kata.addCommand(progress);
kata.addCommand(repoProfile);
kata.addCommand(repoSync);
kata.addCommand(reportToPdf);
kata.addCommand(ruleLoader);
kata.addCommand(scanReport);
// db-cli 懒加载：仅在调用 db 命令时导入（避免 better-sqlite3 缺失导致全部命令无法启动）
kata.addCommand(
  new Command("db")
    .description("数据库操作")
    .allowUnknownOption()
    .allowExcessArguments(true)
    .action(async (_opts: unknown, _command: Command) => {
      const { program: dbCliModule } = await import("../db-cli.ts");
      // 用真实命令替换当前占位命令
      await dbCliModule.parseAsync(process.argv.slice(2).filter((a) => a !== "db"));
    }),
);
// knowledge-keeper: knowledge-curate 的别名
kata.addCommand(
  new Command("knowledge-keeper")
    .description("知识沉淀 CLI（knowledge-curate 别名）")
    .allowUnknownOption()
    .allowExcessArguments(true)
    .action((_opts: unknown, _command: Command) => {
      // Commander's parseAsync requires argv[0] and argv[1] as program path placeholders
      const args = process.argv.slice(2).filter((a) => a !== "knowledge-keeper");
      return managingProjectKnowledge.parseAsync(["node", "kata", ...args]);
    }),
);
kata.addCommand(runTestsNotify);
kata.addCommand(searchFilter);
kata.addCommand(sourceAnalyze);
kata.addCommand(sourceRef);
kata.addCommand(writerContextBuilder);
kata.addCommand(xmindGen);
kata.addCommand(xmindPatch);

// ── Noun-verb style commands ─────────────────────────────────
import { buildAgentsCommand } from "./agents-audit.ts";
import { buildAiCoreCommand } from "./ai-core.ts";
import { buildCasesCommand } from "./cases-lint.ts";
import { buildCodemodCommand } from "./codemod-apply.ts";
import { buildEnvCommand } from "./env.ts";
import { buildFeaturesCommand } from "./features.ts";
import { buildHandoffCommand } from "./handoff.ts";
import { buildPathsCommand } from "./paths-audit.ts";
import { buildResultsCommand } from "./results.ts";
import { buildSafetyCommand } from "./safety-audit-command.ts";
import { buildSkillsCommand } from "./skill-audit.ts";

kata.addCommand(buildAgentsCommand());
kata.addCommand(buildCasesCommand());
kata.addCommand(buildPathsCommand());
kata.addCommand(buildSkillsCommand());
kata.addCommand(buildSafetyCommand());
kata.addCommand(buildCodemodCommand());
kata.addCommand(buildAiCoreCommand());
kata.addCommand(buildFeaturesCommand());
kata.addCommand(buildResultsCommand());
kata.addCommand(buildHandoffCommand());
kata.addCommand(buildEnvCommand());

// ── Test bucket audit ────────────────────────────────────────
import { registerTestBucketAudit } from "./test-bucket-audit.ts";

registerTestBucketAudit(kata);

// ── Test Case Flow ──────────────────────────────────────────
import { registerTestCaseFlow } from "../test-case-flow.ts";

registerTestCaseFlow(kata);

const publicV2Commands = new Set([
  "agents",
  "cases",
  "paths",
  "skills",
  "safety",
  "codemod",
  "ai-core",
  "features",
  "results",
  "handoff",
  "env",
]);
for (const command of kata.commands) {
  if (!publicV2Commands.has(command.name())) {
    command._hidden = true;
  }
}

const rootCommand = process.argv[2];
if (rootCommand !== "ai-core") {
  initEnv();
}

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
