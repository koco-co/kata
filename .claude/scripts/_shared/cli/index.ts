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

const kata = new Command().name("kata").description("kata unified CLI").showHelpAfterError();

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
kata.addCommand(historyConvert);
kata.addCommand(initWizard);
kata.addCommand(managingProjectKnowledge);
kata.addCommand(pluginLoader);
kata.addCommand(prdFrontmatter);
kata.addCommand(repoSync);
kata.addCommand(reportToPdf);
kata.addCommand(ruleLoader);
kata.addCommand(scanReport);
kata.addCommand(defectReport);
// knowledge-keeper: knowledge-curate 的别名
kata.addCommand(
  new Command("knowledge-keeper")
    .description("Knowledge management CLI (alias for knowledge-curate)")
    .allowUnknownOption()
    .allowExcessArguments(true)
    .action(async (_opts: unknown, _command: Command) => {
      // Commander's parseAsync requires argv[0] and argv[1] as program path placeholders
      const args = process.argv.slice(2).filter((a) => a !== "knowledge-keeper");
      await managingProjectKnowledge.parseAsync(["node", "kata", ...args]);
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
import { buildAgentsCommand } from "@shared/cli/agents-audit.ts";
import { buildCasesCommand } from "@shared/cli/cases-lint.ts";
import { buildEnvCommand } from "@shared/cli/env.ts";
import { buildFeaturesCommand } from "@shared/cli/features.ts";
import { buildHandoffCommand } from "@shared/cli/handoff.ts";
import { buildPathsCommand } from "@shared/cli/paths-audit.ts";
import { buildResultsCommand } from "@shared/cli/results.ts";
import { buildSafetyCommand } from "@shared/cli/safety-audit-command.ts";
import { buildSkillsCommand } from "@shared/cli/skill-audit.ts";

kata.addCommand(buildAgentsCommand());
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
  "cases",
  "paths",
  "skills",
  "safety",
  "features",
  "results",
  "handoff",
  "env",
]);
for (const command of kata.commands) {
  if (!publicV2Commands.has(command.name())) {
    // commander 14 keeps the hidden flag on the internal `_hidden` field
    // (public path `addCommand(cmd, { hidden: true })` sets the same field);
    // narrow-cast to write it without rewriting every addCommand call.
    (command as Command & { _hidden: boolean })._hidden = true;
  }
}

initEnv();

kata.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`[kata] Unexpected error: ${err}\n`);
  process.exit(1);
});

export { kata };
