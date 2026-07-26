import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  diffProjectSkeleton,
  readProjectMetadata,
  SKELETON_SPEC,
} from "../../cli/lib/create-project.ts";

describe("project skeleton contract", () => {
  it("treats project.json as canonical metadata and detects missing entries", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-project-skeleton-"));
    const project = join(root, "demo");
    mkdirSync(project, { recursive: true });
    writeFileSync(join(project, "project.json"), '{"name":"demo","description":"test"}\n');
    const diff = diffProjectSkeleton(
      project,
      join(import.meta.dir, "../../cli/templates/project-skeleton"),
    );
    expect(readProjectMetadata(project)?.name).toBe("demo");
    expect(diff.project_metadata_valid).toBe(true);
    expect(diff.missing_dirs).toContain("knowledge/terms");
    expect(diff.skeleton_complete).toBe(false);
  });

  it("marks a user file/type conflict instead of allowing repair to overwrite it", () => {
    const root = mkdtempSync(join(tmpdir(), "kata-project-skeleton-"));
    const project = join(root, "demo");
    mkdirSync(project, { recursive: true });
    writeFileSync(join(project, "project.json"), '{"name":"demo"}\n');
    writeFileSync(join(project, "knowledge"), "user content\n");
    const diff = diffProjectSkeleton(
      project,
      join(import.meta.dir, "../../cli/templates/project-skeleton"),
    );
    expect(diff.invalid_paths).toContain("knowledge");
  });

  it("keeps the skeleton specification free of global project registry files", () => {
    expect(Object.keys(SKELETON_SPEC.template_files)).toEqual([
      "project.json",
      "_shared/rules/README.md",
      "knowledge/overview.md",
    ]);
  });
});
