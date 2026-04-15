export type RepoProfile = { project: string; aliases: string[] };

export type ProjectResolution =
  | { status: "resolved"; project: string; reason: string }
  | { status: "needs_user_selection"; candidates: string[]; reason: string };

export function resolveProject(input: {
  explicitProject: string;
  workspaceProjects?: string[];
  lanhuProjectNames?: string[];
  repoProfiles?: RepoProfile[];
}): { project: string } | { status: string; candidates?: string[]; reason?: string } {
  // Priority 1: Non-auto explicit project returns immediately
  if (input.explicitProject !== "auto") {
    return { project: input.explicitProject };
  }

  // Priority 2: Lanhu project alias matched in repo profiles
  const { lanhuProjectNames = [], repoProfiles = [] } = input;
  for (const name of lanhuProjectNames) {
    const match = repoProfiles.find((p) => p.aliases.includes(name));
    if (match) {
      return { project: match.project };
    }
  }

  // Priority 3: Single workspace project
  const { workspaceProjects = [] } = input;
  if (workspaceProjects.length === 1) {
    return { project: workspaceProjects[0] };
  }

  // Priority 4: Multiple candidates returns needs_user_selection
  if (workspaceProjects.length > 1) {
    return {
      status: "needs_user_selection",
      candidates: workspaceProjects,
      reason: "Multiple workspace projects found; user selection required",
    };
  }

  return {
    status: "needs_user_selection",
    candidates: [],
    reason: "No workspace projects found",
  };
}
