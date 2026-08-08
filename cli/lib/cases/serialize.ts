import { isMap, isScalar, isSeq, parseDocument, Scalar, stringify } from "yaml";
import { normalizeCasesFile, normalizeStructuredText } from "./normalize.ts";
import type { CaseItem, CasesFile } from "./types.ts";

function serializedCase(item: CaseItem) {
  return {
    case_id: item.id,
    ...(item.automation ? { automation: item.automation } : {}),
    ...(item.requirement_id ? { requirement_id: item.requirement_id } : {}),
    title: item.title,
    priority: item.priority,
    ...(item.precondition ? { precondition: item.precondition } : {}),
    steps: item.steps,
    ...(item.tags ? { tags: item.tags } : {}),
    ...(item.source_ref ? { source_ref: item.source_ref } : {}),
  };
}

/** Serialize canonical cases YAML with stable field order and block scalars for multiline text. */
export function serializeCasesYaml(input: CasesFile): string {
  const file = normalizeCasesFile(input);
  const meta = {
    title: file.meta.title,
    ...(file.meta.l1_title ? { l1_title: file.meta.l1_title } : {}),
    ...(file.meta.requirement_id ? { requirement_id: file.meta.requirement_id } : {}),
    case_module_id: file.meta.case_module_id,
    ...(file.meta.automation_env ? { automation_env: file.meta.automation_env } : {}),
    ...(file.meta.layout ? { layout: file.meta.layout } : {}),
    ...(file.meta.test_points_digest ? { test_points_digest: file.meta.test_points_digest } : {}),
    ...(file.meta.source ? { source: file.meta.source } : {}),
    ...(file.meta.imports ? { imports: file.meta.imports } : {}),
    ...(file.meta.exports ? { exports: file.meta.exports } : {}),
  };
  return stringify(
    {
      meta,
      ...(file.requirements ? { requirements: file.requirements } : {}),
      cases: file.cases.map(serializedCase),
    },
    { lineWidth: 0 },
  );
}

function normalizeScalar(node: unknown): void {
  if (!isScalar(node) || typeof node.value !== "string") return;
  const normalized = normalizeStructuredText(node.value);
  node.value = normalized;
  if (normalized.includes("\n")) node.type = Scalar.BLOCK_LITERAL;
}

/**
 * Normalize an existing YAML document without discarding comments or unrelated
 * fields. Used for repository-wide migrations of canonical case sources.
 */
export function normalizeCasesYamlText(
  yamlText: string,
  options: {
    defaultCaseModuleId?: string;
    exports?: string[];
  } = {},
): string {
  const document = parseDocument(yamlText);
  if (document.errors.length > 0) {
    throw new Error(`yaml 解析失败: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  if (options.defaultCaseModuleId !== undefined) {
    document.setIn(["meta", "case_module_id"], options.defaultCaseModuleId);
  } else if (document.getIn(["meta", "case_module_id"]) === undefined) {
    document.setIn(["meta", "case_module_id"], "");
  }
  if (options.exports) document.setIn(["meta", "exports"], options.exports);

  const cases = document.getIn(["cases"], true);
  if (isSeq(cases)) {
    for (const item of cases.items) {
      if (!isMap(item)) continue;
      normalizeScalar(item.get("precondition", true));
      const steps = item.get("steps", true);
      if (!isSeq(steps)) continue;
      for (const step of steps.items) {
        if (!isMap(step)) continue;
        normalizeScalar(step.get("action", true));
        normalizeScalar(step.get("expected", true));
      }
    }
  }
  return document.toString({ lineWidth: 0 });
}

/** Rewrite only meta.case_module_id while preserving the rest of the document. */
export function setCaseModuleId(yamlText: string, caseModuleId: string): string {
  const document = parseDocument(yamlText);
  if (document.errors.length > 0) {
    throw new Error(`yaml 解析失败: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  document.setIn(["meta", "case_module_id"], caseModuleId);
  return document.toString({ lineWidth: 0 });
}

/** Rewrite only meta.automation_env while preserving the rest of the document. */
export function setAutomationEnv(yamlText: string, automationEnv: string): string {
  const document = parseDocument(yamlText);
  if (document.errors.length > 0) {
    throw new Error(`yaml 解析失败: ${document.errors.map((error) => error.message).join("; ")}`);
  }
  if (automationEnv) {
    document.setIn(["meta", "automation_env"], automationEnv);
  } else {
    document.deleteIn(["meta", "automation_env"]);
  }
  return document.toString({ lineWidth: 0 });
}
