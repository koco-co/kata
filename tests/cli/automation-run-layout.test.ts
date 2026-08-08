import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  allocateAttempt,
  allocateExecution,
  allocateLogicalRun,
  attemptDirectory,
  executionDirectory,
  logicalRunDirectory,
} from "../../cli/lib/automation/run-layout.ts";

describe("automation run layout", () => {
  it("maps one logical run to executor executions and immutable attempts", () => {
    const root = mkdtempSync(join(tmpdir(), "automation-run-layout-"));
    try {
      const run = allocateLogicalRun({
        repoRoot: root,
        projectId: "data-assets",
        type: "run",
        now: new Date(2026, 7, 8, 12, 30),
      });
      const execution = allocateExecution({
        logicalRunPath: run.path,
        executorId: "playwright-web-ui",
      });
      const firstAttempt = allocateAttempt(execution.path);
      const secondAttempt = allocateAttempt(execution.path);

      expect(run.id).toBe("20260808-1230-run-01");
      expect(execution.id).toBe("execution-01");
      expect(firstAttempt).toEqual({ number: 1, path: join(execution.path, "attempts", "001") });
      expect(secondAttempt).toEqual({ number: 2, path: join(execution.path, "attempts", "002") });
      expect(
        attemptDirectory({
          repoRoot: root,
          projectId: "data-assets",
          logicalRunId: run.id,
          executorId: "playwright-web-ui",
          executionId: execution.id,
          attempt: 2,
        }),
      ).toBe(secondAttempt.path);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("allocates independent executions for the same executor without overwriting", () => {
    const root = mkdtempSync(join(tmpdir(), "automation-run-layout-"));
    try {
      const run = allocateLogicalRun({
        repoRoot: root,
        projectId: "data-assets",
        type: "run",
        now: new Date(2026, 7, 8, 12, 30),
      });
      const first = allocateExecution({
        logicalRunPath: run.path,
        executorId: "playwright-web-ui",
      });
      const second = allocateExecution({
        logicalRunPath: run.path,
        executorId: "playwright-web-ui",
      });

      expect(first.id).toBe("execution-01");
      expect(second.id).toBe("execution-02");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects traversal, invalid IDs and symlinked artifact roots", () => {
    const root = mkdtempSync(join(tmpdir(), "automation-run-layout-"));
    const outside = mkdtempSync(join(tmpdir(), "automation-run-outside-"));
    try {
      expect(() =>
        logicalRunDirectory({
          repoRoot: root,
          projectId: "../private",
          logicalRunId: "20260808-1230-run-01",
        }),
      ).toThrow("project_id");
      expect(() =>
        executionDirectory({
          repoRoot: root,
          projectId: "data-assets",
          logicalRunId: "20260808-1230-run-01",
          executorId: "Playwright",
          executionId: "execution-01",
        }),
      ).toThrow("executor_id");

      symlinkSync(outside, join(root, "artifacts"));
      expect(readlinkSync(join(root, "artifacts"))).toBe(outside);
      expect(() =>
        allocateLogicalRun({
          repoRoot: root,
          projectId: "data-assets",
          type: "run",
        }),
      ).toThrow("符号链接");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects attempt allocation below a symlinked executions directory", () => {
    const root = mkdtempSync(join(tmpdir(), "automation-run-layout-"));
    const outside = mkdtempSync(join(tmpdir(), "automation-run-outside-"));
    try {
      const execution = join(
        root,
        "artifacts",
        "runs",
        "data-assets",
        "20260808-1230-run-01",
        "executions",
        "playwright-web-ui",
        "execution-01",
      );
      mkdirSync(execution, { recursive: true });
      symlinkSync(outside, join(execution, "attempts"));
      expect(() => allocateAttempt(execution)).toThrow("符号链接");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});
