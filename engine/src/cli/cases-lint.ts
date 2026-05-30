import { existsSync, readdirSync, statSync } from "node:fs";
import { isAbsolute, join, normalize, sep } from "node:path";
import { registerCasesCompare } from "@shared/cli/cases-compare.ts";
import { registerCasesValidate, runCasesValidate } from "@shared/cli/cases-validate.ts";
import { registerCasesVerify } from "@shared/cli/cases-verify.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { lintArchiveCaseQa } from "@shared/lint/archive-case-qa.ts";
import { lintCaseMdSourceRefLeak } from "@shared/lint/case-md-sourceref-leak.ts";
import { lintCaseTraceabilityHeader } from "@shared/lint/case-traceability-header.ts";
import { lintDebugFileNaming } from "@shared/lint/debug-file-naming.ts";
import { lintHandoffDoubleTrack } from "@shared/lint/handoff-double-track.ts";
import { lintHardcodePath } from "@shared/lint/hardcode-path.ts";
import { lintNoDebugInCases } from "@shared/lint/no-debug-in-cases.ts";
import { lintNoFeatureLocalHelpers } from "@shared/lint/no-feature-local-helpers.ts";
import { lintOwnerSkillDup } from "@shared/lint/owner-skill-dup.ts";
import { lintSourceRefRegistry } from "@shared/lint/source-ref-registry.ts";
import type { CaseLintViolation, Violation } from "@shared/lint/types.ts";
import {
  lintCasesInCasesDir,
  lintEnvProfileCompliance,
  lintNoDanglingHelpers,
  lintNoEnvLocal,
  lintRunnerIsAggregator,
  lintSessionCompliant,
  lintSpecStructureValid,
} from "@shared/lint/v2-quality-gates.ts";
import { lintWeakAssertion } from "@shared/lint/weak-assertion.ts";
import { Command } from "commander";
import { registerCasesE2e } from "./cases-e2e.ts";
import { runFeaturesLint } from "./features-lint.ts";

export async function lintLanhuBlockedDrafts(
  workspaceRoot: string,
  projects: string[],
  scopedFeatureId?: string,
): Promise<{ violations: CaseLintViolation[] }> {
  const violations: CaseLintViolation[] = [];
  for (const project of projects) {
    const featuresDir = join(workspaceRoot, project, "features");
    if (!existsSync(featuresDir)) continue;
    const featureIds = scopedFeatureId
      ? [scopedFeatureId]
      : readdirSync(featuresDir).filter((name) => statSync(join(featuresDir, name)).isDirectory());
    for (const featureId of featureIds) {
      if (!/^\d{4}-\d{2}-unresolved-lanhu-[a-z0-9]+$/.test(featureId)) continue;
      const result = await runCasesValidate({
        project,
        featureId,
        workspaceRoot,
        checkSourceRefs: [],
      });
      for (const issue of result.issues) {
        violations.push({
          file: issue.path ?? join(workspaceRoot, project, "features", featureId),
          lineNumber: 1,
          rule: issue.rule,
          matched: featureId,
          severity: "fail" as const,
          message: issue.message,
        });
      }
    }
  }
  return { violations };
}

export function buildCasesCommand(): Command {
  const cases = new Command("cases").description("用例级操作");
  registerCasesValidate(cases);
  cases
    .command("lint")
    .description("聚合用例级 lint 检查结果")
    .option("--exit-code", "exit non-zero on any violation", false)
    .option("--severity <level>", "filter exit-code by severity (all|fail-only)", "all")
    .option("--scope <p>", "scan path", join(repoRoot(), "workspace"))
    .action(async (opts: { exitCode: boolean; severity: string; scope: string }) => {
      const normalizedScope = normalize(
        isAbsolute(opts.scope) ? opts.scope : join(repoRoot(), opts.scope),
      );
      const featureMarker = `${sep}features${sep}`;
      const markerIndex = normalizedScope.indexOf(featureMarker);
      const workspaceMarker = `${sep}workspace${sep}`;
      const workspaceIndex = normalizedScope.indexOf(workspaceMarker);
      const scopedProject =
        workspaceIndex >= 0
          ? normalizedScope.slice(workspaceIndex + workspaceMarker.length).split(sep)[0]
          : undefined;
      const scopedFeatureId =
        markerIndex >= 0
          ? normalizedScope.slice(markerIndex + featureMarker.length).split(sep)[0]
          : undefined;
      const workspaceLintRoot = join(repoRoot(), "workspace");
      const isFeatureScoped = Boolean(scopedProject && scopedFeatureId);
      const projects =
        scopedProject && existsSync(join(workspaceLintRoot, scopedProject))
          ? [scopedProject]
          : readdirSync(workspaceLintRoot).filter((name) =>
              statSync(join(workspaceLintRoot, name)).isDirectory(),
            );
      // ── metadata/manifest quality gates ──
      const featuresLintResults = await Promise.all(
        projects.map((project) =>
          runFeaturesLint({
            project,
            workspaceRoot: workspaceLintRoot,
            featureId: scopedFeatureId,
          }).then((result) => ({ project, result })),
        ),
      );
      const featureLintViolations = featuresLintResults.flatMap(({ project, result }) =>
        result.violations.map((violation) => ({ project, violation })),
      );
      for (const { violation: v } of featureLintViolations) {
        console.log(`${v.feature} [${v.rule}] ${v.message}`);
      }
      const featureViolations = featureLintViolations.map(({ project, violation: v }) => ({
        file: join(repoRoot(), "workspace", project, "features", v.feature),
        lineNumber: 1,
        rule: v.rule,
        matched: v.feature,
        severity: "fail" as const,
        message: v.message,
      }));
      const lanhuBlockedDraftReport = await lintLanhuBlockedDrafts(
        workspaceLintRoot,
        projects,
        scopedFeatureId,
      );
      const caseMdSourceRefLeakReport = await lintCaseMdSourceRefLeak(
        workspaceLintRoot,
        projects,
        scopedFeatureId,
      );

      // ── case-level lint checks ──
      const workspaceWideReports = isFeatureScoped
        ? []
        : [
            lintOwnerSkillDup(join(repoRoot(), ".claude", "agents")),
            lintNoEnvLocal(workspaceLintRoot),
            lintRunnerIsAggregator(workspaceLintRoot),
            lintCasesInCasesDir(workspaceLintRoot),
            lintSessionCompliant(workspaceLintRoot),
            lintEnvProfileCompliance(workspaceLintRoot),
            lintNoDanglingHelpers(workspaceLintRoot),
            lintSpecStructureValid(workspaceLintRoot),
            lintSourceRefRegistry(workspaceLintRoot),
          ];
      const archiveOutputRoots =
        scopedProject && scopedFeatureId
          ? [join(workspaceLintRoot, scopedProject, "features", scopedFeatureId)]
          : projects.map((project) => join(workspaceLintRoot, project, "features"));
      const reports: Array<{ violations: Array<CaseLintViolation | Violation> }> = [
        lanhuBlockedDraftReport,
        caseMdSourceRefLeakReport,
        lintWeakAssertion(opts.scope),
        lintHardcodePath(opts.scope),
        lintDebugFileNaming(opts.scope),
        lintCaseTraceabilityHeader(opts.scope),
        lintNoFeatureLocalHelpers(opts.scope),
        lintNoDebugInCases(opts.scope),
        lintHandoffDoubleTrack(opts.scope),
        ...workspaceWideReports,
        ...archiveOutputRoots.map((root) => lintArchiveCaseQa(root)),
      ];
      const all = [...featureViolations, ...reports.flatMap((r) => r.violations)];
      for (const v of all) {
        const rel = v.file.replace(repoRoot(), ".");
        const line = "lineNumber" in v && v.lineNumber ? v.lineNumber : "-";
        const detail = ("matched" in v && v.matched) || v.message || "";
        console.log(`${rel}:${line} [${v.rule}] ${detail}`);
      }
      console.log(`\n[cases lint] violations=${all.length}`);
      const exitableViolations =
        opts.severity === "fail-only" ? all.filter((v) => v.severity !== "warn") : all;
      if (opts.exitCode && exitableViolations.length > 0) process.exit(1);
    });
  registerCasesCompare(cases);
  registerCasesE2e(cases);
  registerCasesVerify(cases);
  return cases;
}
