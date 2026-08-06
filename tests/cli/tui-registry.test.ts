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
    expect(report).toContain("Build complete");
    expect(report).toContain("Created:");
    expect(report).toContain("example.xmind");
    expect(report).not.toContain("Unchanged:");
    expect(report).not.toContain("(无)");
  });

  it("shows only unchanged exports and shortens paths relative to the project", () => {
    const root = process.cwd();
    const report = formatBuildReport({
      created: [],
      updated: [],
      unchanged: [
        `${root}/workspace/dataAssets/features/v7.0.0/【15911】【泸州老窖】【数据资产】资产定制化代码剥离/cases/exports/资产定制化代码剥离.xmind`,
      ],
      deleted: [],
    });
    expect(report).toContain("Unchanged:");
    expect(report).toContain("  cases/exports/资产定制化代码剥离.xmind");
    expect(report).not.toContain("Created:");
    expect(report).not.toContain("Deleted:");
  });
});
