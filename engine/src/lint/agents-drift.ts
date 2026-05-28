import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "../../lib/paths.ts";

export type DriftKind = "skill" | "agent" | "command" | "hook-doc";
export type DriftStatus =
  | "missing-target"
  | "missing-source"
  | "equal"
  | "allowed-diff"
  | "changed"
  | "conflict";

export interface DriftPair {
  kind: DriftKind;
  name: string;
  sourcePath: string;
  targetPath: string;
  status: DriftStatus;
  sourceHash?: string;
  targetSourceHash?: string;
  policyId?: string;
  summary: string;
}

export interface DriftReport {
  version: 1;
  generatedAt: string;
  pairs: DriftPair[];
}

interface DriftPolicy {
  version: 1;
  allowedDiffs: AllowedDiff[];
}

interface AllowedDiff {
  id: string;
  paths: string[];
  kind: "literal-replacement" | "path-prefix-replacement";
  from: string;
  to: string;
  owner: string;
}

const AREAS: Array<{ kind: DriftKind; source: string; target: string }> = [
  { kind: "skill", source: ".claude/skills", target: ".agents/skills" },
  { kind: "agent", source: ".claude/agents", target: ".agents/agents" },
  { kind: "command", source: ".claude/commands", target: ".agents/commands" },
  { kind: "hook-doc", source: ".claude/hooks", target: ".agents/hooks" },
];

export function auditAgentRuntimeDrift(root: string = repoRoot()): DriftReport {
  const policy = loadPolicy(root);
  const pairs: DriftPair[] = [];
  for (const area of AREAS) {
    pairs.push(...compareArea(root, area.kind, area.source, area.target, policy.allowedDiffs));
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    pairs: pairs.sort((a, b) => `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`)),
  };
}

function compareArea(
  root: string,
  kind: DriftKind,
  sourceRel: string,
  targetRel: string,
  allowedDiffs: AllowedDiff[],
): DriftPair[] {
  const sourceRoot = join(root, sourceRel);
  const targetRoot = join(root, targetRel);
  const sourceFiles = listFiles(sourceRoot);
  const targetFiles = listFiles(targetRoot);
  const names = [...new Set([...sourceFiles, ...targetFiles])].sort();
  const pairs: DriftPair[] = [];

  for (const name of names) {
    const sourcePath = join(sourceRel, name);
    const targetPath = join(targetRel, name);
    const sourceFull = join(root, sourcePath);
    const targetFull = join(root, targetPath);
    const hasSource = existsSync(sourceFull);
    const hasTarget = existsSync(targetFull);

    if (!hasTarget) {
      pairs.push({
        kind,
        name,
        sourcePath,
        targetPath,
        status: "missing-target",
        summary: "Codex runtime is missing this source file",
      });
      continue;
    }
    if (!hasSource) {
      pairs.push({
        kind,
        name,
        sourcePath,
        targetPath,
        status: "missing-source",
        summary: "Codex has no matching Claude source file",
      });
      continue;
    }

    const sourceContent = readFileSync(sourceFull, "utf8");
    const targetContent = readFileSync(targetFull, "utf8");
    const sourceHash = sha256(sourceContent);
    const targetSourceHash = sha256(targetContent);
    if (sourceContent === targetContent) {
      pairs.push({
        kind,
        name,
        sourcePath,
        targetPath,
        status: "equal",
        sourceHash,
        targetSourceHash,
        summary: "Files are identical",
      });
      continue;
    }

    const policy = findAllowedDiff(
      sourcePath,
      targetPath,
      sourceContent,
      targetContent,
      allowedDiffs,
    );
    if (policy) {
      pairs.push({
        kind,
        name,
        sourcePath,
        targetPath,
        status: "allowed-diff",
        sourceHash,
        targetSourceHash,
        policyId: policy.id,
        summary: `Difference is allowed by ${policy.id}`,
      });
      continue;
    }

    pairs.push({
      kind,
      name,
      sourcePath,
      targetPath,
      status: "conflict",
      sourceHash,
      targetSourceHash,
      summary: "Files differ outside drift policy",
    });
  }

  return pairs;
}

function loadPolicy(root: string): DriftPolicy {
  const policyPath = join(root, ".agents", "drift-policy.json");
  if (!existsSync(policyPath)) return { version: 1, allowedDiffs: [] };
  const parsed = JSON.parse(readFileSync(policyPath, "utf8")) as DriftPolicy;
  if (parsed.version !== 1 || !Array.isArray(parsed.allowedDiffs)) {
    throw new Error(".agents/drift-policy.json must contain version=1 and allowedDiffs[]");
  }
  for (const item of parsed.allowedDiffs) {
    if (
      !item.id ||
      !item.owner ||
      !Array.isArray(item.paths) ||
      !isAllowedDiffKind(item.kind) ||
      item.from === undefined ||
      item.to === undefined
    ) {
      throw new Error(`Invalid drift policy item '${item.id || "<missing id>"}'`);
    }
  }
  return parsed;
}

function isAllowedDiffKind(value: string): value is AllowedDiff["kind"] {
  return value === "literal-replacement" || value === "path-prefix-replacement";
}

function findAllowedDiff(
  sourcePath: string,
  targetPath: string,
  sourceContent: string,
  targetContent: string,
  allowedDiffs: AllowedDiff[],
): AllowedDiff | undefined {
  for (const item of allowedDiffs) {
    if (!policyCoversPath(item, sourcePath, targetPath)) continue;
    if (
      item.kind === "literal-replacement" &&
      sourceContent.replaceAll(item.from, item.to) === targetContent
    )
      return item;
    if (
      item.kind === "path-prefix-replacement" &&
      sourceContent.replaceAll(item.from, item.to) === targetContent
    ) {
      return item;
    }
  }
  return undefined;
}

function policyCoversPath(item: AllowedDiff, sourcePath: string, targetPath: string): boolean {
  return (
    item.paths.some((p) => pathMatches(p, sourcePath)) &&
    item.paths.some((p) => pathMatches(p, targetPath))
  );
}

function pathMatches(pattern: string, value: string): boolean {
  if (pattern.endsWith("/**")) {
    const base = pattern.slice(0, -3);
    return value === base || value.startsWith(`${base}/`);
  }
  return pattern === value;
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  walk(root, root, out);
  return out.filter((file) => !file.endsWith(".DS_Store")).sort();
}

function walk(root: string, dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(root, full, out);
    else if (stat.isFile()) out.push(relative(root, full));
  }
}

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
