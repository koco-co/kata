import { describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyAutomationRun } from "../../cli/lib/automation/automation-verifier.ts";
import { writeExecutionManifest } from "../../cli/lib/automation/execution-manifest.ts";
import {
  allocateAttempt,
  allocateExecution,
  allocateLogicalRun,
} from "../../cli/lib/automation/run-layout.ts";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

interface PassingFixture {
  root: string;
  runId: string;
  executionId: string;
  attempt: number;
  executionPath: string;
  attemptPath: string;
}

function status(
  phase: "collect" | "run",
  runId: string,
  executionId: string,
  attempt?: number,
): Record<string, unknown> {
  return {
    schema_version: 1,
    phase,
    status: "command_passed",
    exit_code: 0,
    logical_run_id: runId,
    execution_id: executionId,
    executor_id: "playwright-web-ui",
    ...(attempt === undefined ? {} : { attempt }),
    started_at: "2026-08-09T01:00:00.000Z",
    finished_at: "2026-08-09T01:01:00.000Z",
  };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function labels(caseId: string): Array<{ name: string; value: string }> {
  return [
    { name: "project_id", value: "data-assets" },
    { name: "feature_id", value: "verification-contract" },
    { name: "case_id", value: caseId },
  ];
}

function passingFixture(): PassingFixture {
  const root = mkdtempSync(join(tmpdir(), "automation-verifier-"));
  const run = allocateLogicalRun({
    repoRoot: root,
    projectId: "data-assets",
    type: "run",
    now: new Date("2026-08-09T01:00:00Z"),
  });
  const execution = allocateExecution({
    logicalRunPath: run.path,
    executorId: "playwright-web-ui",
  });
  const manifestPath = writeExecutionManifest(execution.path, {
    schema_version: 2,
    logical_run_id: run.id,
    execution_id: execution.id,
    project_id: "data-assets",
    executor_id: "playwright-web-ui",
    cases: [
      {
        feature_id: "verification-contract",
        case_id: "C0001",
        title: "写入用例",
        effects: { platform_write: true },
        business_record: { policy: "required" },
      },
      {
        feature_id: "verification-contract",
        case_id: "C0002",
        title: "只读用例",
        effects: { platform_write: false },
        business_record: { policy: "not_applicable", reason: "只读核对" },
      },
    ],
  });
  expect(readFileSync(manifestPath, "utf8")).toContain('"schema_version": 2');
  writeJson(
    join(execution.path, "collection-status.json"),
    status("collect", run.id, execution.id),
  );
  writeJson(join(execution.path, "preparation-status.json"), {
    schema_version: 1,
    phase: "prepare",
    status: "passed",
    logical_run_id: run.id,
    execution_id: execution.id,
    executor_id: "playwright-web-ui",
    started_at: "2026-08-09T01:00:30.000Z",
    finished_at: "2026-08-09T01:00:31.000Z",
  });
  const attempt = allocateAttempt(execution.path);
  writeJson(join(attempt.path, "status.json"), status("run", run.id, execution.id, attempt.number));
  const allure = join(attempt.path, "allure-results");
  mkdirSync(allure);
  writeJson(join(allure, "first-result.json"), {
    status: "passed",
    labels: labels("C0001"),
  });
  writeJson(join(allure, "second-result.json"), {
    status: "passed",
    labels: labels("C0002"),
  });

  const evidence = join(attempt.path, "evidence", "verification-contract");
  for (const caseId of ["C0001", "C0002"]) {
    const casePath = join(evidence, caseId);
    mkdirSync(casePath, { recursive: true });
    writeFileSync(join(casePath, "step-001.png"), PNG);
    writeJson(join(casePath, "step-001.json"), {
      schema_version: 1,
      project_id: "data-assets",
      feature_id: "verification-contract",
      case_id: caseId,
      sequence: 1,
      status: "passed",
      action: "核对页面",
      expected: "数据正确",
      target: "列表",
      screenshot: "step-001.png",
    });
  }
  const records = join(attempt.path, "business-records", "verification-contract");
  mkdirSync(records, { recursive: true });
  writeJson(join(records, "C0001.json"), {
    schema_version: 1,
    project_id: "data-assets",
    feature_id: "verification-contract",
    case_id: "C0001",
    record_type: "quality-rule",
    record_id: "rule-001",
    ui_readback: { name: "rule-001" },
  });
  return {
    root,
    runId: run.id,
    executionId: execution.id,
    attempt: attempt.number,
    executionPath: execution.path,
    attemptPath: attempt.path,
  };
}

describe("automation artifact verifier", () => {
  it("accepts one exact manifest, collection, attempt, Allure, evidence and record chain", () => {
    const item = passingFixture();
    try {
      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });

      expect(result.ok).toBe(true);
      expect(result.executorId).toBe("playwright-web-ui");
      expect(result.executionId).toBe(item.executionId);
      expect(result.attempt).toBe(1);
      expect(result.handoffPath).toBe(join(result.logicalRunPath, "handoff.md"));
      expect(result.checks.every((check) => check.passed)).toBe(true);
      expect(result.checks.map((check) => check.name)).toEqual([
        "manifest",
        "collection",
        "preparation",
        "attempt-status",
        "allure-results",
        "evidence",
        "business-records",
      ]);
      const handoff = readFileSync(join(result.logicalRunPath, "handoff.md"), "utf8");
      expect(handoff).toContain("# Automation Verification Handoff");
      expect(handoff).toContain("Result: **VERIFIED**");
      expect(handoff).toContain("Project: `data-assets`");
      expect(handoff).toContain(`Logical run: \`${item.runId}\``);
      expect(handoff).toContain("Executor: `playwright-web-ui`");
      expect(handoff).toContain(`Execution: \`${item.executionId}\``);
      expect(handoff).toContain("Attempt: `001`");
      expect(handoff).toContain("Manifest case count: `2`");
      expect(handoff).toContain(`Attempt path: \`${result.attemptPath}\``);
      for (const check of result.checks) {
        expect(handoff).toContain(`- PASS \`${check.name}\`: ${check.message}`);
      }
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("reports exact evidence-chain failures without accepting exit zero alone", () => {
    const item = passingFixture();
    try {
      rmSync(join(item.attemptPath, "evidence", "verification-contract", "C0002"), {
        recursive: true,
      });
      writeJson(join(item.attemptPath, "allure-results", "second-result.json"), {
        status: "skipped",
        labels: labels("C0002"),
      });
      writeJson(join(item.attemptPath, "business-records", "verification-contract", "C0002.json"), {
        schema_version: 1,
      });

      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(result.ok).toBe(false);
      expect(result.checks.find((check) => check.name === "allure-results")?.message).toContain(
        "passed",
      );
      expect(result.checks.find((check) => check.name === "evidence")?.message).toContain("C0002");
      expect(result.checks.find((check) => check.name === "business-records")?.message).toContain(
        "not_applicable",
      );
      const handoff = readFileSync(join(result.logicalRunPath, "handoff.md"), "utf8");
      expect(handoff).toContain("Result: **NOT VERIFIED**");
      expect(handoff).toContain("- FAIL `allure-results`");
      expect(handoff).toContain("- FAIL `evidence`");
      expect(handoff).toContain("- FAIL `business-records`");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("atomically refreshes the logical-run handoff for a later verification result", () => {
    const item = passingFixture();
    try {
      const passed = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(readFileSync(passed.handoffPath, "utf8")).toContain("Result: **VERIFIED**");

      writeJson(join(item.attemptPath, "allure-results", "second-result.json"), {
        status: "skipped",
        labels: labels("C0002"),
      });
      const failed = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(failed.handoffPath).toBe(passed.handoffPath);
      expect(readFileSync(failed.handoffPath, "utf8")).toContain("Result: **NOT VERIFIED**");
      expect(readdirSync(failed.logicalRunPath).filter((name) => name.endsWith(".tmp"))).toEqual(
        [],
      );
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("publishes an explicit unverified handoff when the immutable manifest is invalid", () => {
    const item = passingFixture();
    try {
      writeFileSync(join(item.executionPath, "execution-manifest.json"), "not-json\n");
      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });

      expect(result.ok).toBe(false);
      expect(result.manifestCaseCount).toBeNull();
      const handoff = readFileSync(result.handoffPath, "utf8");
      expect(handoff).toContain("Result: **NOT VERIFIED**");
      expect(handoff).toContain("Manifest case count: `unavailable`");
      expect(handoff).toContain("- FAIL `manifest`");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects Allure duplicate or missing canonical labels", () => {
    const item = passingFixture();
    try {
      writeJson(join(item.attemptPath, "allure-results", "second-result.json"), {
        status: "passed",
        labels: labels("C0001"),
      });
      const duplicate = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(duplicate.ok).toBe(false);
      expect(duplicate.checks.find((check) => check.name === "allure-results")?.message).toContain(
        "一一对应",
      );
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects evidence and business records outside the immutable manifest", () => {
    const item = passingFixture();
    try {
      const extraEvidence = join(item.attemptPath, "evidence", "verification-contract", "C9999");
      mkdirSync(extraEvidence);
      const extraRecords = join(
        item.attemptPath,
        "business-records",
        "verification-contract",
        "C9999.json",
      );
      writeJson(extraRecords, {});

      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(result.ok).toBe(false);
      expect(result.checks.find((check) => check.name === "evidence")?.message).toContain(
        "一一对应",
      );
      expect(result.checks.find((check) => check.name === "business-records")?.message).toContain(
        "一一对应",
      );
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects an attempt whose preparation status is missing", () => {
    const item = passingFixture();
    try {
      rmSync(join(item.executionPath, "preparation-status.json"));
      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(result.ok).toBe(false);
      expect(result.checks.find((check) => check.name === "preparation")?.message).toContain(
        "preparation-status.json",
      );
      expect(readFileSync(result.handoffPath, "utf8")).toContain("- FAIL `preparation`");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects symlinked attempt artifacts instead of following them", () => {
    const item = passingFixture();
    const outside = mkdtempSync(join(tmpdir(), "automation-verifier-outside-"));
    try {
      rmSync(join(item.attemptPath, "evidence"), { recursive: true });
      symlinkSync(outside, join(item.attemptPath, "evidence"));
      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(result.ok).toBe(false);
      expect(result.checks.find((check) => check.name === "evidence")?.message).toContain("不安全");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("fails closed instead of replacing a symlinked logical-run handoff", () => {
    const item = passingFixture();
    const outside = mkdtempSync(join(tmpdir(), "automation-handoff-outside-"));
    const outsideFile = join(outside, "protected.md");
    try {
      writeFileSync(outsideFile, "protected\n");
      symlinkSync(
        outsideFile,
        join(item.root, "artifacts", "runs", "data-assets", item.runId, "handoff.md"),
      );

      expect(() =>
        verifyAutomationRun({
          repoRoot: item.root,
          projectId: "data-assets",
          logicalRunId: item.runId,
        }),
      ).toThrow(/handoff\.md.*符号链接|符号链接.*handoff\.md/);
      expect(readFileSync(outsideFile, "utf8")).toBe("protected\n");
    } finally {
      rmSync(item.root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("does not copy untrusted artifact names into the durable handoff", () => {
    const item = passingFixture();
    const marker = "cookie-super-secret-value";
    try {
      writeJson(join(item.attemptPath, "allure-results", `${marker}-result.json`), {
        status: "broken",
        labels: [],
      });

      const result = verifyAutomationRun({
        repoRoot: item.root,
        projectId: "data-assets",
        logicalRunId: item.runId,
      });
      expect(result.ok).toBe(false);
      expect(readFileSync(join(result.logicalRunPath, "handoff.md"), "utf8")).not.toContain(marker);
    } finally {
      rmSync(item.root, { recursive: true, force: true });
    }
  });
});
