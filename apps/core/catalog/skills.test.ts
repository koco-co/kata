import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listSkills, listSkillsFromRoot } from "./skills.ts";

function writeSkill(root: string, dir: string, yaml: string): void {
  const skillDir = join(root, dir);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "skill.yaml"), yaml);
}

function fixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), "kata-skills-"));
}

test("listSkills returns the kata skills sorted by id with parsed fields", () => {
  const skills = listSkills();
  const ids = skills.map((s) => s.id);
  expect(ids).toContain("case-draft");
  expect(ids).toContain("bug-file");
  // sorted ascending
  expect([...ids]).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
});

test("listSkills parses case-draft inputs/outputs without throwing on backtick scalars", () => {
  const draft = listSkills().find((s) => s.id === "case-draft");
  expect(draft).toBeDefined();
  expect(draft?.id).toBe("case-draft");
  expect(draft?.name).toBe("case-draft");
  expect(draft?.status).toBe("active");
  expect(draft?.kind).toBe("product-skill");
  expect(draft?.summary?.length).toBeGreaterThan(0);
  expect(draft?.inputs).toContain("prd");
  expect(draft?.inputs).toContain("project");
  expect(draft?.outputs).toContain("archive.md");
  expect(draft?.outputs).toContain("cases.xmind");
  expect(draft?.mustTriggerWhen.length).toBeGreaterThan(0);
  expect(draft?.mustNotTriggerWhen.length).toBeGreaterThan(0);
});

test("listSkillsFromRoot rejects duplicate normalized skill ids", () => {
  const root = fixtureRoot();
  writeSkill(root, "foo-v1", "id: foo@1\nname: foo\n");
  writeSkill(root, "foo-v2", "id: foo@2\nname: foo v2\n");

  expect(() => listSkillsFromRoot(root)).toThrow(/duplicate skill id/i);
});

test("listSkillsFromRoot rejects skills with missing ids", () => {
  const root = fixtureRoot();
  writeSkill(root, "missing-id", "name: missing-id\n");

  expect(() => listSkillsFromRoot(root)).toThrow(/skill id/i);
});

test("listSkillsFromRoot rejects skills with missing or empty names", () => {
  const missingRoot = fixtureRoot();
  writeSkill(missingRoot, "missing-name", "id: missing-name@1\n");
  expect(() => listSkillsFromRoot(missingRoot)).toThrow(/skill name/i);

  const emptyRoot = fixtureRoot();
  writeSkill(emptyRoot, "empty-name", 'id: empty-name@1\nname: ""\n');
  expect(() => listSkillsFromRoot(emptyRoot)).toThrow(/skill name/i);
});

test("listSkillsFromRoot rejects parser errors with skill path context", () => {
  const root = fixtureRoot();
  writeSkill(root, "malformed", "id: malformed@1\nname: malformed\noutputs: [archive.md\n");

  expect(() => listSkillsFromRoot(root)).toThrow(/skill\.yaml/);
});

test("listSkillsFromRoot rejects body hard_rules scalar parser errors in fixture roots", () => {
  const root = fixtureRoot();
  writeSkill(
    root,
    "hard-rules",
    "id: hard-rules@1\nname: hard-rules\nbody:\n  always_load:\n    hard_rules:\n      - `bad`\n",
  );

  expect(() => listSkillsFromRoot(root)).toThrow(/skill\.yaml/);
});
