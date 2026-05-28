import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSkillManifest } from "../../src/skills/manifest-loader.ts";

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
});
