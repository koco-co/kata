import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./paths.ts";
import type { AiCoreIssue, AiCoreResult } from "./types.ts";
import { parseTopLevelYamlFields } from "./yaml-helpers.ts";

export type GaCoreWorkflowContract = {
  id: string;
  entrySkill: string;
  path?: string;
};

const CONTRACT_VERSION = 1;
const REQUIRED_GA_CORE_WORKFLOWS = new Map<string, string>([
  [contractId("workspace-manage"), contractId("workspace-manage")],
  [contractId("case-draft-from-prd"), contractId("case-draft")],
  [contractId("case-edit"), contractId("case-edit")],
  [contractId("knowledge-curate"), contractId("knowledge-curate")],
  [contractId("bug-file"), contractId("bug-file")],
  [contractId("conflict-analyze"), contractId("conflict-analyze")],
  [contractId("case-hotfix"), contractId("case-hotfix")],
  [contractId("playwright-automation"), contractId("playwright-automation")],
  [contractId("diff-scan"), contractId("diff-scan")],
  [contractId("infra-diagnose"), contractId("infra-diagnose")],
]);

function contractId(name: string): string {
  return `${name}@${CONTRACT_VERSION}`;
}

export function loadGaCoreWorkflowContracts(root = repoRoot()): GaCoreWorkflowContract[] {
  return loadGaCoreWorkflowContractResult(root).value ?? [];
}

export function loadGaCoreWorkflowContractResult(
  root = repoRoot(),
): AiCoreResult<GaCoreWorkflowContract[]> {
  const workflowsRoot = join(root, ".ai", "core", "workflows");
  if (!existsSync(workflowsRoot)) {
    return {
      ok: true,
      value: [],
      issues: [],
    };
  }

  const issues: AiCoreIssue[] = [];
  const workflows: GaCoreWorkflowContract[] = [];
  for (const path of discoverWorkflowFiles(workflowsRoot)) {
    const result = readGaCoreWorkflowContract(root, path);
    issues.push(...result.issues);
    if (result.value) workflows.push(result.value);
  }

  return {
    ok: issues.length === 0,
    value: workflows.sort((left, right) => left.id.localeCompare(right.id)),
    issues,
  };
}

export function validateGaCoreWorkflowContracts(
  workflows: GaCoreWorkflowContract[],
): AiCoreResult<null> {
  const issues: AiCoreIssue[] = [];
  const byId = new Map<string, GaCoreWorkflowContract>();
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const workflow of workflows) {
    if (seenIds.has(workflow.id)) {
      duplicateIds.add(workflow.id);
      issues.push({
        code: "workflow_contract.duplicate",
        severity: "error",
        message: `Duplicate GA-core workflow contract: ${workflow.id}`,
        path: workflow.path ?? ".ai/core/workflows",
        contractId: workflow.id,
      });
      continue;
    }
    seenIds.add(workflow.id);
    byId.set(workflow.id, workflow);
  }

  for (const [id, entrySkill] of REQUIRED_GA_CORE_WORKFLOWS) {
    const workflow = byId.get(id);
    if (!workflow) {
      issues.push({
        code: "workflow_contract.missing",
        severity: "error",
        message: `Missing GA-core workflow contract: ${id}`,
        path: ".ai/core/workflows",
        contractId: id,
      });
      continue;
    }

    if (!duplicateIds.has(id) && workflow.entrySkill !== entrySkill) {
      issues.push({
        code: "workflow_contract.entry_skill_mismatch",
        severity: "error",
        message: `GA-core workflow ${id} must enter skill ${entrySkill}`,
        path: workflow.path ?? ".ai/core/workflows",
        contractId: id,
      });
    }
  }

  for (const workflow of workflows) {
    if (!REQUIRED_GA_CORE_WORKFLOWS.has(workflow.id)) {
      issues.push({
        code: "workflow_contract.unexpected",
        severity: "error",
        message: `Unexpected GA-core workflow contract: ${workflow.id}`,
        path: workflow.path ?? ".ai/core/workflows",
        contractId: workflow.id,
      });
    }
  }

  return {
    ok: issues.length === 0,
    value: null,
    issues,
  };
}

function discoverWorkflowFiles(directory: string): string[] {
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

function readGaCoreWorkflowContract(
  root: string,
  path: string,
): AiCoreResult<GaCoreWorkflowContract> {
  const fields = parseTopLevelYamlFields(readFileSync(path, "utf8"), relative(root, path));
  const issues: AiCoreIssue[] = [];
  const id = readRequiredField(fields, "id", root, path, issues);
  const entrySkill = readRequiredField(fields, "entry_skill", root, path, issues);
  if (!id || !entrySkill) {
    return {
      ok: false,
      issues,
    };
  }

  return {
    ok: true,
    value: {
      id,
      entrySkill,
      path: relative(root, path),
    },
    issues: [],
  };
}

function readRequiredField(
  fields: Record<string, string | true>,
  key: string,
  root: string,
  path: string,
  issues: AiCoreIssue[],
): string | undefined {
  const value = fields[key];
  if (typeof value !== "string" || value.length === 0) {
    issues.push({
      code: "workflow_contract.malformed",
      severity: "error",
      message: `Missing required GA-core workflow field: ${key}`,
      path: relative(root, path),
      contractId: typeof fields.id === "string" ? fields.id : undefined,
    });
    return undefined;
  }
  return value;
}
