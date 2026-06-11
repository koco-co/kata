import { join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

export function lintNoFeatureLocalHelpers(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "*/features/**/automation/tests/helpers/*.ts");
  const glob = new Glob(pattern);
  for (const file of glob.scanSync()) {
    violations.push({
      file,
      rule: "feature_local_helper",
      message:
        "Helpers must live in _shared/pages/ or _shared/helpers/, not under feature tests/helpers/",
    });
  }
  return { violations };
}
