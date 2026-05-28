import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseWorkflow,
  V2_WARN_PREFIX,
  validateWorkflow,
  type Workflow,
} from "./workflow-schema.ts";

/** Stderr-only marker for P1→P3 transition workflow contracts (skill dir not yet provisioned). */
export const TRANSITION_PREFIX = "[transition]";

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
  emitSkillDirTransitionWarning(workflow, yamlPath, root);
}

// P1 期间 workflow 可先于 SKILL.md 落地（P3 才补 .claude/skills/<id>/）。
// 这里只 warn 不算 violation，让 sync-check 仍然 pass。
function emitSkillDirTransitionWarning(workflow: Workflow, yamlPath: string, root: string): void {
  if (!workflow.name) return;
  const skillDir = join(root, ".claude/skills", workflow.name);
  if (existsSync(skillDir)) return;
  process.stderr.write(
    `workflow ${yamlPath}: ${TRANSITION_PREFIX} workflow contract for skill '${workflow.name}' exists but .claude/skills/${workflow.name}/ is missing (P3 will populate)\n`,
  );
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
