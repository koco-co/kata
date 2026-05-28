import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  checkWorkflows,
  formatWorkflowCheckReport,
  TRANSITION_PREFIX,
} from "../../src/skills/workflow-check.ts";
import { resetSlotCache, V2_WARN_PREFIX } from "../../src/skills/workflow-schema.ts";

const tempRoots: string[] = [];

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-workflow-check-"));
  tempRoots.push(root);
  return root;
}

function writeFile(root: string, rel: string, body: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, "utf8");
}

const VALID_YAML = `name: case-draft
version: 1
entry: /case-draft
description: 根据需求源生成 QA 用例的完整流程。
steps:
  - id: source-intake
    next: [output]
    blackboard_inputs: []
    blackboard_outputs: [sources, source_refs]
    references: []
    failure_modes: []
    human_gates: []
    verification: []
  - id: output
    blackboard_inputs: [sources, source_refs]
    blackboard_outputs: [artifacts, handoff]
    references: []
    failure_modes: []
    human_gates: []
    verification: []
`;

describe("workflow check", () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("passes valid runtime workflow yaml", () => {
    const root = makeRoot();
    writeFile(root, ".claude/contracts/workflows/case-draft.yaml", VALID_YAML);
    // 同步建出 skill 目录避免触发 [transition] stderr 警告
    mkdirSync(join(root, ".claude/skills/case-draft"), { recursive: true });

    const report = checkWorkflows(root);
    expect(report.passed).toBe(true);
    expect(report.violations).toEqual([]);
    expect(formatWorkflowCheckReport(report, root)).toBe("workflow check passed");
  });

  test("flags missing workflow contract directory", () => {
    const root = makeRoot();

    const report = checkWorkflows(root);
    expect(report.violations).toContainEqual(
      expect.objectContaining({
        rule: "WORKFLOW_CONTRACT_MISSING",
        message: "workflow contract directory is required",
      }),
    );
  });

  test("flags yaml schema errors", () => {
    const root = makeRoot();
    writeFile(
      root,
      ".claude/contracts/workflows/bad.yaml",
      "name: bad\nversion: 1\nentry: /bad\ndescription: x\nsteps:\n  - id: a\n    next: [missing]\n    blackboard_inputs: []\n    blackboard_outputs: []\n    references: []\n    failure_modes: []\n    human_gates: []\n    verification: []\n",
    );
    // 同步建出 skill 目录避免触发 [transition] stderr 警告
    mkdirSync(join(root, ".claude/skills/bad"), { recursive: true });

    const report = checkWorkflows(root);
    expect(report.passed).toBe(false);
    expect(report.violations.some((v) => v.rule === "WORKFLOW_SCHEMA_ERROR")).toBe(true);
  });

  test("formats failures with relative paths", () => {
    const root = makeRoot();

    const text = formatWorkflowCheckReport(checkWorkflows(root), root);
    expect(text).toContain("workflow check failed");
    expect(text).toContain(".claude/contracts/workflows");
  });

  test("transition warning when workflow has no matching skill dir is stderr-only", () => {
    resetSlotCache();
    const root = makeRoot();
    // 写一个合法 v2 workflow，name 指向尚未存在的 skill 目录
    writeFile(
      root,
      ".claude/contracts/workflows/defect-analyze.yaml",
      [
        "name: defect-analyze",
        "version: 2",
        "default_dispatch: inline",
        "default_model: sonnet",
        "default_effort: high",
        "steps:",
        "  - id: intake",
        "    dispatch: inline",
        "    blackboard_inputs: [user_input]",
        "    blackboard_outputs: [mode]",
        "    failure_modes: [ambiguous_input]",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      ".claude/contracts/schemas/blackboard-slots.json",
      JSON.stringify({ v1_legacy: [], v2: ["user_input", "mode"] }),
    );

    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      captured.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stderr.write;
    try {
      const report = checkWorkflows(root);
      // 过渡 warning 不进 violations，sync-check 仍然 pass
      expect(report.passed).toBe(true);
      expect(report.violations).toEqual([]);
      const stderr = captured.join("");
      expect(stderr).toContain(TRANSITION_PREFIX);
      expect(stderr).toContain("defect-analyze");
      expect(stderr).toContain(".claude/skills/defect-analyze/");
    } finally {
      process.stderr.write = originalWrite;
      resetSlotCache();
    }
  });

  test("no transition warning when skill dir exists alongside workflow", () => {
    resetSlotCache();
    const root = makeRoot();
    writeFile(
      root,
      ".claude/contracts/workflows/case-edit.yaml",
      [
        "name: case-edit",
        "version: 2",
        "default_dispatch: inline",
        "default_model: sonnet",
        "default_effort: high",
        "steps:",
        "  - id: parse",
        "    dispatch: inline",
        "    blackboard_inputs: [user_input]",
        "    blackboard_outputs: [source_refs]",
        "    failure_modes: [unsupported_format]",
        "",
      ].join("\n"),
    );
    // 同步建出 skill 目录占位
    mkdirSync(join(root, ".claude/skills/case-edit"), { recursive: true });
    writeFile(
      root,
      ".claude/contracts/schemas/blackboard-slots.json",
      JSON.stringify({ v1_legacy: ["source_refs"], v2: ["user_input", "source_refs"] }),
    );

    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      captured.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stderr.write;
    try {
      const report = checkWorkflows(root);
      expect(report.passed).toBe(true);
      const stderr = captured.join("");
      expect(stderr).not.toContain(TRANSITION_PREFIX);
    } finally {
      process.stderr.write = originalWrite;
      resetSlotCache();
    }
  });

  test("v2 lint hard-on: unknown enum and unknown slot fail with violations", () => {
    resetSlotCache();
    const root = makeRoot();
    // 写一个 v2 workflow，含 registry 未声明的 slot 与未知 dispatch
    writeFile(
      root,
      ".claude/contracts/workflows/case-draft.yaml",
      [
        "name: case-draft",
        "version: 2",
        "default_dispatch: inline",
        "default_model: sonnet",
        "default_effort: high",
        "steps:",
        "  - id: source-intake",
        "    dispatch: inline",
        "    blackboard_inputs: [user_input]",
        "    blackboard_outputs: [source_refs]",
        "    failure_modes: [missing_source]",
        "  - id: case-draft",
        "    dispatch: magical",
        "    model: sonnet",
        "    effort: high",
        "    workers: [case-worker]",
        "    blackboard_inputs: [source_refs]",
        "    blackboard_outputs: [definitely_unknown_slot]",
        "    failure_modes: [worker_timeout]",
        "",
      ].join("\n"),
    );

    // 提供 minimal slot registry，让 user_input/source_refs 在 v2 集合内
    writeFile(
      root,
      ".claude/contracts/schemas/blackboard-slots.json",
      JSON.stringify({
        v1_legacy: ["sources", "source_refs", "decisions", "artifacts", "handoff"],
        v2: ["user_input", "source_refs"],
      }),
    );
    // 同步建出 skill 目录，避免混入 [transition] 噪音
    mkdirSync(join(root, ".claude/skills/case-draft"), { recursive: true });

    const originalWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    process.stderr.write = ((chunk: string | Uint8Array): boolean => {
      captured.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
      return true;
    }) as typeof process.stderr.write;
    try {
      const report = checkWorkflows(root);
      // v2 lint 已 hard-on：所有 v2 校验失败都进 violations，不再走 stderr 软警告
      expect(report.passed).toBe(false);
      const messages = report.violations.map((v) => v.message);
      expect(messages.some((m) => m.includes("dispatch 'magical'"))).toBe(true);
      expect(messages.some((m) => m.includes("definitely_unknown_slot"))).toBe(true);
      expect(report.violations.every((v) => v.rule === "WORKFLOW_SCHEMA_ERROR")).toBe(true);
      const stderr = captured.join("");
      // 不再向 stderr 写 v2 软警告
      expect(stderr).not.toContain(V2_WARN_PREFIX);
      expect(stderr).not.toContain(TRANSITION_PREFIX);
    } finally {
      process.stderr.write = originalWrite;
      resetSlotCache();
    }
  });
});
