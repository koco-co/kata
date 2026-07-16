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
 * Each module is a script under _shared/cli or a skill's scripts/ that exports
 * a commander `program`. Registered below via addCommand().
 */

import { program as archiveGen } from "@shared/cli/archive-gen.ts";
import { program as pluginLoader } from "@shared/cli/plugin-loader.ts";
import { program as repoSync } from "@shared/cli/repo-sync.ts";
import { program as ruleLoader } from "@shared/cli/rule-loader.ts";
import { program as sourceRef } from "@shared/cli/source-ref.ts";
import { program as xmindGen } from "@shared/cli/xmind-gen.ts";
import { program as xmindPatch } from "@shared/cli/xmind-patch.ts";
import { initEnv } from "@shared/lib/env.ts";
import { repoRoot } from "@shared/lib/paths.ts";
// 大部分模块静态加载（无昂贵依赖）
import { program as autoFixer } from "@skills/case-draft/scripts/auto-fixer.ts";
import { program as caseDraft } from "@skills/case-draft/scripts/case-draft.ts";
import { program as caseSignalAnalyzer } from "@skills/case-draft/scripts/case-signal-analyzer.ts";
import { program as caseStrategyResolver } from "@skills/case-draft/scripts/case-strategy-resolver.ts";
import { program as discuss } from "@skills/case-draft/scripts/discuss.ts";
import { program as formatCheckScript } from "@skills/case-draft/scripts/format-check-script.ts";
import { program as formatReportLocator } from "@skills/case-draft/scripts/format-report-locator.ts";
import { program as prdFrontmatter } from "@skills/case-draft/scripts/prd-frontmatter.ts";
import { program as searchFilter } from "@skills/case-draft/scripts/search-filter.ts";
import { program as sourceAnalyze } from "@skills/case-draft/scripts/source-analyze.ts";
import { program as writerContextBuilder } from "@skills/case-draft/scripts/writer-context-builder.ts";
import { program as historyConvert } from "@skills/case-edit/scripts/history-convert.ts";
import { program as defectReport } from "@skills/defect-analyze/scripts/defect-report.ts";
import { program as scanReport } from "@skills/defect-analyze/scripts/scan-report.ts";
import { program as managingProjectKnowledge } from "@skills/knowledge-curate/scripts/knowledge-curate.ts";
import { program as buildCaseTasks } from "@skills/playwright-automation/scripts/build-case-tasks.ts";
import { program as reportToPdf } from "@skills/playwright-automation/scripts/report-to-pdf.ts";
import { program as runTestsNotify } from "@skills/playwright-automation/scripts/run-tests-notify.ts";
import { program as createProject } from "@skills/workspace-manage/scripts/create-project.ts";
import { program as initWizard } from "@skills/workspace-manage/scripts/init-wizard.ts";
import { Command } from "commander";

const kata = new Command()
  .name("kata")
  .description("kata 统一命令行：管理需求、用例、自动化与项目工作区")
  .showHelpAfterError()
  .showSuggestionAfterError();

archiveGen.name("archives").description("测试用例归档文件的生成、校验与检索");
managingProjectKnowledge.name("knowledge").description("项目知识的查询、维护与检查");
ruleLoader.name("rules").description("项目规则的加载与合并");
scanReport.name("scans").description("代码扫描报告的创建、维护与渲染");
defectReport.name("defects").description("缺陷与冲突报告渲染");

historyConvert.name("convert").description("将历史 CSV 或 XMind 转换为 Archive Markdown");
const history = new Command("history").description("历史用例转换").addCommand(historyConvert);

xmindGen.name("generate").description("根据 JSON 或 Archive Markdown 生成 XMind");
xmindPatch.name("xmind").description("XMind 用例的生成、查询与编辑");
xmindPatch.addCommand(xmindGen);

kata.addCommand(archiveGen);
kata.addCommand(autoFixer);
kata.addCommand(buildCaseTasks);
kata.addCommand(caseDraft);
kata.addCommand(caseSignalAnalyzer);
kata.addCommand(caseStrategyResolver);
kata.addCommand(createProject);
kata.addCommand(discuss);
kata.addCommand(formatCheckScript);
kata.addCommand(formatReportLocator);
kata.addCommand(history);
kata.addCommand(initWizard);
kata.addCommand(managingProjectKnowledge);
kata.addCommand(pluginLoader);
kata.addCommand(prdFrontmatter);
kata.addCommand(repoSync);
kata.addCommand(reportToPdf);
kata.addCommand(ruleLoader);
kata.addCommand(scanReport);
kata.addCommand(defectReport);
kata.addCommand(runTestsNotify);
kata.addCommand(searchFilter);
kata.addCommand(sourceAnalyze);
kata.addCommand(sourceRef);
kata.addCommand(writerContextBuilder);
kata.addCommand(xmindPatch);

// ── Noun-verb style commands ─────────────────────────────────
import { buildAgentsCommand } from "@shared/cli/agents-audit.ts";
import { buildAutomationCommand } from "@shared/cli/automation.ts";
import { buildCasesCommand } from "@shared/cli/cases-lint.ts";
import { buildEnvCommand } from "@shared/cli/env.ts";
import { buildFeaturesCommand } from "@shared/cli/features.ts";
import { buildHandoffCommand } from "@shared/cli/handoff.ts";
import { buildPathsCommand } from "@shared/cli/paths-audit.ts";
import { buildResultsCommand } from "@shared/cli/results.ts";
import { buildSafetyCommand } from "@shared/cli/safety-audit-command.ts";
import { buildSkillsCommand } from "@shared/cli/skill-audit.ts";

kata.addCommand(buildAgentsCommand());
kata.addCommand(buildAutomationCommand());
kata.addCommand(buildCasesCommand());
kata.addCommand(buildPathsCommand());
kata.addCommand(buildSkillsCommand());
kata.addCommand(buildSafetyCommand());
kata.addCommand(buildFeaturesCommand());
kata.addCommand(buildResultsCommand());
kata.addCommand(buildHandoffCommand());
kata.addCommand(buildEnvCommand());

// ── Test Case Flow ──────────────────────────────────────────
import { registerTestCaseFlow } from "@skills/case-draft/scripts/test-case-flow.ts";

registerTestCaseFlow(kata);

const publicV2Commands = new Set([
  "agents",
  "automation",
  "cases",
  "paths",
  "skills",
  "safety",
  "features",
  "results",
  "handoff",
  "env",
  "project",
  "repos",
  "workspace",
  "archives",
  "case-tasks",
  "defects",
  "history",
  "knowledge",
  "rules",
  "scans",
  "xmind",
]);
for (const command of kata.commands) {
  if (!publicV2Commands.has(command.name())) {
    // commander 14 keeps the hidden flag on the internal `_hidden` field
    // (public path `addCommand(cmd, { hidden: true })` sets the same field);
    // narrow-cast to write it without rewriting every addCommand call.
    (command as Command & { _hidden: boolean })._hidden = true;
  }
}

function localizeHelp(command: Command): void {
  command.helpOption("-h, --help", "显示当前命令帮助");
  if (command.commands.some((child) => !(child as Command & { _hidden?: boolean })._hidden)) {
    command.addHelpCommand("help [command]", "显示指定命令帮助");
  }
  for (const child of command.commands) {
    if (!(child as Command & { _hidden?: boolean })._hidden) localizeHelp(child);
  }
}

localizeHelp(kata);

initEnv({ cwd: repoRoot() });

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
