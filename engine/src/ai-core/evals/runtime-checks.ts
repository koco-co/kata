import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { resolveAiCoreConfig } from "../../config/ai-core-config.ts";
import { lintArtifactContent } from "../../policy/content-lint.ts";
import { snapshotFileRef, validateSourceRefFreshness } from "../../source-ref/resolvers.ts";
import { validateTelemetryEvent } from "../../telemetry/ai-core-telemetry.ts";
import { auditLocalContextText } from "../context-audit.ts";
import { loadAiCore } from "../load.ts";
import { checkProjection, renderProjection } from "../projection.ts";
import { checkProjectionLock, renderProjectionLock } from "../projection-lock.ts";
import { validateAiCore } from "../validate.ts";
import {
  issueFromRule,
  readGaRuntimeJsonFixture,
  readJsonFixture,
  readTextFixture,
  resultFromPolicy,
} from "./fixtures.ts";
import { checkTriggerRouting } from "./p0-checks.ts";
import type {
  CaseCheck,
  GaCoreGoldenSuite,
  GaRuntimeGoldenCase,
  GaRuntimeGoldenCaseKind,
  GaRuntimeGoldenSuite,
  P0GoldenCase,
  P0GoldenSummary,
} from "./types.ts";
import {
  GA_CORE_FAST_SUBSET,
  GA_CORE_REQUIRED_CASES,
  GA_RUNTIME_FAST_SUBSET,
  GA_RUNTIME_KINDS,
} from "./types.ts";

export function gaCoreContractFailure(subset: string, messages: string[]): P0GoldenSummary {
  const issues = messages.map((message) =>
    issueFromRule("evals.ga_core_contract_invalid", message, ".ai/core/evals/ga-core/golden.yaml"),
  );
  return {
    suite: "ga-core",
    subset,
    pass: false,
    total: 0,
    passed: 0,
    failed: 1,
    telemetry: {
      trigger_hit_rate: 0,
      trigger_miss_rate: 1,
      trigger_route_attempts: 0,
      failure_modes: ["evals.ga_core_contract_invalid"],
    },
    results: [
      {
        id: "ga-core-suite-contract",
        kind: "trigger-routing",
        subset,
        pass: false,
        status: "failed",
        expectedStatus: "passed",
        actualStatus: "blocked",
        expectedRuleIds: [],
        actualRuleIds: ["evals.ga_core_contract_invalid"],
        issues,
      },
    ],
  };
}

export function gaRuntimeContractFailure(subset: string, messages: string[]): P0GoldenSummary {
  const issues = messages.map((message) =>
    issueFromRule(
      "evals.ga_runtime_contract_invalid",
      message,
      ".ai/core/evals/ga-runtime/golden.yaml",
    ),
  );
  return {
    suite: "ga-runtime",
    subset,
    pass: false,
    total: 0,
    passed: 0,
    failed: 1,
    telemetry: {
      trigger_hit_rate: 1,
      trigger_miss_rate: 0,
      trigger_route_attempts: 0,
      failure_modes: ["evals.ga_runtime_contract_invalid"],
    },
    results: [
      {
        id: "ga-runtime-suite-contract",
        kind: "workflow-missing",
        subset,
        pass: false,
        status: "failed",
        expectedStatus: "blocked",
        actualStatus: "passed",
        expectedRuleIds: [],
        actualRuleIds: ["evals.ga_runtime_contract_invalid"],
        issues,
      },
    ],
  };
}

export function validateGaCoreFastSuite(
  suite: GaCoreGoldenSuite,
  skillIdsByName: Map<string, string>,
): string[] {
  const messages: string[] = [];
  const fastCases = suite.cases.filter((testCase) => testCase.subset === GA_CORE_FAST_SUBSET);
  const requiredIds = new Set(GA_CORE_REQUIRED_CASES.map((testCase) => testCase.id));
  const seen = new Map<string, number>();
  for (const testCase of fastCases) {
    seen.set(testCase.id, (seen.get(testCase.id) ?? 0) + 1);
  }

  for (const requiredCase of GA_CORE_REQUIRED_CASES) {
    messages.push(...validateRequiredGaCoreCase(requiredCase, fastCases, skillIdsByName));
  }

  for (const [id, count] of seen) {
    if (count > 1 && requiredIds.has(id)) continue;
    if (count > 1) messages.push(`Duplicate unsupported GA-core golden case: ${id}`);
    if (!requiredIds.has(id)) messages.push(`Unsupported GA-core fast deterministic case: ${id}`);
  }

  return messages;
}

function validateRequiredGaCoreCase(
  requiredCase: (typeof GA_CORE_REQUIRED_CASES)[number],
  fastCases: GaCoreGoldenSuite["cases"],
  skillIdsByName: Map<string, string>,
): string[] {
  const matches = fastCases.filter((testCase) => testCase.id === requiredCase.id);
  if (matches.length === 0) return [`Missing required GA-core golden case: ${requiredCase.id}`];
  if (matches.length > 1) return [`Duplicate required GA-core golden case: ${requiredCase.id}`];
  return validateRequiredGaCoreCaseShape(requiredCase, matches[0], skillIdsByName);
}

function validateRequiredGaCoreCaseShape(
  requiredCase: (typeof GA_CORE_REQUIRED_CASES)[number],
  testCase: GaCoreGoldenSuite["cases"][number],
  skillIdsByName: Map<string, string>,
): string[] {
  const messages: string[] = [];
  if (testCase.kind !== "trigger-routing") {
    messages.push(`GA-core golden case ${requiredCase.id} must use kind trigger-routing.`);
  }
  if (testCase.expected.status !== "passed") {
    messages.push(`GA-core golden case ${requiredCase.id} must expect status passed.`);
  }
  messages.push(...validateRequiredGaCoreExpectedSkill(requiredCase, testCase, skillIdsByName));
  return messages;
}

function validateRequiredGaCoreExpectedSkill(
  requiredCase: (typeof GA_CORE_REQUIRED_CASES)[number],
  testCase: GaCoreGoldenSuite["cases"][number],
  skillIdsByName: Map<string, string>,
): string[] {
  const expectedSkillId = requiredCase.skillName
    ? skillIdsByName.get(requiredCase.skillName)
    : undefined;
  if (requiredCase.skillName && testCase.expected.skill_id !== expectedSkillId) {
    return [`GA-core golden case ${requiredCase.id} must expect skill ${requiredCase.skillName}.`];
  }
  if (!requiredCase.skillName && testCase.expected.skill_id !== undefined) {
    return [`GA-core golden case ${requiredCase.id} must not declare a single expected skill.`];
  }
  return [];
}

export function validateGaRuntimeFastSuite(suite: GaRuntimeGoldenSuite): string[] {
  const messages: string[] = [];
  const fastCases = suite.cases.filter((testCase) => testCase.subset === GA_RUNTIME_FAST_SUBSET);
  const requiredIds = new Set(GA_RUNTIME_KINDS);
  const seen = new Map<string, number>();
  for (const testCase of fastCases) {
    seen.set(testCase.id, (seen.get(testCase.id) ?? 0) + 1);
    if (testCase.id !== testCase.kind) {
      messages.push(`GA-runtime golden case ${testCase.id} must use matching kind ${testCase.id}.`);
    }
    if (testCase.expected.status !== "blocked") {
      messages.push(`GA-runtime golden case ${testCase.id} must expect status blocked.`);
    }
  }
  for (const id of requiredIds) {
    const count = seen.get(id) ?? 0;
    if (count === 0) messages.push(`Missing required GA-runtime golden case: ${id}`);
    if (count > 1) messages.push(`Duplicate required GA-runtime golden case: ${id}`);
  }
  for (const id of seen.keys()) {
    if (!requiredIds.has(id as GaRuntimeGoldenCaseKind)) {
      messages.push(`Unsupported GA-runtime fast deterministic case: ${id}`);
    }
  }
  return messages;
}

export async function checkProjectionDrift(
  testCase: P0GoldenCase,
  root: string,
): Promise<CaseCheck> {
  const fixture = readJsonFixture<{
    runtime?: unknown;
    mutatePath?: unknown;
    mutatedContent?: unknown;
  }>(testCase, root);
  const runtime =
    fixture.runtime === "claude" || fixture.runtime === "codex" || fixture.runtime === "all"
      ? fixture.runtime
      : "codex";
  const mutatePath = typeof fixture.mutatePath === "string" ? fixture.mutatePath : "";
  const mutatedContent =
    typeof fixture.mutatedContent === "string" ? fixture.mutatedContent : "mutated\n";
  const outputRoot = mkdtempSync(join(tmpdir(), "kata-p0-projection-"));
  try {
    const render = await renderProjection({ runtime, outputRoot });
    if (!render.ok) return resultFromPolicy(false, render.issues);
    const target = resolve(outputRoot, mutatePath);
    const relativePath = relative(outputRoot, target);
    if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes("\0")) {
      return resultFromPolicy(false, [
        issueFromRule(
          "projection.fixture_path_invalid",
          "Projection drift fixture path escapes output root.",
          "projection",
        ),
      ]);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, mutatedContent);
    const drift = await checkProjection({ runtime, outputRoot });
    return resultFromPolicy(drift.ok, drift.issues);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}

export async function checkPluginPermission(
  testCase: P0GoldenCase,
  root: string,
): Promise<CaseCheck> {
  const fixture = readTextFixture(testCase, root);
  const tempRoot = mkdtempSync(join(tmpdir(), "kata-p0-plugin-"));
  const tempCoreRoot = join(tempRoot, ".ai/core");
  try {
    cpSync(join(root, ".ai/core"), tempCoreRoot, { recursive: true });
    const pluginPath = join(tempCoreRoot, "plugins/p0-bad-plugin/plugin.yaml");
    mkdirSync(dirname(pluginPath), { recursive: true });
    writeFileSync(pluginPath, fixture);
    const validation = validateAiCore(await loadAiCore({ root: tempRoot, coreRoot: tempCoreRoot }));
    const issues = validation.issues.filter((issue) =>
      issue.path.endsWith("p0-bad-plugin/plugin.yaml"),
    );
    return resultFromPolicy(issues.length === 0, issues);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export function checkSourceRefStale(testCase: P0GoldenCase, root: string): CaseCheck {
  const fixture = readJsonFixture<{
    sourceId?: unknown;
    snapshotContent?: unknown;
    currentContent?: unknown;
  }>(testCase, root);
  if (
    typeof fixture.sourceId !== "string" ||
    typeof fixture.snapshotContent !== "string" ||
    typeof fixture.currentContent !== "string"
  ) {
    return resultFromPolicy(false, [
      issueFromRule(
        "source_ref.fixture_invalid",
        "SourceRef stale fixture is incomplete.",
        "sourceRef",
      ),
    ]);
  }
  const sourceRef = snapshotFileRef({ id: fixture.sourceId, content: fixture.snapshotContent });
  const validation = validateSourceRefFreshness(sourceRef, fixture.currentContent);
  return resultFromPolicy(validation.ok, validation.issues);
}

export function checkTelemetryPrivacy(testCase: P0GoldenCase, root: string): CaseCheck {
  const event =
    testCase.input.event &&
    typeof testCase.input.event === "object" &&
    !Array.isArray(testCase.input.event)
      ? (testCase.input.event as Record<string, unknown>)
      : readJsonFixture<Record<string, unknown>>(testCase, root);
  const validation = validateTelemetryEvent(event);
  return resultFromPolicy(validation.ok, validation.issues);
}

export function runBudgetRefusalCase(input: {
  remaining_tokens: number;
  required_tokens: number;
}): string[] {
  return input.remaining_tokens < input.required_tokens ? ["budget.exhausted"] : [];
}

export function checkBudgetRefusal(testCase: P0GoldenCase, root: string): CaseCheck {
  const fixture = readJsonFixture<Record<string, unknown>>(testCase, root);
  const remainingTokens = fixture.remaining_tokens;
  const requiredTokens = fixture.required_tokens;
  if (typeof remainingTokens !== "number" || typeof requiredTokens !== "number") {
    return resultFromPolicy(false, [
      issueFromRule("budget.fixture_invalid", "Budget refusal fixture is incomplete.", "budget"),
    ]);
  }
  const ruleIds = runBudgetRefusalCase({
    remaining_tokens: remainingTokens,
    required_tokens: requiredTokens,
  });
  return {
    status: ruleIds.length > 0 ? "blocked" : "passed",
    ruleIds,
    issues: ruleIds.map((ruleId) =>
      issueFromRule(ruleId, "Budget is exhausted for the requested workflow.", "budget"),
    ),
  };
}

export async function checkProjectionLockDrift(
  testCase: GaRuntimeGoldenCase,
  root: string,
): Promise<CaseCheck> {
  const fixture = readGaRuntimeJsonFixture<{
    mutate_path?: unknown;
    mutated_content?: unknown;
  }>(testCase, root);
  const mutatePath = typeof fixture.mutate_path === "string" ? fixture.mutate_path : "";
  const mutatedContent =
    typeof fixture.mutated_content === "string" ? fixture.mutated_content : "mutated\n";
  const outputRoot = mkdtempSync(join(tmpdir(), "kata-ga-runtime-projection-"));
  try {
    const render = await renderProjection({ runtime: "all", outputRoot });
    if (!render.ok) return resultFromPolicy(false, render.issues);
    const lock = renderProjectionLock({ projectionRoot: outputRoot });
    const target = resolve(outputRoot, mutatePath);
    const relativePath = relative(outputRoot, target);
    if (
      relativePath.startsWith("..") ||
      relativePath === "" ||
      relativePath.includes("\0") ||
      isAbsolute(relativePath)
    ) {
      return resultFromPolicy(false, [
        issueFromRule(
          "projection_lock.fixture_path_invalid",
          "Projection lock drift fixture path escapes output root.",
          "projection-lock",
        ),
      ]);
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, mutatedContent);
    const drift = checkProjectionLock({ projectionRoot: outputRoot, runtime: "all", lock });
    return resultFromPolicy(drift.ok, drift.issues);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
}

export function checkLocalContextOverride(testCase: GaRuntimeGoldenCase, root: string): CaseCheck {
  const fixture = readGaRuntimeJsonFixture<{
    path?: unknown;
    text?: unknown;
  }>(testCase, root);
  const path = typeof fixture.path === "string" ? fixture.path : testCase.id;
  const text = typeof fixture.text === "string" ? fixture.text : "";
  const result = auditLocalContextText({ path, text });
  return resultFromPolicy(result.ok, result.issues);
}

export function checkSecretRefInvalid(testCase: GaRuntimeGoldenCase, root: string): CaseCheck {
  const fixture = readGaRuntimeJsonFixture<{
    env?: unknown;
  }>(testCase, root);
  const env: Record<string, string | undefined> = {};
  if (fixture.env && typeof fixture.env === "object" && !Array.isArray(fixture.env)) {
    for (const [key, value] of Object.entries(fixture.env)) {
      env[key] = typeof value === "string" ? value : undefined;
    }
  }
  const result = resolveAiCoreConfig({ env });
  return resultFromPolicy(result.ok, result.issues);
}

export async function checkWorkflowMissing(
  testCase: GaRuntimeGoldenCase,
  root: string,
): Promise<CaseCheck> {
  const fixture = readGaRuntimeJsonFixture<{
    remove_workflow?: unknown;
  }>(testCase, root);
  const removeWorkflow = typeof fixture.remove_workflow === "string" ? fixture.remove_workflow : "";
  const pathParts = removeWorkflow.split(/[\\/]/);
  if (
    removeWorkflow.length === 0 ||
    isAbsolute(removeWorkflow) ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    return resultFromPolicy(false, [
      issueFromRule(
        "workflow.fixture_path_invalid",
        "Workflow missing fixture path is invalid.",
        "workflow",
      ),
    ]);
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "kata-ga-runtime-workflow-"));
  const tempCoreRoot = join(tempRoot, ".ai/core");
  try {
    cpSync(join(root, ".ai/core"), tempCoreRoot, { recursive: true });
    rmSync(join(tempCoreRoot, "workflows", removeWorkflow), { force: true });
    const validation = validateAiCore(await loadAiCore({ root: tempRoot, coreRoot: tempCoreRoot }));
    const issues = validation.issues.map((issue) =>
      issue.code === "workflow_contract.missing"
        ? // Task 8 golden contracts expose the GA-runtime gate rule id while reusing
          // the Task 7 workflow validator as the canonical detector.
          { ...issue, code: "workflow.ga_core_missing" }
        : issue,
    );
    return resultFromPolicy(validation.ok, issues);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export async function runCaseCheck(testCase: P0GoldenCase, root: string): Promise<CaseCheck> {
  switch (testCase.kind) {
    case "trigger-routing":
      return checkTriggerRouting(testCase, root);
    case "missing-evidence":
    case "weak-assertion": {
      const lint = lintArtifactContent(readTextFixture(testCase, root));
      return resultFromPolicy(lint.ok, lint.issues);
    }
    case "projection-drift":
      return checkProjectionDrift(testCase, root);
    case "plugin-permission":
      return checkPluginPermission(testCase, root);
    case "source-ref-stale":
      return checkSourceRefStale(testCase, root);
    case "telemetry-privacy":
      return checkTelemetryPrivacy(testCase, root);
    case "budget-refusal":
      return checkBudgetRefusal(testCase, root);
  }
}

export async function runGaRuntimeCaseCheck(
  testCase: GaRuntimeGoldenCase,
  root: string,
): Promise<CaseCheck> {
  switch (testCase.kind) {
    case "projection-lock-drift":
      return checkProjectionLockDrift(testCase, root);
    case "local-context-override":
      return checkLocalContextOverride(testCase, root);
    case "secret-ref-invalid":
      return checkSecretRefInvalid(testCase, root);
    case "workflow-missing":
      return checkWorkflowMissing(testCase, root);
  }
}
