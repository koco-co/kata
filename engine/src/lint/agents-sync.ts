import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import type { AgentRuntime } from "@shared/lib/paths.ts";
import { auditAgentRuntimeDrift, type DriftPair } from "./agents-drift.ts";

export type SyncActionKind = "create" | "overwrite" | "skip" | "conflict";

export interface SyncAction {
  action: SyncActionKind;
  sourcePath: string;
  targetPath: string;
  status: DriftPair["status"];
  policyId?: string;
  backupId?: string;
  summary: string;
}

export interface SyncResult {
  version: 1;
  generatedAt: string;
  from: AgentRuntime;
  to: AgentRuntime;
  dryRun: boolean;
  write: boolean;
  force: boolean;
  backupId?: string;
  actions: SyncAction[];
}

export interface SyncOptions {
  root: string;
  from: AgentRuntime;
  to: AgentRuntime;
  dryRun?: boolean;
  write?: boolean;
  force?: boolean;
}

export interface RollbackOptions {
  root: string;
  backupId: string;
  force?: boolean;
}

interface DriftPolicy {
  version: 1;
  allowedDiffs: DriftPolicyRule[];
}

interface DriftPolicyRule {
  id: string;
  paths: string[];
  kind: "literal-replacement" | "path-prefix-replacement";
  from: string;
  to: string;
  owner: string;
}

interface PlannedCreate {
  sourcePath: string;
  targetPath: string;
}

interface PlannedOverwrite {
  action: SyncAction;
  targetPath: string;
  beforeContent: string;
  afterContent: string;
}

interface BackupManifest {
  version: 1;
  backupId: string;
  createdAt: string;
  entries: BackupManifestEntry[];
}

interface BackupManifestEntry {
  targetPath: string;
  backupPath: string;
  beforeHash: string;
  afterHash: string;
}

interface ValidatedBackupEntry extends BackupManifestEntry {
  targetFull: string;
  backupFull: string;
}

let backupCounter = 0;

export function runAgentsSync(opts: SyncOptions): SyncResult {
  assertSupportedRuntimePair(opts.from, opts.to);

  const dryRun = opts.dryRun === true || opts.write !== true;
  const write = opts.write === true;
  const force = opts.force === true;
  const report = auditAgentRuntimeDrift(opts.root);
  const policy = loadPolicy(opts.root);
  const actions: SyncAction[] = [];
  const creates: PlannedCreate[] = [];
  const overwrites: PlannedOverwrite[] = [];

  for (const pair of report.pairs) {
    if (pair.status === "missing-target") {
      actions.push(toAction(pair, "create", "Target is missing and can be created from source"));
      if (!dryRun) creates.push({ sourcePath: pair.sourcePath, targetPath: pair.targetPath });
      continue;
    }

    if (pair.status === "equal" || pair.status === "missing-source") {
      actions.push(toAction(pair, "skip", pair.summary));
      continue;
    }

    const sourceFull = join(opts.root, pair.sourcePath);
    const targetFull = join(opts.root, pair.targetPath);
    const sourceContent = existsSync(sourceFull) ? readFileSync(sourceFull, "utf8") : undefined;
    const targetContent = existsSync(targetFull) ? readFileSync(targetFull, "utf8") : undefined;
    const matchingPolicy =
      pair.status === "allowed-diff" && sourceContent !== undefined && targetContent !== undefined
        ? findMatchingPolicy(policy.allowedDiffs, pair, sourceContent, targetContent)
        : undefined;

    if (force && matchingPolicy && sourceContent !== undefined && targetContent !== undefined) {
      const afterContent = transformSource(sourceContent, matchingPolicy);
      const action = toAction(
        pair,
        "overwrite",
        `Target can be overwritten using drift policy ${matchingPolicy.id}`,
        matchingPolicy.id,
      );
      actions.push(action);
      if (!dryRun) {
        overwrites.push({
          action,
          targetPath: pair.targetPath,
          beforeContent: targetContent,
          afterContent,
        });
      }
      continue;
    }

    if (pair.status === "allowed-diff") {
      actions.push(toAction(pair, "skip", pair.summary, pair.policyId));
      continue;
    }

    actions.push(
      toAction(
        pair,
        "conflict",
        "Target differs from source and no drift policy overwrite is allowed",
      ),
    );
  }

  let backupId: string | undefined;
  if (!dryRun) {
    for (const item of creates) copySourceToTarget(opts.root, item.sourcePath, item.targetPath);
    if (overwrites.length > 0) {
      backupId = createBackupManifest(opts.root, overwrites);
      for (const item of overwrites) {
        item.action.backupId = backupId;
        writeText(join(opts.root, item.targetPath), item.afterContent);
      }
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    from: opts.from,
    to: opts.to,
    dryRun,
    write,
    force,
    backupId,
    actions,
  };
}

export function rollbackAgentsSync(opts: RollbackOptions): void {
  assertValidBackupId(opts.backupId);

  const backupRoot = join(opts.root, ".kata", "agent-sync-backups", opts.backupId);
  const manifestPath = join(backupRoot, "manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`Backup manifest not found: ${opts.backupId}`);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as BackupManifest;
  if (manifest.backupId !== opts.backupId) {
    throw new Error(
      `Backup manifest id mismatch: expected ${opts.backupId}, got ${manifest.backupId}`,
    );
  }

  const entries = validateBackupEntries(opts.root, backupRoot, manifest.entries);
  for (const entry of entries) {
    const currentHash = existsSync(entry.targetFull)
      ? sha256(readFileSync(entry.targetFull, "utf8"))
      : undefined;
    if (!opts.force && currentHash !== entry.afterHash) {
      throw new Error(
        `Refusing rollback for ${entry.targetPath}: current hash ${currentHash ?? "<missing>"} differs from expected ${entry.afterHash}`,
      );
    }
  }

  for (const entry of entries) {
    const backupContent = readFileSync(entry.backupFull, "utf8");
    writeText(entry.targetFull, backupContent);
  }
}

function assertSupportedRuntimePair(from: AgentRuntime, to: AgentRuntime): void {
  if (from !== "claude" || to !== "codex") {
    throw new Error("agents:sync currently supports only claude -> codex");
  }
}

function toAction(
  pair: DriftPair,
  action: SyncActionKind,
  summary: string,
  policyId?: string,
): SyncAction {
  return {
    action,
    sourcePath: pair.sourcePath,
    targetPath: pair.targetPath,
    status: pair.status,
    policyId,
    summary,
  };
}

function copySourceToTarget(root: string, sourcePath: string, targetPath: string): void {
  writeText(join(root, targetPath), readFileSync(join(root, sourcePath), "utf8"));
}

function createBackupManifest(root: string, overwrites: PlannedOverwrite[]): string {
  const backupId = nextBackupId();
  const entries: BackupManifestEntry[] = [];

  for (const item of overwrites) {
    const backupPath = `.kata/agent-sync-backups/${backupId}/target/${item.targetPath}`;
    writeText(join(root, backupPath), item.beforeContent);
    entries.push({
      targetPath: item.targetPath,
      backupPath,
      beforeHash: sha256(item.beforeContent),
      afterHash: sha256(item.afterContent),
    });
  }

  const manifest: BackupManifest = {
    version: 1,
    backupId,
    createdAt: new Date().toISOString(),
    entries,
  };
  writeText(
    join(root, ".kata", "agent-sync-backups", backupId, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return backupId;
}

function nextBackupId(): string {
  backupCounter += 1;
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return `${stamp}-${process.pid}-${backupCounter}`;
}

function assertValidBackupId(backupId: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-\d+-\d+$/.test(backupId)) {
    throw new Error(`Invalid backup id: ${backupId}`);
  }
}

function validateBackupEntries(
  root: string,
  backupRoot: string,
  entries: BackupManifestEntry[],
): ValidatedBackupEntry[] {
  return entries.map((entry) => {
    const targetFull = resolveRepoRelative(root, entry.targetPath, "manifest targetPath");
    const backupFull = resolveRepoRelative(root, entry.backupPath, "manifest backupPath");
    assertInside(resolve(backupRoot), backupFull, "manifest backupPath", entry.backupPath);
    return { ...entry, targetFull, backupFull };
  });
}

function resolveRepoRelative(root: string, relativePath: string, label: string): string {
  if (isAbsolute(relativePath)) throw new Error(`Invalid ${label}: ${relativePath}`);
  const full = resolve(root, relativePath);
  assertInside(resolve(root), full, label, relativePath);
  return full;
}

function assertInside(base: string, value: string, label: string, original: string): void {
  if (value !== base && !value.startsWith(`${base}${sep}`)) {
    throw new Error(`Invalid ${label}: ${original}`);
  }
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

function isAllowedDiffKind(value: string): value is DriftPolicyRule["kind"] {
  return value === "literal-replacement" || value === "path-prefix-replacement";
}

function findMatchingPolicy(
  allowedDiffs: DriftPolicyRule[],
  pair: DriftPair,
  sourceContent: string,
  targetContent: string,
): DriftPolicyRule | undefined {
  return allowedDiffs.find((item) => {
    if (pair.policyId && item.id !== pair.policyId) return false;
    return (
      policyCoversPath(item, pair.sourcePath, pair.targetPath) &&
      transformSource(sourceContent, item) === targetContent
    );
  });
}

function transformSource(sourceContent: string, policy: DriftPolicyRule): string {
  return sourceContent.replaceAll(policy.from, policy.to);
}

function policyCoversPath(item: DriftPolicyRule, sourcePath: string, targetPath: string): boolean {
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

function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function sha256(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
