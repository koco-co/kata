import { readFileSync } from "node:fs";
import { findCasesYaml } from "../cases/find.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import { validateCanonicalCases } from "../cases/schema.ts";
import type { CasesFile } from "../cases/types.ts";
import type { ExecutionCase } from "./execution-manifest.ts";
import { AUTOMATION_ID_RE } from "./run-layout.ts";

export type AutomationSelectionErrorCode =
  | "AUTOMATION_CASES_INVALID"
  | "AUTOMATION_EXECUTOR_AMBIGUOUS"
  | "AUTOMATION_EXECUTOR_ID_INVALID"
  | "AUTOMATION_EXECUTOR_NOT_ACTIVE";

/** A stable case-selection failure raised before allocating execution artifacts. */
export class AutomationSelectionError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: AutomationSelectionErrorCode,
    message: string,
  ) {
    super(`automation selection: ${message}`);
    this.name = "AutomationSelectionError";
  }
}

export interface SelectedAutomationExecution {
  readonly projectId: string;
  readonly featureId: string;
  readonly executorId: string;
  readonly automationEnv?: string;
  readonly cases: readonly ExecutionCase[];
}

export interface AutomationSelectionOptions {
  readonly includePlanned?: boolean;
}

function fail(code: AutomationSelectionErrorCode, message: string): never {
  throw new AutomationSelectionError(code, message);
}

function canonicalIdentities(file: CasesFile): { projectId: string; featureId: string } {
  const problems = validateCanonicalCases(file);
  if (problems.length > 0) {
    fail("AUTOMATION_CASES_INVALID", `canonical cases 校验失败: ${problems.join("；")}`);
  }
  const { project_id: projectId, feature_id: featureId } = file.meta;
  if (projectId === undefined || featureId === undefined) {
    fail("AUTOMATION_CASES_INVALID", "canonical cases 身份缺失");
  }
  return { projectId, featureId };
}

function implementationIsSelectable(state: "active" | "planned", includePlanned: boolean): boolean {
  return state === "active" || (includePlanned && state === "planned");
}

function selectableExecutors(file: CasesFile, includePlanned: boolean): readonly string[] {
  const executors = new Set<string>();
  for (const item of file.cases) {
    for (const implementation of item.automation?.implementations ?? []) {
      if (implementationIsSelectable(implementation.state, includePlanned)) {
        executors.add(implementation.executor);
      }
    }
  }
  return [...executors].sort();
}

function selectExecutor(
  file: CasesFile,
  requestedExecutor: string | undefined,
  includePlanned: boolean,
): string {
  if (requestedExecutor !== undefined && !AUTOMATION_ID_RE.test(requestedExecutor)) {
    fail("AUTOMATION_EXECUTOR_ID_INVALID", "--executor 必须是小写 kebab ID");
  }
  const available = selectableExecutors(file, includePlanned);
  const implementationLabel = includePlanned ? "active/planned" : "active";
  if (requestedExecutor !== undefined) {
    if (!available.includes(requestedExecutor)) {
      fail(
        "AUTOMATION_EXECUTOR_NOT_ACTIVE",
        available.length === 0
          ? `canonical cases 没有 ${implementationLabel} 自动化实现`
          : `指定 executor 没有 ${implementationLabel} 实现；available=${available.join(",")}`,
      );
    }
    return requestedExecutor;
  }
  if (available.length === 0) {
    fail(
      "AUTOMATION_EXECUTOR_NOT_ACTIVE",
      `canonical cases 没有 ${implementationLabel} 自动化实现`,
    );
  }
  if (available.length > 1) {
    fail(
      "AUTOMATION_EXECUTOR_AMBIGUOUS",
      `多个 executor 存在 ${implementationLabel} 实现，必须显式指定 --executor；available=${available.join(",")}`,
    );
  }
  return available[0] as string;
}

function selectedCases(
  file: CasesFile,
  featureId: string,
  executorId: string,
  includePlanned: boolean,
): readonly ExecutionCase[] {
  return file.cases.flatMap((item) => {
    const selected = item.automation?.implementations.some(
      (implementation) =>
        implementation.executor === executorId &&
        implementationIsSelectable(implementation.state, includePlanned),
    );
    if (!selected || item.automation === undefined) return [];
    return [
      {
        feature_id: featureId,
        case_id: item.id,
        title: item.title,
        effects: { ...item.automation.effects },
        business_record: { ...item.automation.business_record },
      },
    ];
  });
}

/** Select one executor's active cases from the single canonical YAML source. */
export function selectAutomationExecution(
  featureDir: string,
  requestedExecutor?: string,
  options: AutomationSelectionOptions = {},
): SelectedAutomationExecution {
  const { yamlPath } = findCasesYaml(featureDir);
  const file = parseCasesYaml(readFileSync(yamlPath, "utf8"));
  const { projectId, featureId } = canonicalIdentities(file);
  const includePlanned = options.includePlanned === true;
  const executorId = selectExecutor(file, requestedExecutor, includePlanned);
  return {
    projectId,
    featureId,
    executorId,
    ...(file.meta.automation_env === undefined ? {} : { automationEnv: file.meta.automation_env }),
    cases: selectedCases(file, featureId, executorId, includePlanned),
  };
}
