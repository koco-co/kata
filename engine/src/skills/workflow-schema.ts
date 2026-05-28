import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse as parsePath } from "node:path";
import YAML from "yaml";

export const BLACKBOARD_SLOTS = [
  "sources",
  "source_refs",
  "decisions",
  "open_questions",
  "artifacts",
  "coverage",
  "verification",
  "handoff",
] as const;

export type BlackboardSlot = (typeof BLACKBOARD_SLOTS)[number];

export interface WorkflowStep {
  id: string;
  // v1 字段
  next?: string[];
  blackboard_inputs?: string[];
  blackboard_outputs?: string[];
  references?: string[];
  failure_modes?: string[];
  human_gates?: string[];
  verification?: string[];
  // v2 字段
  dispatch?: "inline" | "subagent";
  model?: "sonnet" | "opus" | "haiku";
  effort?: "low" | "medium" | "high";
  subagent_type?: string;
  workers?: string[];
  reviewers?: string[];
  validators?: string[];
  blackboard_inputs_by_mode?: Record<string, string[]>;
  blackboard_outputs_by_mode?: Record<string, string[]>;
  validators_by_mode?: Record<string, string[]>;
}

export interface WorkflowMetadata {
  event_kinds_emitted?: string[];
  artifact_kinds_produced?: string[];
}

export interface Workflow {
  name: string;
  version: number;
  // v1 字段（v2 中可为空字符串）
  entry: string;
  description: string;
  // v2 字段（v1 中可为 undefined）
  default_dispatch?: "inline" | "subagent";
  default_model?: "sonnet" | "opus" | "haiku";
  default_effort?: "low" | "medium" | "high";
  metadata?: WorkflowMetadata;
  steps: WorkflowStep[];
}

const REQUIRED_STEP_ARRAY_FIELDS = [
  "blackboard_inputs",
  "blackboard_outputs",
  "references",
  "failure_modes",
  "human_gates",
  "verification",
] as const;

const SLOT_REGISTRY_PATH = ".claude/contracts/schemas/blackboard-slots.json";

let cachedSlots: Set<string> | null = null;

interface SlotRegistryDoc {
  v1_legacy?: string[];
  v2?: string[];
  properties?: {
    v1_legacy?: { const?: string[] };
    v2?: { const?: string[] };
  };
}

function findSlotRegistry(start: string): string | undefined {
  // 先尝试给定目录；否则向上回溯到文件系统根
  const rootSentinel = parsePath(start).root;
  let dir = start;
  while (true) {
    const candidate = join(dir, SLOT_REGISTRY_PATH);
    if (existsSync(candidate)) return candidate;
    if (dir === rootSentinel) return undefined;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Load the union of v1_legacy + v2 blackboard slots from the registry file. */
export function loadBlackboardSlots(root: string): Set<string> {
  if (cachedSlots) return cachedSlots;
  // 优先 root 直系路径；缺失时向上回溯查找（兼容从 engine/ 子目录运行测试）
  const directPath = join(root, SLOT_REGISTRY_PATH);
  const registryPath = existsSync(directPath) ? directPath : findSlotRegistry(root);
  if (!registryPath) return new Set<string>(BLACKBOARD_SLOTS);
  const doc = JSON.parse(readFileSync(registryPath, "utf8")) as SlotRegistryDoc;
  // 兼容两种存放方式：顶层 v1_legacy/v2 数组，或 JSON Schema properties.<key>.const 数组
  const v1 = doc.v1_legacy ?? doc.properties?.v1_legacy?.const ?? [];
  const v2 = doc.v2 ?? doc.properties?.v2?.const ?? [];
  cachedSlots = new Set<string>([...v1, ...v2]);
  return cachedSlots;
}

/** Reset cached slot registry; primarily for tests that mutate the registry file. */
export function resetSlotCache(): void {
  cachedSlots = null;
}

export function parseWorkflow(text: string): Workflow {
  const data = YAML.parse(text) as Partial<Workflow> | null;
  const steps = Array.isArray(data?.steps)
    ? (data.steps as unknown as WorkflowStep[]).map(normalizeStep)
    : [];
  return {
    name: data?.name ?? "",
    version: data?.version ?? 0,
    entry: data?.entry ?? "",
    description: data?.description ?? "",
    default_dispatch: data?.default_dispatch,
    default_model: data?.default_model,
    default_effort: data?.default_effort,
    metadata: data?.metadata,
    steps,
  };
}

function normalizeStep(raw: WorkflowStep): WorkflowStep {
  return {
    id: raw.id,
    next: raw.next,
    blackboard_inputs: raw.blackboard_inputs,
    blackboard_outputs: raw.blackboard_outputs,
    references: raw.references,
    failure_modes: raw.failure_modes,
    human_gates: raw.human_gates,
    verification: raw.verification,
    dispatch: raw.dispatch,
    model: raw.model,
    effort: raw.effort,
    subagent_type: raw.subagent_type,
    workers: raw.workers,
    reviewers: raw.reviewers,
    validators: raw.validators,
    blackboard_inputs_by_mode: raw.blackboard_inputs_by_mode,
    blackboard_outputs_by_mode: raw.blackboard_outputs_by_mode,
    validators_by_mode: raw.validators_by_mode,
  };
}

export function validateWorkflow(workflow: Workflow, root?: string): string[] {
  if (workflow.version === 2) return validateWorkflowV2(workflow, root);
  return validateWorkflowV1(workflow);
}

function validateWorkflowV1(workflow: Workflow): string[] {
  const errors: string[] = [];

  if (!workflow.name) errors.push("missing required field: name");
  if (!workflow.version) errors.push("missing required field: version");
  if (!workflow.entry) errors.push("missing required field: entry");
  if (!workflow.description) errors.push("missing required field: description");

  if (workflow.steps.length === 0) {
    errors.push("workflow must declare at least one step");
    return errors;
  }

  const ids = new Set<string>();
  for (const step of workflow.steps) {
    if (!step.id) {
      errors.push("step is missing required field: id");
      continue;
    }
    if (ids.has(step.id)) {
      errors.push(`duplicate step id '${step.id}'`);
    }
    ids.add(step.id);
  }

  for (const step of workflow.steps) {
    for (const field of REQUIRED_STEP_ARRAY_FIELDS) {
      if (!(field in step) || step[field] === undefined) {
        errors.push(`step '${step.id}' is missing required field: ${field}`);
        continue;
      }
      if (!Array.isArray(step[field])) {
        errors.push(`step '${step.id}' field '${field}' must be an array`);
      }
    }

    for (const next of step.next ?? []) {
      if (!ids.has(next)) {
        errors.push(`step '${step.id}' references unknown step id '${next}'`);
      }
    }
    for (const slot of [...(step.blackboard_inputs ?? []), ...(step.blackboard_outputs ?? [])]) {
      if (!BLACKBOARD_SLOTS.includes(slot as BlackboardSlot)) {
        errors.push(`step '${step.id}' uses unknown blackboard slot '${slot}'`);
      }
    }
  }

  const hasTerminal = workflow.steps.some((step) => !step.next || step.next.length === 0);
  if (!hasTerminal) errors.push("workflow has no terminal step (a step with empty 'next')");

  return errors;
}

const VALID_DISPATCH = new Set(["inline", "subagent"]);
const VALID_MODEL = new Set(["sonnet", "opus", "haiku"]);
const VALID_EFFORT = new Set(["low", "medium", "high"]);

function validateWorkflowV2(workflow: Workflow, root?: string): string[] {
  const warns: string[] = [];
  const errs: string[] = [];
  if (!workflow.name) errs.push("missing required field: name");
  if (workflow.steps.length === 0) {
    errs.push("workflow must declare at least one step");
    return errs;
  }
  const slots = loadBlackboardSlots(root ?? process.cwd());
  const ids = new Set<string>();
  for (const step of workflow.steps) {
    if (!step.id) {
      errs.push("step is missing required field: id");
      continue;
    }
    if (ids.has(step.id)) errs.push(`duplicate step id '${step.id}'`);
    ids.add(step.id);
    if (step.dispatch && !VALID_DISPATCH.has(step.dispatch)) {
      warns.push(
        `[v2-warn] step '${step.id}' dispatch '${step.dispatch}' not in {inline, subagent}`,
      );
    }
    if (step.model && !VALID_MODEL.has(step.model)) {
      warns.push(`[v2-warn] step '${step.id}' model '${step.model}' not in {sonnet, opus, haiku}`);
    }
    if (step.effort && !VALID_EFFORT.has(step.effort)) {
      warns.push(`[v2-warn] step '${step.id}' effort '${step.effort}' not in {low, medium, high}`);
    }
    const stepSlots = [
      ...(step.blackboard_inputs ?? []),
      ...(step.blackboard_outputs ?? []),
      ...Object.values(step.blackboard_inputs_by_mode ?? {}).flat(),
      ...Object.values(step.blackboard_outputs_by_mode ?? {}).flat(),
    ];
    for (const slot of stepSlots) {
      if (!slots.has(slot)) {
        warns.push(`[v2-warn] step '${step.id}' uses unknown blackboard slot '${slot}'`);
      }
    }
  }
  return [...errs, ...warns];
}
