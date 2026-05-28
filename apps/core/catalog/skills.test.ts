import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listSkills, listSkillsFromRoot } from "./skills.ts";

function writeSkill(root: string, dir: string, frontmatter: string): void {
  const skillDir = join(root, dir);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), `---\n${frontmatter}\n---\n\n# ${dir}\n`);
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
  expect(draft?.kind).toBe("runtime-skill");
  expect(draft?.summary?.length).toBeGreaterThan(0);
  expect(draft?.inputs).toContain("prd-source");
  expect(draft?.inputs).toContain("design-source");
  expect(draft?.outputs).toContain("archive-md");
  expect(draft?.outputs).toContain("xmind");
  expect(draft?.mustTriggerWhen.length).toBeGreaterThan(0);
  expect(draft?.mustNotTriggerWhen.length).toBeGreaterThan(0);
});

test("listSkillsFromRoot parses fixture runtime skills sorted by id", () => {
  const root = fixtureRoot();
  writeSkill(root, "beta", "name: beta\ndescription: Beta skill\n");
  writeSkill(root, "alpha", "name: alpha\ndescription: Alpha skill\n");

  expect(listSkillsFromRoot(root).map((skill) => skill.id)).toEqual(["alpha", "beta"]);
});

test("listSkillsFromRoot rejects skills without SKILL.md frontmatter", () => {
  const root = fixtureRoot();
  const skillDir = join(root, "missing-frontmatter");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), "# missing-frontmatter\n");

  expect(() => listSkillsFromRoot(root)).toThrow(/frontmatter/i);
});

test("listSkillsFromRoot rejects skills with missing or empty names", () => {
  const missingRoot = fixtureRoot();
  writeSkill(missingRoot, "missing-name", "description: missing name\n");
  expect(() => listSkillsFromRoot(missingRoot)).toThrow(/skill name/i);

  const emptyRoot = fixtureRoot();
  writeSkill(emptyRoot, "empty-name", 'name: ""\n');
  expect(() => listSkillsFromRoot(emptyRoot)).toThrow(/skill name/i);
});

test("listSkillsFromRoot rejects parser errors with SKILL.md path context", () => {
  const root = fixtureRoot();
  writeSkill(root, "malformed", "name: [malformed\n");

  expect(() => listSkillsFromRoot(root)).toThrow(/SKILL\.md/);
});

test("listSkillsFromRoot rejects names that do not match skill directories", () => {
  const root = fixtureRoot();
  writeSkill(root, "name-mismatch", "name: another-name\n");

  expect(() => listSkillsFromRoot(root)).toThrow(/match directory/i);
});

test("listSkillsFromRoot reads .claude contracts and ignores missing .agents contracts", () => {
  const root = mkdtempSync(join(tmpdir(), "kata-skills-shim-"));
  try {
    mkdirSync(join(root, ".claude/skills/case-draft"), { recursive: true });
    writeFileSync(
      join(root, ".claude/skills/case-draft/SKILL.md"),
      `---\nname: case-draft\ndescription: gen QA cases\n---\nbody\n`,
    );
    mkdirSync(join(root, ".claude/contracts/routes"), { recursive: true });
    writeFileSync(
      join(root, ".claude/contracts/skill-graph.yaml"),
      `skills:\n  case-draft:\n    user_entry: /case-draft\n    consumes: [prd-source]\n    produces: [archive-md]\n    related: []\n`,
    );
    writeFileSync(
      join(root, ".claude/contracts/routes/case-draft.yaml"),
      `skill: case-draft\nentry: /case-draft\nshould_trigger: [draft a case]\nshould_not_trigger: [hotfix]\nclarify: [confirm scope]\n`,
    );
    // NB: .agents/contracts/ intentionally not created — shim must cope.
    const skillsRoot = join(root, ".claude/skills");
    const contractsRoot = join(root, ".claude/contracts");
    const summaries = listSkillsFromRoot(skillsRoot, contractsRoot);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.id).toBe("case-draft");
    expect(summaries[0]?.inputs).toEqual(["prd-source"]);
    expect(summaries[0]?.outputs).toEqual(["archive-md"]);
    expect(summaries[0]?.mustTriggerWhen).toEqual(["draft a case"]);
    expect(summaries[0]?.mustNotTriggerWhen).toEqual(["hotfix"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listSkills() default roots resolve via .claude/contracts not .agents", () => {
  const summaries = listSkills();
  expect(Array.isArray(summaries)).toBe(true);
  expect(summaries.length).toBeGreaterThan(0);
  expect(summaries.every((s) => typeof s.id === "string")).toBe(true);
});
