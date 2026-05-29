import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";
import {
  loadSkillManifest,
  MANIFEST_WORKFLOW_EXCLUSIONS,
  validateManifestAgainstWorkflows,
} from "../../src/skills/manifest-loader.ts";

describe("manifest loader", () => {
  test("loads skills with routing and dataflow", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-manifest-"));
    try {
      mkdirSync(join(root, ".claude/contracts"), { recursive: true });
      writeFileSync(
        join(root, ".claude/contracts/skill-manifest.yaml"),
        `version: 1
generated_for: claude+codex
facets: { by_input: {}, by_output: {} }
skills:
  case-draft:
    user_entry: /case-draft
    dataflow:
      consumes: [prd-source]
      produces: [archive-md]
      related: []
    routing:
      must_trigger_when: ["gen QA"]
      must_not_trigger_when: ["edit existing"]
      clarify: ["scope?"]
`,
      );
      const m = loadSkillManifest(root);
      expect(m.skills["case-draft"]?.routing.must_trigger_when).toEqual(["gen QA"]);
      expect(m.skills["case-draft"]?.dataflow.consumes).toEqual(["prd-source"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("fails when manifest file is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-manifest-"));
    try {
      expect(() => loadSkillManifest(root)).toThrow(/skill-manifest\.yaml/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("validateManifestAgainstWorkflows flags missing workflow", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-manifest-wf-"));
    try {
      mkdirSync(join(root, ".claude/contracts/workflows"), { recursive: true });
      mkdirSync(join(root, ".claude/contracts"), { recursive: true });
      writeFileSync(
        join(root, ".claude/contracts/skill-manifest.yaml"),
        `version: 1
generated_for: claude+codex
facets: { by_input: {}, by_output: {} }
skills:
  case-draft:
    user_entry: /case-draft
    dataflow: { consumes: [prd-source], produces: [archive], related: [] }
    routing: { must_trigger_when: [a], must_not_trigger_when: [b], clarify: [c] }
`,
      );
      // NB: no workflow file for case-draft.
      const errors = validateManifestAgainstWorkflows(root);
      expect(errors.some((e) => e.includes("case-draft") && e.includes("workflow"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("validateManifestAgainstWorkflows passes when every manifest skill has a workflow", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-manifest-wf-"));
    try {
      mkdirSync(join(root, ".claude/contracts/workflows"), { recursive: true });
      writeFileSync(
        join(root, ".claude/contracts/skill-manifest.yaml"),
        `version: 1
generated_for: claude+codex
facets: { by_input: {}, by_output: {} }
skills:
  case-draft:
    user_entry: /case-draft
    dataflow: { consumes: [prd-source], produces: [archive], related: [] }
    routing: { must_trigger_when: [a], must_not_trigger_when: [b], clarify: [c] }
`,
      );
      writeFileSync(
        join(root, ".claude/contracts/workflows/case-draft.yaml"),
        "name: case-draft\n",
      );
      const errors = validateManifestAgainstWorkflows(root);
      expect(errors).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("validateManifestAgainstWorkflows skips known transitional skills", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-manifest-wf-"));
    try {
      mkdirSync(join(root, ".claude/contracts/workflows"), { recursive: true });
      writeFileSync(
        join(root, ".claude/contracts/skill-manifest.yaml"),
        `version: 1
generated_for: claude+codex
facets: { by_input: {}, by_output: {} }
skills:
  bug-file:
    user_entry: /bug-file
    dataflow: { consumes: [], produces: [], related: [] }
    routing: { must_trigger_when: [], must_not_trigger_when: [], clarify: [] }
  conflict-analyze:
    user_entry: /conflict-analyze
    dataflow: { consumes: [], produces: [], related: [] }
    routing: { must_trigger_when: [], must_not_trigger_when: [], clarify: [] }
  diff-scan:
    user_entry: /diff-scan
    dataflow: { consumes: [], produces: [], related: [] }
    routing: { must_trigger_when: [], must_not_trigger_when: [], clarify: [] }
`,
      );
      const errors = validateManifestAgainstWorkflows(root);
      expect(errors).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("MANIFEST_WORKFLOW_EXCLUSIONS only contains skills present in the manifest", () => {
    // 当 Commit 5 从 manifest 删 playwright-cli 或 P3 fuse defect-analyze 删 manifest entry 时，
    // 这个测试会 fail，提醒 implementer 同步删 EXCLUSIONS 中的对应行
    const manifest = loadSkillManifest(repoRoot());
    const manifestIds = new Set(Object.keys(manifest.skills));
    for (const excluded of MANIFEST_WORKFLOW_EXCLUSIONS) {
      expect(manifestIds.has(excluded)).toBe(true);
    }
  });
});
