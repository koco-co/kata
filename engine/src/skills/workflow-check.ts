import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseWorkflow,
  V2_WARN_PREFIX,
  validateWorkflow,
  type Workflow,
} from "./workflow-schema.ts";

export type WorkflowCheckRule =
  | "WORKFLOW_PARSE_ERROR"
  | "WORKFLOW_SCHEMA_ERROR"
  | "WORKFLOW_CONTRACT_MISSING";

export interface WorkflowCheckViolation {
  rule: WorkflowCheckRule;
  path: string;
  message: string;
}

export interface WorkflowCheckReport {
  passed: boolean;
  violations: WorkflowCheckViolation[];
}

const WORKFLOWS_YAML_DIR = ".claude/contracts/workflows";

export function checkWorkflows(root: string): WorkflowCheckReport {
  const violations: WorkflowCheckViolation[] = [];
  const yamlDir = join(root, WORKFLOWS_YAML_DIR);
  if (!existsSync(yamlDir)) {
    pushWorkflowViolation(
      violations,
      "WORKFLOW_CONTRACT_MISSING",
      yamlDir,
      "workflow contract directory is required",
    );
    return { passed: false, violations };
  }

  for (const entry of readdirSync(yamlDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) continue;
    checkWorkflowFile(yamlDir, entry.name, root, violations);
  }

  return { passed: violations.length === 0, violations };
}

function checkWorkflowFile(
  yamlDir: string,
  fileName: string,
  root: string,
  violations: WorkflowCheckViolation[],
): void {
  const yamlPath = join(yamlDir, fileName);
  const workflow = readWorkflowYaml(yamlPath, violations);
  if (!workflow) return;

  validateWorkflowSchema(workflow, yamlPath, root, violations);
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
  root: string,
  violations: WorkflowCheckViolation[],
): void {
  for (const schemaError of validateWorkflow(workflow, root)) {
    if (schemaError.startsWith(V2_WARN_PREFIX)) {
      // 本 commit 软校验：v2 警告写 stderr，不计入 violations；4.c 才提升为 hard error
      process.stderr.write(`workflow ${yamlPath}: ${schemaError}\n`);
      continue;
    }
    pushWorkflowViolation(violations, "WORKFLOW_SCHEMA_ERROR", yamlPath, schemaError);
  }
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
