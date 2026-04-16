import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateAllAiCoreContracts } from "../../src/ai-core/contract-schema.ts";
import { repoRoot } from "../../src/ai-core/paths.ts";
import {
  loadGaCoreWorkflowContracts,
  validateGaCoreWorkflowContracts,
} from "../../src/ai-core/workflow-contracts.ts";

function parseWorkflowStepIds(workflowPath: string): string[] {
  const raw = readFileSync(workflowPath, "utf8");
  const lines = raw.split("\n");
  const stepIds: string[] = [];
  let inSteps = false;
  for (const line of lines) {
    if (line.trim() === "steps:") {
      inSteps = true;
      continue;
    }
    if (!inSteps) continue;
    if (/^\S/.test(line)) break;
    const match = line.match(/^\s+- id:\s+(.+)$/);
    if (match) stepIds.push(match[1].trim());
  }
  return stepIds;
}

function parseWorkflowStepBodies(workflowPath: string): Map<string, string> {
  const raw = readFileSync(workflowPath, "utf8");
  const lines = raw.split("\n");
  const steps = new Map<string, string>();
  let inSteps = false;
  let currentId = "";
  let currentLines: string[] = [];
  for (const line of lines) {
    if (line.trim() === "steps:") {
      inSteps = true;
      continue;
    }
    if (!inSteps) continue;
    if (/^\S/.test(line)) {
      if (currentId) steps.set(currentId, currentLines.join("\n"));
      break;
    }
    const match = line.match(/^\s+- id:\s+(.+)$/);
    if (match) {
      if (currentId) steps.set(currentId, currentLines.join("\n"));
      currentId = match[1].trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  if (currentId) steps.set(currentId, currentLines.join("\n"));
  return steps;
}

function parseGateLines(stepBody: string): string[] {
  return stepBody
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2));
}

function parseTopLevelChildBlock(raw: string, parentKey: string, childKey: string): string {
  const lines = raw.split("\n");
  const parentIndex = lines.indexOf(`${parentKey}:`);
  if (parentIndex === -1) return "";

  const childHeader = `  ${childKey}:`;
  const childIndex = lines.findIndex((line, index) => index > parentIndex && line === childHeader);
  if (childIndex === -1) return "";

  const childLines: string[] = [];
  for (let index = childIndex; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > childIndex && /^\S/.test(line)) break;
    if (index > childIndex && /^ {2}\S/.test(line)) break;
    childLines.push(line);
  }
  return childLines.join("\n");
}

const EXPECTED_WORKFLOWS = [
  "bug-file@1",
  "case-draft-from-prd@1",
  "case-edit@1",
  "case-hotfix@1",
  "conflict-analyze@1",
  "diff-scan@1",
  "knowledge-curate@1",
  "playwright-automation@1",
  "workspace-manage@1",
];

const VALID_WORKFLOWS = EXPECTED_WORKFLOWS.map((id) => ({
  id,
  entrySkill: id === "case-draft-from-prd@1" ? "case-draft@1" : id,
}));

const CASE_DRAFT_WORKFLOW_PATH = join(
  repoRoot(),
  ".ai",
  "core",
  "workflows",
  "case-draft-from-prd.workflow.yaml",
);
const PLAYWRIGHT_AUTOMATION_SKILL_PATH = join(
  repoRoot(),
  ".ai",
  "core",
  "skills",
  "playwright-automation",
  "skill.yaml",
);
const PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH = join(
  repoRoot(),
  ".ai",
  "core",
  "workflows",
  "playwright-automation.workflow.yaml",
);

describe("GA-core workflow contracts", () => {
  it("covers every GA-core product skill with a workflow", () => {
    const workflows = loadGaCoreWorkflowContracts();
    expect(workflows.map((workflow) => workflow.id).sort()).toEqual(EXPECTED_WORKFLOWS);
    expect(validateGaCoreWorkflowContracts(workflows).ok).toBe(true);
  });

  it("reports entry_skill mismatches", () => {
    const result = validateGaCoreWorkflowContracts([
      ...VALID_WORKFLOWS.filter((workflow) => workflow.id !== "workspace-manage@1"),
      { id: "workspace-manage@1", entrySkill: "case-draft@1" },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "workflow_contract.entry_skill_mismatch",
    );
  });

  it("reports unexpected workflows", () => {
    const workflows = loadGaCoreWorkflowContracts();
    const result = validateGaCoreWorkflowContracts([
      ...workflows,
      { id: "custom-runtime@1", entrySkill: "custom-runtime@1" },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("workflow_contract.unexpected");
  });

  it("reports duplicate workflow ids passed directly to the validator", () => {
    const workflows = loadGaCoreWorkflowContracts();
    const result = validateGaCoreWorkflowContracts([
      ...workflows,
      { id: "workspace-manage@1", entrySkill: "workspace-manage@1" },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("workflow_contract.duplicate");
  });

  it("case-draft-from-prd has the iterative 12-step sequence", () => {
    const stepIds = parseWorkflowStepIds(CASE_DRAFT_WORKFLOW_PATH);
    expect(stepIds).toEqual([
      "source-intake",
      "module-identify",
      "historical-context",
      "requirement-atomize",
      "ambiguity-scan",
      "confirmation-package",
      "product-feedback-merge",
      "coverage-matrix",
      "case-draft",
      "case-review",
      "output",
      "automation-handoff",
    ]);
  });

  it("case-draft-from-prd validates under the WorkflowContract schema", async () => {
    const result = await validateAllAiCoreContracts();
    expect(result.ok).toBe(true);
    expect(result.value?.checkedFiles).toContain(
      ".ai/core/workflows/case-draft-from-prd.workflow.yaml",
    );
  });

  it("case-draft-from-prd source-intake uses Lanhu without source consent gating", () => {
    const bodies = parseWorkflowStepBodies(CASE_DRAFT_WORKFLOW_PATH);
    const sourceIntakeBody = bodies.get("source-intake");
    expect(sourceIntakeBody).toBeDefined();
    expect(sourceIntakeBody).toContain("plugin:lanhu.design-source@1");
    expect(sourceIntakeBody).not.toContain("source_consent.granted == true");
  });

  it("case-draft-from-prd historical-context skips without consent and gates repo reads", () => {
    const bodies = parseWorkflowStepBodies(CASE_DRAFT_WORKFLOW_PATH);
    const historicalContextBody = bodies.get("historical-context");
    expect(historicalContextBody).toBeDefined();
    expect(historicalContextBody).toContain("repo_read_condition: source_consent.granted == true");
    expect(historicalContextBody).toContain(
      "no_consent_behavior: emit skipped HistoricalContextPack with scoping notes",
    );
    expect(historicalContextBody).not.toContain('reference_level != "none"');
    expect(historicalContextBody).not.toContain(
      "requires:\n      - source_consent.granted == true",
    );
    expect(historicalContextBody).toContain("must_read_only_repos: true");
  });

  it("case-draft-from-prd case-draft allows blocking-output artifacts", () => {
    const bodies = parseWorkflowStepBodies(CASE_DRAFT_WORKFLOW_PATH);
    const caseDraftBody = bodies.get("case-draft");
    expect(caseDraftBody).toBeDefined();
    expect(caseDraftBody).not.toContain("--require-zero-blocking-pending");
  });

  it("case-draft-from-prd product-feedback-merge declares affected-atom iteration", () => {
    const bodies = parseWorkflowStepBodies(CASE_DRAFT_WORKFLOW_PATH);
    const productFeedbackMergeBody = bodies.get("product-feedback-merge");
    expect(productFeedbackMergeBody).toBeDefined();
    expect(productFeedbackMergeBody).toContain("iteration:");
    expect(productFeedbackMergeBody).toContain("max_rounds: 3");
    expect(productFeedbackMergeBody).toContain("back_to: ambiguity-scan");
    expect(productFeedbackMergeBody).toContain("scope: affected_atoms_only");
  });

  it("case-draft-from-prd output has conditional artifacts without final validation flag", () => {
    const bodies = parseWorkflowStepBodies(CASE_DRAFT_WORKFLOW_PATH);
    const outputBody = bodies.get("output");
    expect(outputBody).toBeDefined();
    expect(outputBody).toContain("when_zero_blocking");
    expect(outputBody).toContain("workspace/${project}/features/${feature_id}/archive.md");
    expect(outputBody).toContain("workspace/${project}/features/${feature_id}/cases.xmind");
    expect(outputBody).toContain("when_blocking_remain");
    expect(outputBody).toContain("workspace/${project}/features/${feature_id}/archive.draft.md");
    expect(outputBody).not.toContain("--require-zero-blocking-pending");
  });

  it("case-draft-from-prd automation handoff only gates ready entries", () => {
    const bodies = parseWorkflowStepBodies(CASE_DRAFT_WORKFLOW_PATH);
    const handoffBody = bodies.get("automation-handoff");
    expect(handoffBody).toBeDefined();
    expect(handoffBody).not.toContain(
      'automation_intents.all(i => i.automation_status == "ready")',
    );
    expect(handoffBody).toContain(
      'manifest.automation.intents.filter(i => i.automation_status == "ready").length > 0',
    );
    expect(handoffBody).toContain(
      'manifest.automation.intents.none(i => i.automation_status in ["deferred", "blocked"]',
    );
  });

  it("playwright-automation uses top-level preflight status gate", () => {
    const bodies = parseWorkflowStepBodies(PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH);
    const preflightBody = bodies.get("env-preflight");

    expect(preflightBody).toBeDefined();
    expect(preflightBody).toContain("status in [ready, blocked_by_environment]");
    expect(preflightBody).not.toContain("env.status");
  });

  it("playwright-automation can hand off directly after a passing self-run", () => {
    const bodies = parseWorkflowStepBodies(PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH);
    const runTriageBody = bodies.get("run-triage");
    const repairLoopBody = bodies.get("repair-loop");
    const handoffBody = bodies.get("handoff");
    const qualityGateBody = bodies.get("quality-gate");

    expect(runTriageBody).toBeDefined();
    expect(runTriageBody).toContain("condition: self_run.status == failed");
    expect(runTriageBody).not.toContain("- self_run.status == failed");
    expect(repairLoopBody).toBeDefined();
    expect(repairLoopBody).toContain("condition: run_triage.completed == true");
    expect(handoffBody).toBeDefined();
    expect(handoffBody).toContain("- self-run");
    expect(handoffBody).not.toContain("- quality-gate");
    expect(handoffBody).not.toContain("- repair-loop");
    expect(handoffBody).toContain("self_run.status == passed");
    expect(handoffBody).not.toContain("repair.attempts <= 3");
    expect(handoffBody).toContain("run_triage.completed == true");
    expect(handoffBody).toContain("repair_loop.completed == true");
    expect(qualityGateBody).toBeDefined();
    expect(qualityGateBody).toContain("- handoff");
  });

  it("playwright-automation accepts optional AutomationIntent input from case-draft", () => {
    const skill = readFileSync(PLAYWRIGHT_AUTOMATION_SKILL_PATH, "utf8");
    const automationIntentInput = parseTopLevelChildBlock(skill, "inputs", "automation_intent");

    expect(automationIntentInput).toContain("automation_intent:");
    expect(automationIntentInput).toContain("required: false");
    expect(automationIntentInput).toContain("kind: file");
    expect(automationIntentInput).toContain("schema: AutomationIntent@1");
  });

  it("playwright-automation treats AutomationIntent as intent only during normalize", () => {
    const workflow = readFileSync(PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH, "utf8");
    const automationIntentInput = parseTopLevelChildBlock(workflow, "inputs", "automation_intent");
    const bodies = parseWorkflowStepBodies(PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH);
    const caseNormalizeBody = bodies.get("case-normalize");

    expect(automationIntentInput).toContain("automation_intent:");
    expect(automationIntentInput).toContain("kind: automation_intent_file");
    expect(automationIntentInput).toContain("required: false");
    expect(caseNormalizeBody).toBeDefined();
    expect(caseNormalizeBody).toContain("AutomationIntent@1");
    expect(caseNormalizeBody).toContain("intent only");
    expect(caseNormalizeBody).toContain("not observed UI evidence");
  });

  it("playwright-automation never treats AutomationIntent as a ui-probe substitute", () => {
    const bodies = parseWorkflowStepBodies(PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH);
    const stepIds = parseWorkflowStepIds(PLAYWRIGHT_AUTOMATION_WORKFLOW_PATH);
    const allStepText = [...bodies.values()].join("\n");

    for (const requiredStep of ["env-preflight", "ui-probe", "plan-reconcile", "self-run"]) {
      expect(stepIds).toContain(requiredStep);
    }
    const gateText = [...bodies.values()].flatMap(parseGateLines).join("\n");
    expect(gateText).not.toContain("or AutomationIntent@1");
    expect(gateText).not.toContain("AutomationIntent@1 == true");
    expect(allStepText).toContain("probe.evidence_collected == true");
    expect(allStepText).toContain("generation.has_probe_evidence == true");
  });
});
