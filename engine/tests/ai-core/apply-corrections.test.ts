import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "../../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("apply-corrections reference defines the protocol", () => {
  it("file exists", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref.length).toBeGreaterThan(0);
  });

  it("documents the dry-run summary three-choice prompt", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("proceed");
    expect(ref).toContain("edit first");
    expect(ref).toContain("abort");
  });

  it("only applies entries with status approved", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toMatch(/status:\s*approved/);
  });

  it("writes case-corrections-applied.md log with before/after diff", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("case-corrections-applied.md");
    expect(ref).toMatch(/before|after/);
  });

  it("skips when doc_claim no longer matches archive (source_changed)", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("skipped: source_changed");
  });

  it("skips when already applied", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("skipped: already_applied");
  });

  it("calls archive-xmind-sync to propagate edits", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("archive-xmind-sync");
  });

  it("updates corrections.md frontmatter status to applied at the end", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toMatch(/status:\s*applied/);
  });

  it("validates summary against CaseCorrections@1", () => {
    const ref = read(".ai/core/skills/case-edit/references/apply-corrections.md");
    expect(ref).toContain("CaseCorrections@1");
  });
});

describe("case-edit skill.yaml exposes apply-corrections", () => {
  it("declares apply_corrections as an output", () => {
    const yaml = read(".ai/core/skills/case-edit/skill.yaml");
    expect(yaml).toMatch(/outputs:[\s\S]*- apply_corrections/);
  });

  it("references apply-corrections.md with phase apply-corrections", () => {
    const yaml = read(".ai/core/skills/case-edit/skill.yaml");
    expect(yaml).toContain("references/apply-corrections.md");
    expect(yaml).toMatch(/load_phases:[\s\S]*- apply-corrections/);
    expect(yaml).toContain("step.id == apply-corrections");
  });
});

describe("case-edit workflow defines apply-corrections step", () => {
  it("workflow yaml declares apply-corrections step id", () => {
    const wf = read(".ai/core/workflows/case-edit.workflow.yaml");
    expect(wf).toMatch(/-\s+id:\s+apply-corrections\b/);
  });
});

describe("archive-xmind-sync covers corrections-triggered sync", () => {
  it("references case-corrections.md as a sync trigger", () => {
    const ref = read(".ai/core/skills/case-edit/references/archive-xmind-sync.md");
    expect(ref).toContain("case-corrections.md");
  });

  it("uses case_ref xmind path for node lookup", () => {
    const ref = read(".ai/core/skills/case-edit/references/archive-xmind-sync.md");
    expect(ref).toContain("case_ref");
    expect(ref).toMatch(/xmind 节点|xmind path/);
  });

  it("specifies rollback when xmind sync fails", () => {
    const ref = read(".ai/core/skills/case-edit/references/archive-xmind-sync.md");
    expect(ref).toMatch(/回滚|rollback/);
  });
});
