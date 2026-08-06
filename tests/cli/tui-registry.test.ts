import { describe, expect, it } from "bun:test";
import { runFeaturesList } from "../../cli/commands/features.ts";
import { featureRefByProjectPath, formatBuildReport } from "../../cli/lib/tui/registry.ts";
import { listWorkspaceProjects } from "../../cli/lib/workspace-locator.ts";

describe("TUI registry", () => {
  it("resolves a real workspace feature by canonical path", () => {
    const project = listWorkspaceProjects()[0];
    expect(project).toBeTruthy();
    const row = runFeaturesList({ project: project as string })[0];
    expect(row).toBeTruthy();
    const ref = featureRefByProjectPath(
      project as string,
      (row as { relative_path: string }).relative_path,
    );
    expect(ref?.featureKey).toContain(":");
    expect(ref?.title).toBe((row as { title: string }).title);
  });

  it("formats a build report for the TUI result panel", () => {
    const report = formatBuildReport({
      created: ["/tmp/example.xmind"],
      updated: [],
      unchanged: [],
      deleted: [],
    });
    expect(report).toContain("构建完成");
    expect(report).toContain("created:");
    expect(report).toContain("example.xmind");
  });
});
