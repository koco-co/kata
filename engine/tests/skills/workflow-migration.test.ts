import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import { parseWorkflow, validateWorkflow } from "../../src/skills/workflow-schema.ts";

const WORKFLOW_DIR = join(repoRoot(), ".claude/contracts/workflows");

const EXPECTED_V2_SKILLS = [
  "case-draft",
  "case-edit",
  "case-hotfix",
  "defect-analyze",
  "infra-diagnose",
  "knowledge-curate",
  "playwright-automation",
  "workspace-manage",
] as const;

describe("workflow migration", () => {
  test("repo workflow set covers the 8 v2 skills", () => {
    const files = readdirSync(WORKFLOW_DIR)
      .filter((n) => n.endsWith(".yaml"))
      .map((n) => n.replace(/\.yaml$/, ""))
      .sort();
    expect(files).toEqual([...EXPECTED_V2_SKILLS]);
  });

  test("all repo workflows are version 2", () => {
    const files = readdirSync(WORKFLOW_DIR).filter((n) => n.endsWith(".yaml"));
    for (const f of files) {
      const text = readFileSync(join(WORKFLOW_DIR, f), "utf8");
      const wf = parseWorkflow(text);
      // 失败时把文件名一起打出来便于定位
      if (wf.version !== 2) {
        throw new Error(`workflow ${f} expected version=2, got ${wf.version}`);
      }
      expect(wf.version).toBe(2);
      expect(wf.name).toBe(f.replace(/\.yaml$/, ""));
      expect(["inline", "subagent"]).toContain(wf.default_dispatch ?? "");
      expect(["sonnet", "opus", "haiku"]).toContain(wf.default_model ?? "");
      expect(["low", "medium", "high"]).toContain(wf.default_effort ?? "");
      expect(wf.steps.length).toBeGreaterThan(0);
    }
  });

  test("all repo workflows pass v2 schema validation with no hard errors", () => {
    const files = readdirSync(WORKFLOW_DIR).filter((n) => n.endsWith(".yaml"));
    for (const f of files) {
      const wf = parseWorkflow(readFileSync(join(WORKFLOW_DIR, f), "utf8"));
      // v2 lint hard-on：validateWorkflow 返回的全部消息均为 hard error，不再过滤 [v2-warn]
      const errors = validateWorkflow(wf, repoRoot());
      if (errors.length > 0) {
        throw new Error(`workflow ${f} has hard errors:\n${errors.join("\n")}`);
      }
      expect(errors).toEqual([]);
    }
  });
});
