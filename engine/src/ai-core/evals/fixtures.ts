import { readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { AiCoreIssue } from "../types.ts";
import type { CaseCheck, GaCoreGoldenCase, GaRuntimeGoldenCase, P0GoldenCase } from "./types.ts";
import { FIXTURES_PREFIX, gaCoreRoot, gaRuntimeRoot, p0Root } from "./types.ts";

export function throwGoldenParseError(path: string, issues: AiCoreIssue[]): never {
  throw new Error(issues.map((issue) => `${path}: ${issue.code}: ${issue.message}`).join("; "));
}

export function safeFixturePath(root: string, fixture: unknown): string {
  if (typeof fixture !== "string" || fixture.length === 0) {
    throw new Error("Golden eval fixture path must be a non-empty string");
  }
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    throw new Error(`Golden eval fixture path must be under ${FIXTURES_PREFIX}: ${fixture}`);
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`Golden eval fixture path must not contain dot segments: ${fixture}`);
  }
  const fixturesRoot = join(p0Root(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Golden eval fixture path escapes the p0 fixtures root: ${fixture}`);
  }
  return fullPath;
}

export function safeGaCoreFixturePath(root: string, fixture: unknown): string {
  if (typeof fixture !== "string" || fixture.length === 0) {
    throw new Error("Golden eval fixture path must be a non-empty string");
  }
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    throw new Error(`Golden eval fixture path must be under ${FIXTURES_PREFIX}: ${fixture}`);
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`Golden eval fixture path must not contain dot segments: ${fixture}`);
  }
  const fixturesRoot = join(gaCoreRoot(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Golden eval fixture path escapes the ga-core fixtures root: ${fixture}`);
  }
  return fullPath;
}

export function safeGaRuntimeFixturePath(root: string, fixture: unknown): string {
  if (typeof fixture !== "string" || fixture.length === 0) {
    throw new Error("Golden eval fixture path must be a non-empty string");
  }
  if (
    fixture !== fixture.trim() ||
    fixture.includes("\0") ||
    isAbsolute(fixture) ||
    !fixture.startsWith(FIXTURES_PREFIX)
  ) {
    throw new Error(`Golden eval fixture path must be under ${FIXTURES_PREFIX}: ${fixture}`);
  }
  const relativeFixture = fixture.slice(FIXTURES_PREFIX.length);
  const pathParts = relativeFixture.split(/[\\/]/);
  if (
    relativeFixture.length === 0 ||
    pathParts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new Error(`Golden eval fixture path must not contain dot segments: ${fixture}`);
  }
  const fixturesRoot = join(gaRuntimeRoot(root), "fixtures");
  const fullPath = resolve(fixturesRoot, relativeFixture);
  const relativePath = relative(fixturesRoot, fullPath);
  if (
    relativePath.startsWith("..") ||
    relativePath === "" ||
    relativePath.includes("\0") ||
    isAbsolute(relativePath)
  ) {
    throw new Error(`Golden eval fixture path escapes the ga-runtime fixtures root: ${fixture}`);
  }
  return fullPath;
}

export function readTextFixture(testCase: P0GoldenCase, root: string): string {
  return readFileSync(safeFixturePath(root, testCase.input.fixture), "utf8");
}

export function readJsonFixture<T extends Record<string, unknown>>(
  testCase: P0GoldenCase,
  root: string,
): T {
  return JSON.parse(readTextFixture(testCase, root)) as T;
}

export function readGaCoreJsonFixture<T extends Record<string, unknown>>(
  testCase: GaCoreGoldenCase,
  root: string,
): T {
  return JSON.parse(readFileSync(safeGaCoreFixturePath(root, testCase.input.fixture), "utf8")) as T;
}

export function readGaRuntimeJsonFixture<T extends Record<string, unknown>>(
  testCase: GaRuntimeGoldenCase,
  root: string,
): T {
  return JSON.parse(
    readFileSync(safeGaRuntimeFixturePath(root, testCase.input.fixture), "utf8"),
  ) as T;
}

export function issueFromRule(code: string, message: string, path = "eval"): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function ruleIds(issues: AiCoreIssue[]): string[] {
  return unique(issues.filter((issue) => issue.severity === "error").map((issue) => issue.code));
}

export function sameRuleIds(left: string[], right: string[]): boolean {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

export function hasRequiredMessages(
  requiredMessages: string[] | undefined,
  issues: AiCoreIssue[],
): boolean {
  if (!requiredMessages || requiredMessages.length === 0) return true;
  const actualMessages = new Set(issues.map((issue) => issue.message));
  return requiredMessages.every((message) => actualMessages.has(message));
}

export function resultFromPolicy(ok: boolean, issues: AiCoreIssue[]): CaseCheck {
  return {
    status: ok ? "passed" : "blocked",
    ruleIds: ruleIds(issues),
    issues,
  };
}

export function readSkillRouting(root: string): { skillId: string; commands: string[] } {
  const text = readFileSync(join(root, ".ai/core/commands/case-draft.command.yaml"), "utf8");
  const commandId = text.match(/^id:\s*([^\s#]+)/m)?.[1];
  const skillId = text.match(/^skill:\s*([^\s#]+)/m)?.[1];
  if (!skillId || !commandId) throw new Error("case-draft routing contract is incomplete");
  return { skillId, commands: [commandId] };
}
