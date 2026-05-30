import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(import.meta.dirname, "../../..");
const sourceRoot = join(repoRoot, "engine/src");

function walkTs(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walkTs(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

const cliSourceFiles = [
  ...walkTs(join(sourceRoot, "cli")),
  join(repoRoot, ".claude/skills/defect-analyze/scripts/scan-report.ts"),
  join(repoRoot, ".claude/skills/case-draft/scripts/test-case-flow.ts"),
];

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function relativePath(path: string): string {
  return relative(repoRoot, path);
}

function machineJsonConsoleCalls(path: string, source: string): string[] {
  const directCalls = [...source.matchAll(/console\.log\(\s*JSON\.stringify\(/g)].map(
    (match) => `${relativePath(path)}:${lineNumber(source, match.index ?? 0)}`,
  );
  const variableCalls = [
    ...source.matchAll(
      /const\s+([A-Za-z_$][\w$]*)\s*=\s*JSON\.stringify\([\s\S]*?console\.log\(\s*\1\s*\)/g,
    ),
  ].map((match) => `${relativePath(path)}:${lineNumber(source, match.index ?? 0)}`);
  return [...directCalls, ...variableCalls];
}

function stdoutWriteCalls(source: string): Array<{ index: number; argument: string }> {
  return [...source.matchAll(/process\.stdout\.write\(([\s\S]*?)\);/g)].map((match) => ({
    index: match.index ?? 0,
    argument: match[1] ?? "",
  }));
}

function isJsonStdoutWrite(argument: string): boolean {
  const normalized = argument.trimStart();
  return normalized.startsWith("`${JSON.stringify") || normalized.startsWith("JSON.stringify");
}

describe("CLI output style", () => {
  it("uses process.stdout.write for machine-readable JSON output", () => {
    const offenders = cliSourceFiles.flatMap((path) =>
      machineJsonConsoleCalls(path, readFileSync(path, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("uses console.log for user-facing stdout output", () => {
    const offenders = cliSourceFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return stdoutWriteCalls(source)
        .filter((call) => !isJsonStdoutWrite(call.argument))
        .map((call) => `${relativePath(path)}:${lineNumber(source, call.index)}`);
    });

    expect(offenders).toEqual([]);
  });

  it("does not leave debug console output in discuss validate", () => {
    const discuss = readFileSync(join(sourceRoot, "discuss.ts"), "utf8");

    expect(discuss).not.toContain("discuss validate:");
  });
});
