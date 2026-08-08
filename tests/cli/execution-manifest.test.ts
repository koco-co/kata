import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type ExecutionManifest,
  parseExecutionManifest,
  readExecutionManifest,
  writeExecutionManifest,
} from "../../cli/lib/automation/execution-manifest.ts";

function validManifest(): ExecutionManifest {
  return {
    schema_version: 1,
    logical_run_id: "20260808-1230-run-01",
    execution_id: "execution-01",
    project_id: "data-assets",
    executor_id: "playwright-web-ui",
    cases: [
      {
        feature_id: "rule-library",
        case_id: "C0001",
        title: "验证新增规则",
        business_record: { policy: "required" },
      },
      {
        feature_id: "rule-library",
        case_id: "C0007",
        title: "验证只读筛选",
        business_record: {
          policy: "not_applicable",
          reason: "只读查询不会产生业务记录",
        },
      },
    ],
  };
}

describe("execution manifest", () => {
  it("parses one executor execution with explicit business-record policy", () => {
    expect(parseExecutionManifest(validManifest())).toEqual(validManifest());
  });

  it("rejects duplicate canonical identities and malformed business-record policy", () => {
    const duplicate = validManifest() as unknown as { cases: unknown[] };
    duplicate.cases.push({ ...(duplicate.cases[0] as object) });
    expect(() => parseExecutionManifest(duplicate)).toThrow(
      "重复用例 data-assets/rule-library/C0001",
    );

    const missingReason = validManifest() as unknown as {
      cases: Array<{ business_record: Record<string, unknown> }>;
    };
    const missingReasonCase = missingReason.cases[1];
    if (!missingReasonCase) throw new Error("fixture case missing");
    missingReasonCase.business_record = { policy: "not_applicable" };
    expect(() => parseExecutionManifest(missingReason)).toThrow("cases[1].business_record.reason");

    const unexpectedReason = validManifest() as unknown as {
      cases: Array<{ business_record: Record<string, unknown> }>;
    };
    const unexpectedReasonCase = unexpectedReason.cases[0];
    if (!unexpectedReasonCase) throw new Error("fixture case missing");
    unexpectedReasonCase.business_record = { policy: "required", reason: "不应存在" };
    expect(() => parseExecutionManifest(unexpectedReason)).toThrow("不允许字段 reason");
  });

  it("rejects unknown fields and unstable identifiers", () => {
    const unknownField = { ...(validManifest() as object), browser: "chromium" };
    expect(() => parseExecutionManifest(unknownField)).toThrow("不允许字段 browser");

    const invalidId = validManifest() as { executor_id: string };
    invalidId.executor_id = "Playwright Web";
    expect(() => parseExecutionManifest(invalidId)).toThrow("executor_id");
  });

  it("writes the immutable manifest only to its matching execution directory", () => {
    const root = mkdtempSync(join(tmpdir(), "execution-manifest-"));
    const executionPath = join(
      root,
      "artifacts",
      "runs",
      "data-assets",
      "20260808-1230-run-01",
      "executions",
      "playwright-web-ui",
      "execution-01",
    );
    mkdirSync(executionPath, { recursive: true });
    try {
      const manifest = parseExecutionManifest(validManifest());
      const path = writeExecutionManifest(executionPath, manifest);

      expect(path).toBe(join(executionPath, "execution-manifest.json"));
      expect(readExecutionManifest(path)).toEqual(manifest);
      expect(() => writeExecutionManifest(executionPath, manifest)).toThrow();
      expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(manifest);
      expect(() =>
        writeExecutionManifest(join(executionPath, "..", "execution-02"), manifest),
      ).toThrow("execution_id");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
