import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, sep } from "node:path";
import { registerCasesCompare } from "@shared/cli/cases-compare.ts";
import { registerCasesConvert } from "@shared/cli/cases-convert.ts";
import { registerCasesE2e } from "@shared/cli/cases-e2e.ts";
import { registerCasesValidate, runCasesValidate } from "@shared/cli/cases-validate.ts";
import { registerCasesVerify } from "@shared/cli/cases-verify.ts";
import { runFeaturesLint } from "@shared/cli/features-lint.ts";
import { type FeatureDirEntry, listFeatureDirs } from "@shared/lib/features/layout.ts";
import { repoRoot } from "@shared/lib/paths.ts";
import { lintArchiveCaseQa } from "@shared/lint/archive-case-qa.ts";
import { lintCaseMdSourceRefLeak } from "@shared/lint/case-md-sourceref-leak.ts";
import { lintCaseTraceabilityHeader } from "@shared/lint/case-traceability-header.ts";
import { lintDebugFileNaming } from "@shared/lint/debug-file-naming.ts";
import {
  lintAutomationTopLayout,
  lintFeatureRootEntry,
  lintFeatureRootLayout,
} from "@shared/lint/feature-root-layout.ts";
import { lintHandoffDoubleTrack } from "@shared/lint/handoff-double-track.ts";
import { lintHardcodePath } from "@shared/lint/hardcode-path.ts";
import { lintNoDebugInCases } from "@shared/lint/no-debug-in-cases.ts";
import { lintNoFeatureLocalHelpers } from "@shared/lint/no-feature-local-helpers.ts";
import { lintOwnerSkillDup } from "@shared/lint/owner-skill-dup.ts";
import { lintSourceRefRegistry } from "@shared/lint/source-ref-registry.ts";
import { lintFeatureTests } from "@shared/lint/tests-layout.ts";
import type { CaseLintViolation, Violation } from "@shared/lint/types.ts";
import {
  lintCasesInCasesDir,
  lintCasesInCasesDirForFeature,
  lintEnvProfileCompliance,
  lintNoDanglingHelpers,
  lintNoEnvLocal,
  lintRunnerIsAggregator,
  lintRunnerIsAggregatorForFeature,
  lintSessionCompliant,
  lintSpecStructureValid,
} from "@shared/lint/v2-quality-gates.ts";
import { lintWeakAssertion } from "@shared/lint/weak-assertion.ts";
import { Command, Option } from "commander";

export async function lintLanhuBlockedDrafts(
  workspaceRoot: string,
  projects: string[],
  scopedFeatureId?: string,
): Promise<{ violations: CaseLintViolation[] }> {
  const violations: CaseLintViolation[] = [];
  for (const project of projects) {
    const featuresDir = join(workspaceRoot, project, "features");
    if (!existsSync(featuresDir)) continue;
    // listFeatureDirs 扫描两层结构（版本层 + legacy-flat），过滤 unresolved lanhu
    const allEntries = scopedFeatureId
      ? listFeatureDirs(featuresDir).filter((e) => e.dirName === scopedFeatureId)
      : listFeatureDirs(featuresDir);
    for (const entry of allEntries) {
      if (!/^\d{4}-\d{2}-unresolved-lanhu-[a-z0-9]+$/.test(entry.dirName)) continue;
      const result = await runCasesValidate({
        project,
        featureId: entry.dirName,
        workspaceRoot,
        checkSourceRefs: [],
      });
      for (const issue of result.issues) {
        violations.push({
          file: issue.path ?? entry.dir,
          lineNumber: 1,
          rule: issue.rule,
          matched: entry.dirName,
          severity: "fail" as const,
          message: issue.message,
        });
      }
    }
  }
  return { violations };
}

export interface CasesLintScopeResolution {
  normalizedScope: string;
  workspaceLintRoot: string;
  projects: string[];
  scopedProject?: string;
  scopedFeatureEntry?: FeatureDirEntry;
  scopedFeatureId?: string;
  isFeatureScoped: boolean;
}

function normalizeCasesLintScope(scope: string, workspaceLintRoot: string): string {
  if (isAbsolute(scope)) return normalize(scope);
  const normalizedRelativeScope = normalize(scope);
  const parts = normalizedRelativeScope.split(sep);
  if (parts[0] === "workspace") {
    return normalize(join(dirname(workspaceLintRoot), normalizedRelativeScope));
  }
  if (parts.length >= 2 && parts[1] === "features") {
    return normalize(join(workspaceLintRoot, normalizedRelativeScope));
  }
  return normalize(join(repoRoot(), normalizedRelativeScope));
}

function isPathInsideOrSame(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function resolveCasesLintScope(
  scope: string,
  workspaceLintRoot = join(repoRoot(), "workspace"),
): CasesLintScopeResolution {
  const normalizedWorkspaceRoot = normalize(workspaceLintRoot);
  const normalizedScope = normalizeCasesLintScope(scope, normalizedWorkspaceRoot);
  const relToWorkspace = relative(normalizedWorkspaceRoot, normalizedScope);
  const scopedProject =
    relToWorkspace && !relToWorkspace.startsWith("..") && !isAbsolute(relToWorkspace)
      ? relToWorkspace.split(sep)[0]
      : undefined;
  const projects =
    scopedProject && existsSync(join(normalizedWorkspaceRoot, scopedProject))
      ? [scopedProject]
      : readdirSync(normalizedWorkspaceRoot).filter((name) =>
          statSync(join(normalizedWorkspaceRoot, name)).isDirectory(),
        );
  const scopedFeatureEntry =
    scopedProject && relToWorkspace.split(sep)[1] === "features"
      ? listFeatureDirs(join(normalizedWorkspaceRoot, scopedProject, "features")).find((entry) =>
          isPathInsideOrSame(normalizedScope, normalize(entry.dir)),
        )
      : undefined;
  return {
    normalizedScope,
    workspaceLintRoot: normalizedWorkspaceRoot,
    projects,
    scopedProject,
    scopedFeatureEntry,
    scopedFeatureId: scopedFeatureEntry?.dirName,
    isFeatureScoped: Boolean(scopedProject && scopedFeatureEntry),
  };
}

export function buildCasesCommand(): Command {
  const cases = new Command("cases").description("用例级操作");
  registerCasesValidate(cases);
  cases
    .command("lint")
    .description("聚合用例级 lint 检查结果")
    .option("--exit-code", "发现违规时返回非零退出码", false)
    .addOption(
      new Option("--severity <level>", "决定退出码所依据的违规级别")
        .choices(["all", "fail-only"])
        .default("all"),
    )
    .option("--scope <path>", "扫描路径", join(repoRoot(), "workspace"))
    .action(async (opts: { exitCode: boolean; severity: string; scope: string }) => {
      const { workspaceLintRoot, projects, scopedFeatureEntry, scopedFeatureId, isFeatureScoped } =
        resolveCasesLintScope(opts.scope);
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
        file:
          scopedFeatureEntry && v.feature === scopedFeatureEntry.dirName
            ? scopedFeatureEntry.dir
            : join(repoRoot(), "workspace", project, "features", v.feature),
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
            // L12: feature root layout check (runs for each project's features dir)
            ...projects.map((project) => ({
              violations: lintFeatureRootLayout(join(workspaceLintRoot, project, "features")),
            })),
            // L13: automation/ 顶层散落文件检查（workspace-wide）
            ...projects.map((project) => ({
              violations: listFeatureDirs(join(workspaceLintRoot, project, "features")).flatMap(
                (entry) => lintAutomationTopLayout(join(entry.dir, "automation")),
              ),
            })),
          ];
      const scopedStructureReports: Array<{ violations: Array<CaseLintViolation | Violation> }> =
        [];
      if (scopedFeatureEntry) {
        const scopedTestsDir = join(scopedFeatureEntry.dir, "automation", "tests");
        if (existsSync(scopedTestsDir)) {
          scopedStructureReports.push({
            violations: lintFeatureTests(scopedTestsDir).violations.map((item) => ({
              file: item.file,
              lineNumber: 1,
              rule: `spec_structure_valid:${item.rule}`,
              matched: item.file,
              severity: "fail" as const,
              message: item.message,
            })),
          });
        }
        scopedStructureReports.push({
          violations: lintFeatureRootEntry(scopedFeatureEntry),
        });
        scopedStructureReports.push({
          violations: lintAutomationTopLayout(join(scopedFeatureEntry.dir, "automation")),
        });
        scopedStructureReports.push(
          lintRunnerIsAggregatorForFeature(scopedFeatureEntry.dir, "fail"),
        );
        scopedStructureReports.push(lintCasesInCasesDirForFeature(scopedFeatureEntry.dir, "fail"));
      }
      const archiveOutputRoots = scopedFeatureEntry
        ? [scopedFeatureEntry.dir]
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
        ...scopedStructureReports,
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
        opts.severity === "fail-only"
          ? all.filter((v) => !("severity" in v) || v.severity !== "warn")
          : all;
      if (opts.exitCode && exitableViolations.length > 0) process.exit(1);
    });
  registerCasesCompare(cases);
  registerCasesConvert(cases);
  registerCasesE2e(cases);
  registerCasesVerify(cases);
  return cases;
}
