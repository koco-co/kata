import { basename, join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

const FORBIDDEN = [
  { re: /-debug(\.|-)/, name: "debug" },
  { re: /-repro(\.|-)/, name: "repro" },
  { re: /^diag_/, name: "diag" },
];

export function lintNoDebugInCases(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "*/features/*/tests/cases/**/*");
  const glob = new Glob(pattern);
  for (const file of glob.scanSync()) {
    const name = basename(file);
    for (const { re, name: kind } of FORBIDDEN) {
      if (re.test(name)) {
        violations.push({
          file,
          rule: "debug_in_cases",
          message: `Forbidden ${kind} naming under tests/cases/`,
        });
        break;
      }
    }
  }
  return { violations };
}
