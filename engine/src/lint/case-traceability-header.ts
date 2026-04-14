import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import type { Violation } from "./types.ts";

const REQUIRED = [
  { tag: "spec", re: /^\/\/\s*spec:\s*\S+/m, rule: "trace_header_missing_spec" },
  {
    tag: "intent",
    re: /^\/\/\s*intent:\s*SR-INTENT-[A-Z0-9-]+/m,
    rule: "trace_header_missing_intent",
  },
  {
    tag: "probe",
    re: /^\/\/\s*probe:\s*SR-UI-PROBE-[A-Z0-9-]+/m,
    rule: "trace_header_missing_probe",
  },
  {
    tag: "page",
    re: /^\/\/\s*page:\s*_shared\/pages\/\S+/m,
    rule: "trace_header_missing_page",
  },
];

export function lintCaseTraceabilityHeader(workspaceRoot: string): { violations: Violation[] } {
  const violations: Violation[] = [];
  const pattern = join(workspaceRoot, "*/features/*/tests/cases/**/*.ts");
  const glob = new Glob(pattern);
  for (const file of glob.scanSync()) {
    const content = readFileSync(file, "utf-8");
    const head = content.split("\n").slice(0, 10).join("\n");
    for (const r of REQUIRED) {
      if (!r.re.test(head)) {
        violations.push({
          file,
          rule: r.rule,
          message: `Missing required trace header line "${r.tag}: ..."`,
        });
      }
    }
  }
  return { violations };
}
