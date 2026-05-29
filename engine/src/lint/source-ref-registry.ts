import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import { parse } from "yaml";
import { contractPath } from "@shared/lib/paths.ts";
import type { CaseLintReport } from "./types.ts";

interface PrefixEntry {
  prefix: string;
  pattern: string;
  description: string;
  generated_by: string;
  generated_at_step: string;
}

let cache: PrefixEntry[] | null = null;

export function getRegisteredPrefixes(): PrefixEntry[] {
  if (cache) return cache;
  const path = contractPath("schemas", "source-ref-registry.yaml");
  const data = parse(readFileSync(path, "utf-8"));
  cache = data.prefixes as PrefixEntry[];
  return cache;
}

export function isRegisteredPrefix(ref: string): boolean {
  for (const p of getRegisteredPrefixes()) {
    if (new RegExp(p.pattern).test(ref)) return true;
  }
  return false;
}

const SOURCE_REF_RE = /\bSR-[A-Z][A-Z-]*-[A-Z0-9-]+\b/g;

export function lintSourceRefRegistry(workspaceRoot: string): CaseLintReport {
  const violations: CaseLintReport["violations"] = [];
  const pattern = join(workspaceRoot, "*/features/*/tests/cases/**/*.ts");
  const glob = new Glob(pattern);
  let files = 0;

  for (const file of glob.scanSync()) {
    files += 1;
    const lines = readFileSync(file, "utf-8").split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(SOURCE_REF_RE)) {
        const ref = match[0];
        if (!isRegisteredPrefix(ref)) {
          violations.push({
            file,
            lineNumber: index + 1,
            rule: "source_ref_unregistered",
            matched: ref,
            severity: "fail",
            message: `Source ref "${ref}" is not declared by SourceRefRegistry@1`,
          });
        }
      }
    });
  }

  return {
    scanRoot: workspaceRoot,
    files,
    violations,
    passed: violations.length === 0,
  };
}
