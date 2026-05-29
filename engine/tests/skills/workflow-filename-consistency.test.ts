import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkWorkflows } from "../../src/skills/workflow-check.ts";
import { resetSlotCache } from "../../src/skills/workflow-schema.ts";

describe("workflow filename consistency", () => {
  afterEach(() => {
    resetSlotCache();
  });

  test("flags filename != name", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-filename-"));
    try {
      mkdirSync(join(root, ".claude/contracts/workflows"), { recursive: true });
      mkdirSync(join(root, ".claude/contracts/schemas"), { recursive: true });
      mkdirSync(join(root, ".claude/skills/case-draft"), { recursive: true });
      writeFileSync(
        join(root, ".claude/contracts/workflows/case-draft.yaml"),
        [
          "name: not-case-draft",
          "version: 2",
          "default_dispatch: inline",
          "default_model: sonnet",
          "default_effort: high",
          "steps:",
          "  - id: step1",
          "    dispatch: inline",
          "    blackboard_inputs: [user_input]",
          "    blackboard_outputs: [source_refs]",
          "    failure_modes: []",
          "",
        ].join("\n"),
      );
      writeFileSync(
        join(root, ".claude/contracts/schemas/blackboard-slots.json"),
        JSON.stringify({ v1_legacy: ["source_refs"], v2: ["user_input", "source_refs"] }),
      );
      const report = checkWorkflows(root);
      expect(report.passed).toBe(false);
      expect(report.violations.some((v) => v.message.includes("filename"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
