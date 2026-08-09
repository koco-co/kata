import { readFileSync } from "node:fs";
import { findCasesYaml } from "../cases/find.ts";
import { CASE_ID_RE } from "../cases/naming.ts";
import { parseCasesYaml } from "../cases/parse.ts";
import { validateCanonicalCases } from "../cases/schema.ts";
import type { CaseItem, CasesFile } from "../cases/types.ts";
import type { ExecutionCase } from "./execution-manifest.ts";
import { AUTOMATION_ID_RE } from "./run-layout.ts";

export type AutomationSelectionErrorCode =
  | "AUTOMATION_CASE_DUPLICATE"
  | "AUTOMATION_CASE_ID_INVALID"
  | "AUTOMATION_CASE_NOT_FOUND"
  | "AUTOMATION_CASE_NOT_SELECTABLE"
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
  readonly caseIds?: readonly string[];
}

interface RequestedCaseSelection {
  readonly ids: ReadonlySet<string>;
  readonly items: readonly CaseItem[];
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

function requestedCases(
  file: CasesFile,
  requestedCaseIds: readonly string[] | undefined,
): RequestedCaseSelection | undefined {
  if (requestedCaseIds === undefined || requestedCaseIds.length === 0) return undefined;
  const ids = new Set<string>();
  for (const caseId of requestedCaseIds) {
    if (!CASE_ID_RE.test(caseId)) {
      fail("AUTOMATION_CASE_ID_INVALID", "--case 必须匹配 C0001 格式");
    }
    if (ids.has(caseId)) {
      fail("AUTOMATION_CASE_DUPLICATE", `--case 不得重复；case_id=${caseId}`);
    }
    ids.add(caseId);
  }
  const canonicalIds = new Set(file.cases.map((item) => item.id));
  const missing = requestedCaseIds.filter((caseId) => !canonicalIds.has(caseId));
  if (missing.length > 0) {
    fail(
      "AUTOMATION_CASE_NOT_FOUND",
      `canonical cases 中不存在请求的 case_id；case_ids=${missing.join(",")}`,
    );
  }
  return {
    ids,
    items: file.cases.filter((item) => ids.has(item.id)),
  };
}

function selectableExecutors(
  items: readonly CaseItem[],
  includePlanned: boolean,
): readonly string[] {
  const executors = new Set<string>();
  for (const item of items) {
    for (const implementation of item.automation?.implementations ?? []) {
      if (implementationIsSelectable(implementation.state, includePlanned)) {
        executors.add(implementation.executor);
      }
    }
  }
  return [...executors].sort();
}

function commonSelectableExecutors(
  items: readonly CaseItem[],
  includePlanned: boolean,
): readonly string[] {
  const [first, ...rest] = items;
  if (first === undefined) return [];
  const available = selectableExecutors([first], includePlanned);
  return available.filter((executorId) =>
    rest.every((item) =>
      item.automation?.implementations.some(
        (implementation) =>
          implementation.executor === executorId &&
          implementationIsSelectable(implementation.state, includePlanned),
      ),
    ),
  );
}

function unselectableCaseIds(
  items: readonly CaseItem[],
  executorId: string,
  includePlanned: boolean,
): readonly string[] {
  return items.flatMap((item) => {
    const selectable = item.automation?.implementations.some(
      (implementation) =>
        implementation.executor === executorId &&
        implementationIsSelectable(implementation.state, includePlanned),
    );
    return selectable ? [] : [item.id];
  });
}

function selectExecutor(
  file: CasesFile,
  requestedExecutor: string | undefined,
  includePlanned: boolean,
  requested: RequestedCaseSelection | undefined,
): string {
  if (requestedExecutor !== undefined && !AUTOMATION_ID_RE.test(requestedExecutor)) {
    fail("AUTOMATION_EXECUTOR_ID_INVALID", "--executor 必须是小写 kebab ID");
  }
  const implementationLabel = includePlanned ? "active/planned" : "active";
  if (requested !== undefined && requestedExecutor !== undefined) {
    const unselectable = unselectableCaseIds(requested.items, requestedExecutor, includePlanned);
    if (unselectable.length > 0) {
      fail(
        "AUTOMATION_CASE_NOT_SELECTABLE",
        `请求的 case 对 executor=${requestedExecutor} 没有 ${implementationLabel} 实现；case_ids=${unselectable.join(",")}`,
      );
    }
    return requestedExecutor;
  }
  const available =
    requested === undefined
      ? selectableExecutors(file.cases, includePlanned)
      : commonSelectableExecutors(requested.items, includePlanned);
  if (requested !== undefined && available.length === 0) {
    fail(
      "AUTOMATION_CASE_NOT_SELECTABLE",
      `请求的 case 无法由同一 ${implementationLabel} executor 选择；case_ids=${requested.items
        .map((item) => item.id)
        .join(",")}`,
    );
  }
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
  requested: RequestedCaseSelection | undefined,
): readonly ExecutionCase[] {
  return file.cases.flatMap((item) => {
    if (requested !== undefined && !requested.ids.has(item.id)) return [];
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
  const requested = requestedCases(file, options.caseIds);
  const executorId = selectExecutor(file, requestedExecutor, includePlanned, requested);
  return {
    projectId,
    featureId,
    executorId,
    ...(file.meta.automation_env === undefined ? {} : { automationEnv: file.meta.automation_env }),
    cases: selectedCases(file, featureId, executorId, includePlanned, requested),
  };
}
