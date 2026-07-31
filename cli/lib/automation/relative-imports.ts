import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface MissingRelativeImport {
  specifier: string;
  line: number;
}

const RELATIVE_IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.[^"']+)\1/g;

function importCandidates(file: string, specifier: string): string[] {
  const target = join(dirname(file), specifier);
  return [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts")];
}

function lineForIndex(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length;
}

function maskComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, (comment) =>
    comment.replace(/[^\r\n]/g, " "),
  );
}

export function findMissingRelativeImports(
  file: string,
  source = readFileSync(file, "utf8"),
): MissingRelativeImport[] {
  const code = maskComments(source);
  const missing: MissingRelativeImport[] = [];
  for (const match of code.matchAll(RELATIVE_IMPORT_RE)) {
    const specifier = match[2];
    if (!specifier || match.index === undefined) continue;
    if (importCandidates(file, specifier).some((candidate) => existsSync(candidate))) continue;
    missing.push({ specifier, line: lineForIndex(source, match.index) });
  }
  return missing;
}
