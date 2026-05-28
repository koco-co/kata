import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWorkflow, validateWorkflow, type Workflow } from "./workflow-schema.ts";

export type WorkflowCheckRule =
  | "WORKFLOW_PARSE_ERROR"
  | "WORKFLOW_SCHEMA_ERROR"
  | "WORKFLOW_REVIEW_MISSING"
  | "WORKFLOW_REVIEW_CANONICAL_MISSING"
  | "WORKFLOW_REVIEW_STEP_MISMATCH"
  | "WORKFLOW_REVIEW_DETAIL_MISSING";

export interface WorkflowCheckViolation {
  rule: WorkflowCheckRule;
  path: string;
  message: string;
}

export interface WorkflowCheckReport {
  passed: boolean;
  violations: WorkflowCheckViolation[];
}

const WORKFLOWS_YAML_DIR = "docs/skills/contracts/workflows";
const WORKFLOWS_REVIEW_DIR = "docs/skills/workflows";

export function checkWorkflows(root: string): WorkflowCheckReport {
  const violations: WorkflowCheckViolation[] = [];
  const yamlDir = join(root, WORKFLOWS_YAML_DIR);
  if (!existsSync(yamlDir)) return { passed: true, violations: [] };

  for (const entry of readdirSync(yamlDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
    checkWorkflowFile(root, yamlDir, entry.name, violations);
  }

  return { passed: violations.length === 0, violations };
}

function checkWorkflowFile(
  root: string,
  yamlDir: string,
  fileName: string,
  violations: WorkflowCheckViolation[],
): void {
  const yamlPath = join(yamlDir, fileName);
  const reviewPath = join(root, WORKFLOWS_REVIEW_DIR, fileName.replace(/\.yaml$/, ".md"));
  const workflow = readWorkflowYaml(yamlPath, violations);
  if (!workflow) return;

  validateWorkflowSchema(workflow, yamlPath, violations);
  validateWorkflowReview(fileName, workflow, reviewPath, violations);
}

function readWorkflowYaml(
  yamlPath: string,
  violations: WorkflowCheckViolation[],
): Workflow | undefined {
  try {
    return parseWorkflow(readFileSync(yamlPath, "utf8"));
  } catch (error) {
    pushWorkflowViolation(
      violations,
      "WORKFLOW_PARSE_ERROR",
      yamlPath,
      `failed to parse workflow yaml: ${(error as Error).message}`,
    );
  }
}

function validateWorkflowSchema(
  workflow: Workflow,
  yamlPath: string,
  violations: WorkflowCheckViolation[],
): void {
  for (const schemaError of validateWorkflow(workflow)) {
    pushWorkflowViolation(violations, "WORKFLOW_SCHEMA_ERROR", yamlPath, schemaError);
  }
}

function validateWorkflowReview(
  fileName: string,
  workflow: Workflow,
  reviewPath: string,
  violations: WorkflowCheckViolation[],
): void {
  if (!existsSync(reviewPath)) {
    pushWorkflowViolation(
      violations,
      "WORKFLOW_REVIEW_MISSING",
      reviewPath,
      `review document is required for workflow '${workflow.name}'.`,
    );
    return;
  }

  const reviewText = readFileSync(reviewPath, "utf8");
  validateWorkflowReviewCanonical(fileName, reviewPath, reviewText, violations);
  validateWorkflowReviewSteps(workflow, reviewPath, reviewText, violations);
  validateWorkflowReviewDetails(workflow, reviewPath, reviewText, violations);
}

function validateWorkflowReviewCanonical(
  fileName: string,
  reviewPath: string,
  reviewText: string,
  violations: WorkflowCheckViolation[],
): void {
  const canonicalRef = `docs/skills/contracts/workflows/${fileName}`;
  if (reviewText.includes(canonicalRef)) return;
  pushWorkflowViolation(
    violations,
    "WORKFLOW_REVIEW_CANONICAL_MISSING",
    reviewPath,
    `review document must reference canonical source '${canonicalRef}'.`,
  );
}

function validateWorkflowReviewSteps(
  workflow: Workflow,
  reviewPath: string,
  reviewText: string,
  violations: WorkflowCheckViolation[],
): void {
  const yamlIds = workflow.steps.map((step) => step.id);
  const reviewIds = extractReviewStepIds(reviewText);
  if (yamlIds.join(",") === reviewIds.join(",")) return;
  pushWorkflowViolation(
    violations,
    "WORKFLOW_REVIEW_STEP_MISMATCH",
    reviewPath,
    `review steps [${reviewIds.join(",")}] do not match yaml steps [${yamlIds.join(",")}].`,
  );
}

function validateWorkflowReviewDetails(
  workflow: Workflow,
  reviewPath: string,
  reviewText: string,
  violations: WorkflowCheckViolation[],
): void {
  for (const detail of collectReviewRequiredDetails(workflow)) {
    if (reviewText.includes(detail)) continue;
    pushWorkflowViolation(
      violations,
      "WORKFLOW_REVIEW_DETAIL_MISSING",
      reviewPath,
      `review document must mention yaml detail '${detail}'.`,
    );
  }
}

function collectReviewRequiredDetails(workflow: Workflow): string[] {
  const details = new Set<string>();
  for (const step of workflow.steps) {
    for (const mode of step.failure_modes ?? []) details.add(mode);
    for (const gate of step.human_gates ?? []) details.add(gate);
  }
  return [...details].sort();
}

function extractReviewStepIds(reviewText: string): string[] {
  const ids: string[] = [];
  let inSteps = false;
  for (const rawLine of reviewText.split("\n")) {
    const line = rawLine.trim();
    if (/^##\s+Steps\b/i.test(line)) {
      inSteps = true;
      continue;
    }
    if (inSteps && line.startsWith("##")) break;
    if (inSteps && line.startsWith("- ")) {
      ids.push(line.slice(2).trim());
    }
  }
  return ids;
}

function pushWorkflowViolation(
  violations: WorkflowCheckViolation[],
  rule: WorkflowCheckRule,
  path: string,
  message: string,
): void {
  violations.push({ rule, path, message });
}

export function formatWorkflowCheckReport(report: WorkflowCheckReport, root: string): string {
  if (report.passed) return "workflow check passed";
  const lines = report.violations.map((violation) => {
    const rel = violation.path.startsWith(root)
      ? violation.path.slice(root.length + 1)
      : violation.path;
    return `${violation.rule}: ${rel}: ${violation.message}`;
  });
  return ["workflow check failed", ...lines].join("\n");
}
