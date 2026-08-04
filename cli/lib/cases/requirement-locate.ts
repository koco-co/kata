/**
 * Locate feature directories by the requirement id declared in cases/*.yaml.
 * Read-only scan: never validates case content, only extracts requirement ids
 * for matching. Requirement ids are digit strings (schema-enforced).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { featureRelativePath, listFeatureDirs } from "../features-layout.ts";
import { listWorkspaceProjects, locateProject } from "../workspace-locator.ts";

export interface RequirementFeatureMatch {
  /** Canonical project name. */
  project: string;
  /** Full path relative to the project's features/ dir. */
  relativePath: string;
  /** Absolute feature directory path. */
  featureDir: string;
}

function scalarId(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const id = String(value).trim();
    return /^\d+$/.test(id) ? id : undefined;
  }
  return undefined;
}

/** Return every requirement id declared by a cases.yaml document (meta / requirements / per-case). */
export function declaredRequirementIds(yamlText: string): string[] {
  let doc: unknown;
  try {
    doc = parse(yamlText);
  } catch {
    return [];
  }
  if (typeof doc !== "object" || doc === null) return [];
  const ids = new Set<string>();
  const root = doc as Record<string, unknown>;
  const meta = root.meta;
  if (typeof meta === "object" && meta !== null) {
    const id = scalarId((meta as Record<string, unknown>).requirement_id);
    if (id) ids.add(id);
  }
  for (const listKey of ["requirements", "cases"]) {
    const list = root[listKey];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item !== "object" || item === null) continue;
      const id = scalarId((item as Record<string, unknown>).requirement_id);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Locate feature directories that declare the given requirement id.
 * Scans every workspace project by default; pass `project` to scope the scan.
 * Archived features are skipped so derived artifacts are never regenerated for
 * retired history.
 */
export function locateFeaturesByRequirementId(
  requirementId: string,
  opts: { project?: string } = {},
): RequirementFeatureMatch[] {
  const projects = opts.project ? [opts.project] : listWorkspaceProjects();
  const matches: RequirementFeatureMatch[] = [];
  for (const project of projects) {
    const projectDir = locateProject(project);
    for (const entry of listFeatureDirs(projectDir.featuresDir)) {
      if (entry.zone === "archived") continue;
      const casesPath = join(entry.dir, "cases");
      if (!existsSync(casesPath)) continue;
      const yamls = readdirSync(casesPath).filter((name) => name.endsWith(".yaml"));
      if (yamls.length !== 1) continue;
      const ids = declaredRequirementIds(readFileSync(join(casesPath, yamls[0]), "utf8"));
      if (!ids.includes(requirementId)) continue;
      matches.push({
        project,
        relativePath: featureRelativePath(projectDir.featuresDir, entry),
        featureDir: entry.dir,
      });
    }
  }
  return matches;
}
