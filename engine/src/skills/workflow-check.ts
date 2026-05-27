import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseWorkflow, validateWorkflow, type Workflow } from "./workflow-schema.ts";

export type WorkflowCheckRule =
  | "WORKFLOW_PARSE_ERROR"
  | "WORKFLOW_SCHEMA_ERROR"
  | "WORKFLOW_REVIEW_MISSING"
  | "WORKFLOW_REVIEW_CANONICAL_MISSING"
  | "WORKFLOW_REVIEW_STEP_MISMATCH";

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
    const yamlPath = join(yamlDir, entry.name);
    const reviewPath = join(root, WORKFLOWS_REVIEW_DIR, entry.name.replace(/\.yaml$/, ".md"));

    let workflow: Workflow;
    try {
      workflow = parseWorkflow(readFileSync(yamlPath, "utf8"));
    } catch (error) {
      violations.push({
        rule: "WORKFLOW_PARSE_ERROR",
        path: yamlPath,
        message: `failed to parse workflow yaml: ${(error as Error).message}`,
      });
      continue;
    }

    for (const schemaError of validateWorkflow(workflow)) {
      violations.push({
        rule: "WORKFLOW_SCHEMA_ERROR",
        path: yamlPath,
        message: schemaError,
      });
    }

    if (!existsSync(reviewPath)) {
      violations.push({
        rule: "WORKFLOW_REVIEW_MISSING",
        path: reviewPath,
        message: `review document is required for workflow '${workflow.name}'.`,
      });
      continue;
    }

    const reviewText = readFileSync(reviewPath, "utf8");
    const canonicalRef = `docs/skills/contracts/workflows/${entry.name}`;
    if (!reviewText.includes(canonicalRef)) {
      violations.push({
        rule: "WORKFLOW_REVIEW_CANONICAL_MISSING",
        path: reviewPath,
        message: `review document must reference canonical source '${canonicalRef}'.`,
      });
    }

    const yamlIds = workflow.steps.map((step) => step.id);
    const reviewIds = extractReviewStepIds(reviewText);
    const sortedYaml = [...yamlIds].sort().join(",");
    const sortedReview = [...reviewIds].sort().join(",");
    if (sortedYaml !== sortedReview) {
      violations.push({
        rule: "WORKFLOW_REVIEW_STEP_MISMATCH",
        path: reviewPath,
        message: `review steps [${sortedReview}] do not match yaml steps [${sortedYaml}].`,
      });
    }
  }

  return { passed: violations.length === 0, violations };
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
