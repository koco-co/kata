import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AutomationSelectionError,
  selectAutomationExecution,
} from "../../cli/lib/automation/automation-selection.ts";

function feature(cases: string, meta = ""): string {
  const featureDir = mkdtempSync(join(tmpdir(), "kata-automation-selection-"));
  mkdirSync(join(featureDir, "cases"), { recursive: true });
  writeFileSync(
    join(featureDir, "cases", "需求.yaml"),
    `meta:
  title: 自动化选择契约
  feature_id: automation-selection-contract
  project_id: data-assets
  case_module_id: ""
${meta}cases:
${cases}`,
  );
  return featureDir;
}

function canonicalCase(options: {
  id: string;
  executor: string;
  state: "active" | "planned";
  write?: boolean;
  business?: string;
  title?: string;
}): string {
  return `  - case_id: ${options.id}
    automation:
      effects:
        platform_write: ${options.write === true}
      business_record:
${options.business ?? "        policy: required"}
      implementations:
        - executor: ${options.executor}
          state: ${options.state}
    title: ${options.title ?? `用例 ${options.id}`}
    priority: P1
    steps:
      - action: 执行业务动作
        expected: 结果正确
`;
}

describe("automation execution selection", () => {
  it("selects only active cases for one executor and preserves canonical contracts", () => {
    const featureDir = feature(
      canonicalCase({ id: "C0001", executor: "playwright-web-ui", state: "active" }) +
        canonicalCase({
          id: "C0002",
          executor: "playwright-web-ui",
          state: "planned",
          write: true,
        }) +
        canonicalCase({
          id: "C0003",
          executor: "playwright-web-ui",
          state: "active",
          business: "        policy: not_applicable\n        reason: 只读核对页面，不创建业务记录",
        }),
      "  automation_env: ci63\n",
    );

    expect(selectAutomationExecution(featureDir)).toEqual({
      projectId: "data-assets",
      featureId: "automation-selection-contract",
      executorId: "playwright-web-ui",
      automationEnv: "ci63",
      cases: [
        {
          feature_id: "automation-selection-contract",
          case_id: "C0001",
          title: "用例 C0001",
          effects: { platform_write: false },
          business_record: { policy: "required" },
        },
        {
          feature_id: "automation-selection-contract",
          case_id: "C0003",
          title: "用例 C0003",
          effects: { platform_write: false },
          business_record: {
            policy: "not_applicable",
            reason: "只读核对页面，不创建业务记录",
          },
        },
      ],
    });
  });

  it("requires an explicit executor when multiple active implementations exist", () => {
    const featureDir = feature(
      canonicalCase({ id: "C0001", executor: "playwright-web-ui", state: "active" }) +
        canonicalCase({ id: "C0002", executor: "request-api", state: "active" }),
    );

    let raised: unknown;
    try {
      selectAutomationExecution(featureDir);
    } catch (error) {
      raised = error;
    }
    expect(raised).toBeInstanceOf(AutomationSelectionError);
    expect((raised as AutomationSelectionError).code).toBe("AUTOMATION_EXECUTOR_AMBIGUOUS");
    expect(String(raised)).toMatch(
      /多个 executor 存在 active 实现.*available=playwright-web-ui,request-api/,
    );
    expect(
      selectAutomationExecution(featureDir, "request-api").cases.map((item) => item.case_id),
    ).toEqual(["C0002"]);
  });

  it("rejects planned-only, unknown and malformed executor selections", () => {
    const featureDir = feature(
      canonicalCase({ id: "C0001", executor: "playwright-web-ui", state: "planned" }),
    );

    expect(() => selectAutomationExecution(featureDir)).toThrow(/没有 active 自动化实现/);
    expect(() => selectAutomationExecution(featureDir, "playwright-web-ui")).toThrow(
      /没有 active 自动化实现/,
    );
    expect(() => selectAutomationExecution(featureDir, "request-api")).toThrow(
      /没有 active 自动化实现/,
    );
    expect(() => selectAutomationExecution(featureDir, "../unsafe")).toThrow(
      /--executor 必须是小写 kebab ID/,
    );
  });

  it("selects planned candidates only when collect explicitly opts in", () => {
    const featureDir = feature(
      canonicalCase({ id: "C0001", executor: "playwright-web-ui", state: "planned" }) +
        canonicalCase({ id: "C0002", executor: "request-api", state: "planned" }),
    );

    expect(
      selectAutomationExecution(featureDir, "playwright-web-ui", { includePlanned: true }).cases,
    ).toEqual([
      {
        feature_id: "automation-selection-contract",
        case_id: "C0001",
        title: "用例 C0001",
        effects: { platform_write: false },
        business_record: { policy: "required" },
      },
    ]);
    expect(() =>
      selectAutomationExecution(featureDir, undefined, { includePlanned: true }),
    ).toThrow(/多个 executor/);
  });

  it("selects requested case IDs exactly while preserving canonical YAML order", () => {
    const featureDir = feature(
      canonicalCase({ id: "C0001", executor: "playwright-web-ui", state: "active" }) +
        canonicalCase({ id: "C0002", executor: "playwright-web-ui", state: "active" }) +
        canonicalCase({ id: "C0003", executor: "playwright-web-ui", state: "active" }),
    );

    expect(
      selectAutomationExecution(featureDir, undefined, {
        caseIds: ["C0003", "C0001"],
      }).cases.map((item) => item.case_id),
    ).toEqual(["C0001", "C0003"]);
  });

  it("rejects malformed, duplicate and unknown requested case IDs with stable codes", () => {
    const featureDir = feature(
      canonicalCase({
        id: "C0001",
        executor: "playwright-web-ui",
        state: "active",
        title: "sensitive-title-must-not-leak",
      }),
    );

    const selections = [
      { caseIds: ["c0001"], code: "AUTOMATION_CASE_ID_INVALID" },
      { caseIds: ["C0001", "C0001"], code: "AUTOMATION_CASE_DUPLICATE" },
      { caseIds: ["C9999"], code: "AUTOMATION_CASE_NOT_FOUND" },
    ] as const;
    for (const selection of selections) {
      let raised: unknown;
      try {
        selectAutomationExecution(featureDir, undefined, { caseIds: selection.caseIds });
      } catch (error) {
        raised = error;
      }
      expect(raised).toBeInstanceOf(AutomationSelectionError);
      expect((raised as AutomationSelectionError).code).toBe(selection.code);
      expect(String(raised)).not.toContain("sensitive-title-must-not-leak");
    }
  });

  it("rejects requested cases that are not selectable for one executor and state", () => {
    const featureDir = feature(
      canonicalCase({
        id: "C0001",
        executor: "playwright-web-ui",
        state: "active",
        title: "active-title-must-not-leak",
      }) +
        canonicalCase({
          id: "C0002",
          executor: "playwright-web-ui",
          state: "planned",
          title: "planned-title-must-not-leak",
        }) +
        canonicalCase({ id: "C0003", executor: "request-api", state: "active" }),
    );

    for (const selection of [
      { executor: "request-api", caseIds: ["C0001"] },
      { executor: "playwright-web-ui", caseIds: ["C0002"] },
      { executor: undefined, caseIds: ["C0001", "C0003"] },
    ] as const) {
      let raised: unknown;
      try {
        selectAutomationExecution(featureDir, selection.executor, {
          caseIds: selection.caseIds,
        });
      } catch (error) {
        raised = error;
      }
      expect(raised).toBeInstanceOf(AutomationSelectionError);
      expect((raised as AutomationSelectionError).code).toBe("AUTOMATION_CASE_NOT_SELECTABLE");
      expect(String(raised)).not.toContain("active-title-must-not-leak");
      expect(String(raised)).not.toContain("planned-title-must-not-leak");
    }

    expect(
      selectAutomationExecution(featureDir, "playwright-web-ui", {
        includePlanned: true,
        caseIds: ["C0002"],
      }).cases.map((item) => item.case_id),
    ).toEqual(["C0002"]);
  });

  it("requires canonical project and feature identities", () => {
    const featureDir = feature(
      canonicalCase({ id: "C0001", executor: "playwright-web-ui", state: "active" }),
    );
    const yaml = join(featureDir, "cases", "需求.yaml");
    const source = readFileSync(yaml, "utf8");
    writeFileSync(yaml, source.replace("  project_id: data-assets\n", ""));

    expect(() => selectAutomationExecution(featureDir)).toThrow(/meta\.project_id 缺失/);
  });
});
