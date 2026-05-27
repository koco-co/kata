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
  next?: string[];
  blackboard_inputs?: string[];
  blackboard_outputs?: string[];
  references?: string[];
  failure_modes?: string[];
  human_gates?: string[];
  verification?: string[];
}

export interface Workflow {
  name: string;
  version: number;
  entry: string;
  description: string;
  steps: WorkflowStep[];
}

export function parseWorkflow(text: string): Workflow {
  const data = YAML.parse(text) as Partial<Workflow> | null;
  return {
    name: data?.name ?? "",
    version: data?.version ?? 0,
    entry: data?.entry ?? "",
    description: data?.description ?? "",
    steps: Array.isArray(data?.steps) ? (data.steps as WorkflowStep[]) : [],
  };
}

export function validateWorkflow(workflow: Workflow): string[] {
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
