import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

export const workspaceRoot = (project: string) => join(repoRoot(), "workspace", project);

export const featuresRoot = (project: string) => join(workspaceRoot(project), "features");

export const featureDir = (project: string, featureId: string) =>
  join(featuresRoot(project), featureId);

export const sharedRoot = (project: string) => join(workspaceRoot(project), "_shared");

export const kataRoot = () => join(repoRoot(), ".kata");

export const resultsDir = (project: string, featureId: string, runId: string) =>
  join(featureDir(project, featureId), "results", runId);
