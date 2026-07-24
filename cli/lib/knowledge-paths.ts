import { existsSync } from "node:fs";
import { join } from "node:path";
import { locateProject } from "./workspace-locator.ts";

/** Return the knowledge base dir for a project; prefers workspace/<project>/knowledge, falls back to legacy _shared/knowledge. */
export function knowledgeDir(project: string): string {
  const paths = locateProject(project);
  if (existsSync(paths.knowledgeDir)) return paths.knowledgeDir;
  return join(paths.sharedDir, "knowledge");
}

/** Join path segments under the project's knowledge dir. */
export function knowledgePath(project: string, ...segments: string[]): string {
  return join(knowledgeDir(project), ...segments);
}
