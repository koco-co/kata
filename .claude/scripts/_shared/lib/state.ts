import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { kataDir } from "./paths.ts";
import type { WorkflowState } from "./types.ts";

function stateDir(project: string): string {
  return join(kataDir(project), "workflow-state");
}

export function saveWorkflowState(state: WorkflowState): void {
  const dir = stateDir(state.project);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${state.workflow}-${state.prdSlug}.json`);
  writeFileSync(path, JSON.stringify(state, null, 2));
}

export function loadWorkflowState(
  project: string,
  workflow: string,
  prdSlug: string,
): WorkflowState | null {
  const path = join(stateDir(project), `${workflow}-${prdSlug}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}
