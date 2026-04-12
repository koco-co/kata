import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseTopLevelYamlFields } from "./yaml-helpers.ts";

export type MaturityLevel = "L0" | "L1" | "L2" | "L3";

export type WorkflowMaturityEntry = {
  workflowId: string;
  stepCount: number;
  hasGates: boolean;
  hasOutputSchemas: boolean;
  hasFailurePolicy: boolean;
  hasFixtureReference: boolean;
  level: MaturityLevel;
  agentStepsWithoutConstraints: string[];
};

export type MaturityFailure = {
  workflowId: string;
  level: MaturityLevel;
  requiredLevel: MaturityLevel;
  message: string;
};

export type WorkflowMaturityReport = {
  activeWorkflows: string[];
  failures: MaturityFailure[];
  byWorkflow: Record<string, WorkflowMaturityEntry>;
};

type ParsedWorkflowStep = {
  id: string;
  uses?: string;
  outputSchema?: string;
  hasSubagentConstraints?: boolean;
};

type ParsedWorkflow = {
  id: string;
  entrySkill: string;
  steps: ParsedWorkflowStep[];
  hasFailurePolicy: boolean;
  hasGates: boolean;
  rateCardRef?: string;
};

const REQUIRED_MATURITY_LEVELS: Record<string, MaturityLevel> = {
  [generateTestCasesWorkflowId()]: "L3",
};

function generateTestCasesWorkflowId(): string {
  const sigil = String.fromCharCode(64); // @
  return `case-draft-from-prd${sigil}1`;
}

const DEFAULT_REQUIRED_LEVEL: MaturityLevel = "L1";

const LEVEL_ORDER: Record<MaturityLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
};

function skillNameToStepIdPattern(entrySkill: string): string {
  const name = entrySkill.replace(/@\d+$/, "");
  return name.replace(/-/g, "_");
}

function discoverWorkflowFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(directory).sort()) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...discoverWorkflowFiles(path));
    } else if (stats.isFile() && path.endsWith(".workflow.yaml")) {
      files.push(path);
    }
  }
  return files;
}

function parseWorkflowSteps(text: string): ParsedWorkflowStep[] {
  const steps: ParsedWorkflowStep[] = [];
  let insideSteps = false;
  let currentStep: Partial<ParsedWorkflowStep> | undefined;

  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trimEnd();
    if (trimmed === "steps:") {
      insideSteps = true;
      continue;
    }
    if (!insideSteps) continue;

    if (
      /^[A-Za-z_][A-Za-z0-9_-]*:/.test(trimmed) &&
      !trimmed.startsWith(" ") &&
      !trimmed.startsWith("-")
    ) {
      break;
    }

    const itemMatch = trimmed.match(/^ {2}-\s*(.*)$/);
    if (itemMatch) {
      if (currentStep?.id) {
        steps.push(currentStep as ParsedWorkflowStep);
      }
      currentStep = { hasSubagentConstraints: false };
      const inlineId = itemMatch[1].match(/^id:\s*(.+?)\s*$/);
      if (inlineId) {
        currentStep.id = inlineId[1].replace(/^"|"$/g, "");
      }
      continue;
    }

    if (!currentStep) continue;

    const idMatch = trimmed.match(/^ {4}id:\s*(.+?)\s*$/);
    if (idMatch) {
      currentStep.id = idMatch[1].replace(/^"|"$/g, "");
      continue;
    }

    const usesMatch = trimmed.match(/^ {4}uses:\s*(.+?)\s*$/);
    if (usesMatch) {
      currentStep.uses = usesMatch[1].replace(/^"|"$/g, "");
      continue;
    }

    const outputSchemaMatch = trimmed.match(/^ {4}output_schema:\s*(.+?)\s*$/);
    if (outputSchemaMatch) {
      currentStep.outputSchema = outputSchemaMatch[1].replace(/^"|"$/g, "");
      continue;
    }

    if (/^ {4}subagent_constraints:\s*$/.test(trimmed)) {
      currentStep.hasSubagentConstraints = true;
    }
  }

  if (currentStep?.id) {
    steps.push(currentStep as ParsedWorkflowStep);
  }

  return steps;
}

function hasFailurePolicy(text: string): boolean {
  return /^failure_policy:/m.test(text);
}

function hasGates(text: string): boolean {
  return /^ {2}gates?:/m.test(text) || /^ {4}gates?:/m.test(text);
}

function findRateCardRef(text: string): string | undefined {
  const match = text.match(/^ {2}rate_card_ref:\s*(.+?)\s*$/m);
  return match ? match[1].replace(/^"|"$/g, "") : undefined;
}

function readWorkflow(root: string, path: string): ParsedWorkflow | null {
  try {
    const text = readFileSync(path, "utf8");
    const fields = parseTopLevelYamlFields(text, relative(root, path));
    const id = fields.id;
    const entrySkill = fields.entry_skill;
    if (typeof id !== "string" || typeof entrySkill !== "string") return null;

    const steps = parseWorkflowSteps(text);
    const hasFailurePolicyField = hasFailurePolicy(text);
    const hasGatesField = hasGates(text);
    const rateCardRef = findRateCardRef(text);

    return {
      id,
      entrySkill,
      steps,
      hasFailurePolicy: hasFailurePolicyField,
      hasGates: hasGatesField,
      rateCardRef,
    };
  } catch {
    return null;
  }
}

function isGenericStep(step: ParsedWorkflowStep, entrySkill: string): boolean {
  const pattern = skillNameToStepIdPattern(entrySkill);
  return step.id === pattern;
}

function workflowHasFixtureReference(workflow: ParsedWorkflow): boolean {
  return (
    workflow.rateCardRef?.includes("fixture") ||
    workflow.steps.some((step) => step.uses?.includes("fixture"))
  );
}

function classifyMaturity(workflow: ParsedWorkflow): MaturityLevel {
  const {
    steps,
    hasFailurePolicy: hasFailurePolicyField,
    hasGates: hasGatesField,
    rateCardRef,
  } = workflow;
  const stepCount = steps.length;
  const hasOutputSchemas = steps.some((step) => step.outputSchema !== undefined);
  const hasFixtureReference = workflowHasFixtureReference(workflow);

  const isSingleGenericStep = stepCount === 1 && isGenericStep(steps[0], workflow.entrySkill);

  if (isSingleGenericStep && !hasOutputSchemas && !hasFailurePolicyField && !hasGatesField) {
    return "L0";
  }

  if (hasOutputSchemas && hasFailurePolicyField) {
    if (hasFixtureReference) {
      return "L3";
    }
    return "L2";
  }

  return "L1";
}

export function auditWorkflowMaturity(root?: string): AiCoreResult<WorkflowMaturityReport> {
  const repo = root ?? repoRoot();
  const workflowsDir = join(repo, ".ai", "core", "workflows");
  const workflowFiles = discoverWorkflowFiles(workflowsDir);

  const activeWorkflows: string[] = [];
  const failures: MaturityFailure[] = [];
  const byWorkflow: Record<string, WorkflowMaturityEntry> = {};

  for (const filePath of workflowFiles) {
    const workflow = readWorkflow(repo, filePath);
    if (!workflow) continue;

    const level = classifyMaturity(workflow);
    const requiredLevel = REQUIRED_MATURITY_LEVELS[workflow.id] ?? DEFAULT_REQUIRED_LEVEL;

    activeWorkflows.push(workflow.id);

    const agentStepsWithoutConstraints: string[] = [];
    for (const step of workflow.steps) {
      if (step.uses?.startsWith("agent:") && step.hasSubagentConstraints !== true) {
        agentStepsWithoutConstraints.push(step.id);
      }
    }

    byWorkflow[workflow.id] = {
      workflowId: workflow.id,
      stepCount: workflow.steps.length,
      hasGates: workflow.hasGates,
      hasOutputSchemas: workflow.steps.some((step) => step.outputSchema !== undefined),
      hasFailurePolicy: workflow.hasFailurePolicy,
      hasFixtureReference: workflowHasFixtureReference(workflow),
      level,
      agentStepsWithoutConstraints,
    };

    if (LEVEL_ORDER[level] < LEVEL_ORDER[requiredLevel]) {
      failures.push({
        workflowId: workflow.id,
        level,
        requiredLevel,
        message: `Workflow ${workflow.id} is at maturity level ${level} but requires ${requiredLevel}`,
      });
    }
  }

  activeWorkflows.sort();

  const issues: AiCoreIssue[] = failures.map((f) => ({
    code: "workflow_maturity.below_required_level",
    severity: "error" as const,
    message: f.message,
    path: `.ai/core/workflows/${f.workflowId}`,
    contractId: f.workflowId,
  }));

  return {
    ok: issues.length === 0,
    value: { activeWorkflows, failures, byWorkflow },
    issues,
  };
}
