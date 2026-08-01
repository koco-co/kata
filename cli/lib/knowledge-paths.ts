import { join } from "node:path";
import type { ProjectPaths } from "./types.ts";
import { locateProject } from "./workspace-locator.ts";

/** Resolve the canonical knowledge directory under workspace/<project>/knowledge. */
export function knowledgeDirFromPaths(paths: ProjectPaths): string {
  return paths.knowledgeDir;
}

/** Return the knowledge base dir for a project by name. */
export function knowledgeDir(project: string): string {
  return knowledgeDirFromPaths(locateProject(project));
}

/** Join path segments under the project's knowledge dir. */
export function knowledgePath(project: string, ...segments: string[]): string {
  return join(knowledgeDir(project), ...segments);
}
