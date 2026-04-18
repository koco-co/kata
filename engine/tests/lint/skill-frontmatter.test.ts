import { expect, test } from "bun:test";
import { join } from "node:path";
import { lintAgentFrontmatter } from "../../src/lint/skill-frontmatter.ts";

const FX = join(import.meta.dirname, "fixtures");
const KNOWN_SKILLS = new Set([
  "case-draft",
  "ui-plan",
  "case-edit",
  "bug-file",
  "knowledge-curate",
  "playwright-cli",
  "workspace-manage",
]);

test("good agent passes", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-good/good-agent.md"), KNOWN_SKILLS);
  expect(r.passed).toBe(true);
});

test("A1: missing frontmatter flagged", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/no-frontmatter.md"), KNOWN_SKILLS);
  expect(r.violations.some((v) => v.rule === "A1")).toBe(true);
});

test("A2: missing owner_skill flagged", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/missing-owner.md"), KNOWN_SKILLS);
  expect(r.violations.some((v) => v.rule === "A2")).toBe(true);
});

test("A4: cross-skill reference flagged", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/cross-skill-ref.md"), KNOWN_SKILLS);
  expect(r.violations.some((v) => v.rule === "A4")).toBe(true);
});

test("A4: codex runtime scopes .agents skill references to owner_skill", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-good/codex-good-agent.md"), KNOWN_SKILLS, {
    runtime: "codex",
  });
  expect(r.passed).toBe(true);
});

test("A4: codex runtime flags cross-skill .agents references", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/codex-cross-skill-ref.md"), KNOWN_SKILLS, {
    runtime: "codex",
  });
  expect(r.violations.some((v) => v.rule === "A4")).toBe(true);
});

test("A5: codex runtime flags invalid preferred_agent_type", () => {
  const r = lintAgentFrontmatter(join(FX, "agents-bad/codex-invalid-agent-type.md"), KNOWN_SKILLS, {
    runtime: "codex",
  });
  expect(r.violations.some((v) => v.rule === "A5")).toBe(true);
});

test("A6: codex runtime flags invalid source_hash", () => {
  const r = lintAgentFrontmatter(
    join(FX, "agents-bad/codex-invalid-source-hash.md"),
    KNOWN_SKILLS,
    {
      runtime: "codex",
    },
  );
  expect(r.violations.some((v) => v.rule === "A6")).toBe(true);
});
