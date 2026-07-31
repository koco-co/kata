import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  diffProjectSkeleton,
  renderTemplate,
  SKELETON_SPEC,
} from "../../cli/lib/create-project.ts";

describe("project skeleton contract", () => {
  it("derives project identity from the workspace directory without project.json", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-project-skeleton-"));
    const project = join(root, "demo");
    mkdirSync(project, { recursive: true });
    const diff = diffProjectSkeleton(
      project,
      join(import.meta.dir, "../../cli/templates/project-skeleton"),
    );
    expect(existsSync(join(project, "project.json"))).toBe(false);
    expect(diff.missing_dirs).toContain("analyses/hotfix-case");
    expect(diff.missing_dirs).toContain("analyses/infra-report");
    expect(diff.missing_gitkeeps).toContain("knowledge/terms/.gitkeep");
    expect(diff.missing_files).toContain("knowledge/terms.md");
    expect(diff.missing_files).not.toContain("project.json");
    expect(diff.skeleton_complete).toBe(false);
  });

  it("marks a user file/type conflict instead of allowing repair to overwrite it", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-project-skeleton-"));
    const project = join(root, "demo");
    mkdirSync(project, { recursive: true });
    writeFileSync(join(project, "knowledge"), "user content\n");
    const diff = diffProjectSkeleton(
      project,
      join(import.meta.dir, "../../cli/templates/project-skeleton"),
    );
    expect(diff.invalid_paths).toContain("knowledge");
  });

  it("requires .gitkeep only while a skeleton directory is empty", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-project-skeleton-"));
    const project = join(root, "demo");
    const features = join(project, "features");
    mkdirSync(join(features, "v1", "feature-a"), { recursive: true });
    writeFileSync(join(features, "v1", "feature-a", "cases.yaml"), "cases: []\n");

    const diff = diffProjectSkeleton(
      project,
      join(import.meta.dir, "../../cli/templates/project-skeleton"),
    );

    expect(diff.missing_gitkeeps).not.toContain("features/.gitkeep");
    expect(diff.missing_gitkeeps).toContain("analyses/bug-report/.gitkeep");
  });

  it("keeps the skeleton free of project metadata and dead shared rules", () => {
    expect(Object.keys(SKELETON_SPEC.template_files)).toEqual([
      "knowledge/overview.md",
      "knowledge/terms.md",
    ]);
    expect(SKELETON_SPEC.dirs).not.toContain("_shared/rules");
    expect(
      existsSync(join(import.meta.dir, "../../cli/templates/project-skeleton/project.json")),
    ).toBe(false);
    expect(
      existsSync(join(import.meta.dir, "../../cli/templates/project-skeleton/rules/README.md")),
    ).toBe(false);
  });

  it("renders an observed overview without obsolete skill or placeholder text", () => {
    const raw = readFileSync(
      join(import.meta.dir, "../../cli/templates/project-skeleton/knowledge/overview.md"),
      "utf8",
    );
    const rendered = renderTemplate(raw, { project: "demo", today: "2026-07-31" });
    expect(rendered).toContain("status: observed");
    expect(rendered).toContain("updated: 2026-07-31");
    expect(rendered).not.toContain("knowledge-curate");
    expect(rendered).not.toContain("占位：");
  });
});
