import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { listProjects, workspaceDir } from "kata-engine";
import type { ProjectSummary } from "../types.ts";

export function listProjectSummaries(): ProjectSummary[] {
  return listProjects()
    .map((name) => {
      const dir = join(workspaceDir(), name, "features");
      let featureCount = 0;
      if (existsSync(dir)) {
        featureCount = readdirSync(dir).filter((n) => {
          if (n === "INDEX.md") return false;
          return statSync(join(dir, n)).isDirectory();
        }).length;
      }
      return { name, featureCount };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
