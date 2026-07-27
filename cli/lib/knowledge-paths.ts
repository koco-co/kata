import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ProjectPaths } from "./types.ts";
import { locateProject } from "./workspace-locator.ts";

/** knowledge dir from located project paths: workspace/<project>/knowledge first, legacy _shared/knowledge fallback. */
export function knowledgeDirFromPaths(paths: ProjectPaths): string {
  if (existsSync(paths.knowledgeDir)) return paths.knowledgeDir;
  return join(paths.sharedDir, "knowledge");
}

/** Return the knowledge base dir for a project by name. */
export function knowledgeDir(project: string): string {
  return knowledgeDirFromPaths(locateProject(project));
}

/** Join path segments under the project's knowledge dir. */
export function knowledgePath(project: string, ...segments: string[]): string {
  return join(knowledgeDir(project), ...segments);
}
