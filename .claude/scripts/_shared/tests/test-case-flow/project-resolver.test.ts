import { describe, expect, it } from "bun:test";
import { resolveProject } from "@skills/case-draft/scripts/test-case-flow/project-resolver.ts";

describe("resolveProject", () => {
  it("uses explicit project name when provided", () => {
    const result = resolveProject({ explicitProject: "demo", workspaceProjects: ["a"] });
    expect((result as { project: string }).project).toBe("demo");
  });

  it("resolves auto to single workspace project", () => {
    const result = resolveProject({ explicitProject: "auto", workspaceProjects: ["only"] });
    expect((result as { project: string }).project).toBe("only");
  });

  it("resolves auto by Lanhu project alias", () => {
    const result = resolveProject({
      explicitProject: "auto",
      lanhuProjectNames: ["资产"],
      repoProfiles: [{ project: "assets", aliases: ["资产"] }],
    });
    expect((result as { project: string }).project).toBe("assets");
  });

  it("returns needs_user_selection for multiple candidates", () => {
    const result = resolveProject({
      explicitProject: "auto",
      workspaceProjects: ["a", "b"],
    });
    expect((result as { status: string }).status).toBe("needs_user_selection");
  });
});
