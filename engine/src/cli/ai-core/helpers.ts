import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { P0GoldenSummary } from "../../ai-core/evals.ts";
import { repoRoot } from "../../ai-core/paths.ts";
import {
  parseProjectionInventory,
  scanRuntimeFiles,
  validateProjectionInventory,
} from "../../ai-core/projection-inventory.ts";
import type { AiCoreIssue } from "../../ai-core/types.ts";
import { isAiCoreConfigEnvName, resolveAiCoreConfig } from "../../config/ai-core-config.ts";
import type { ProjectionRuntime } from "../../runtime/projection-targets.ts";

export function isProjectionRuntime(value: string): value is "all" | ProjectionRuntime {
  return value === "all" || value === "claude" || value === "codex";
}

export function aiCoreRuntimeEnv(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const scopedEnv: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(env)) {
    if (isAiCoreConfigEnvName(name)) {
      scopedEnv[name] = value;
    }
  }
  return scopedEnv;
}

export function failOnInvalidConfig(): boolean {
  const config = resolveAiCoreConfig({ env: aiCoreRuntimeEnv(process.env) });
  if (config.ok) return false;

  writeAiCoreIssues(config.issues);
  process.exitCode = 1;
  return true;
}

export function writeAiCoreIssues(issues: AiCoreIssue[]): void {
  for (const issue of issues) {
    process.stderr.write(`${issue.code}: ${issue.path}: ${issue.message}\n`);
  }
}

export function goldenSummaryIssues(
  summary: P0GoldenSummary,
  suite: "p0" | "ga-core" | "ga-runtime",
): AiCoreIssue[] {
  const failedResults = summary.results.filter((result) => !result.pass);
  const normalizedSuite = suite.replace(/-/g, "_");
  const issues = failedResults.flatMap((result) => [
    {
      code: `eval.${normalizedSuite}_failed`,
      severity: "error" as const,
      path: `.ai/core/evals/${suite}/golden.yaml#${result.id}`,
      message: [
        `${suite} golden eval failed: expected ${result.expectedStatus} [${result.expectedRuleIds.join(",")}]`,
        `but got ${result.actualStatus} [${result.actualRuleIds.join(",")}].`,
      ].join(" "),
    },
    ...result.issues,
  ]);

  if (!summary.pass && issues.length === 0) {
    issues.push({
      code: `eval.${normalizedSuite}_failed`,
      severity: "error",
      path: `.ai/core/evals/${suite}/golden.yaml`,
      message: `${suite} golden eval suite failed: ${summary.passed}/${summary.total} passed.`,
    });
  }

  return issues;
}

export function gateResultIssues(input: {
  name: string;
  path: string;
  result: { ok: boolean; issues: AiCoreIssue[] };
}): AiCoreIssue[] {
  if (input.result.ok || input.result.issues.length > 0) return input.result.issues;
  return [
    {
      code: "gate.check_failed",
      severity: "error",
      path: input.path,
      message: `${input.name} failed without reporting issues.`,
    },
  ];
}

export function dedupeAiCoreIssues(issues: AiCoreIssue[]): AiCoreIssue[] {
  const seen = new Set<string>();
  const deduped: AiCoreIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}\0${issue.path}\0${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(issue);
  }
  return deduped;
}

export function blockingAiCoreIssues(issues: AiCoreIssue[]): AiCoreIssue[] {
  return issues.filter((issue) => issue.severity === "error");
}

export function deterministicBaselineFailureIssues(
  failures: Array<{ area: string; reason: string }>,
): AiCoreIssue[] {
  return failures.map((failure) => ({
    code: "baseline.deterministic_failure",
    severity: "error",
    path: `.ai/core/evals/baseline-known-failures.json#${failure.area}`,
    message: `Deterministic baseline failure remains documented: ${failure.reason}`,
  }));
}

export function validateCurrentProjectionInventory(): {
  files: string[];
  inventory: ReturnType<typeof parseProjectionInventory>;
  issues: AiCoreIssue[];
  ok: boolean;
} {
  const root = repoRoot();
  const inventory = parseProjectionInventory(
    readFileSync(join(root, ".ai/core/runtimes/projection-inventory.yaml"), "utf8"),
  );
  const files = scanRuntimeFiles(root);
  const result = validateProjectionInventory({ files, inventory });
  return {
    files,
    inventory,
    issues: result.issues,
    ok: result.issues.every((issue) => issue.severity !== "error"),
  };
}
